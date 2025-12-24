/**
 * Servidor MCP (Model Context Protocol) Real
 * Implementa el protocolo MCP estándar usando el SDK oficial
 * Transport: STDIO (para integración local con Claude Desktop)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { join } from 'path'
import { execFile, exec, spawn } from 'child_process'
import { promisify } from 'util'
import {
  executeFoundryCommand,
  getAnvilPid,
  sanitizeArgs
} from '../src/lib/foundryTools'

const execFileAsync = promisify(execFile)
const execAsync = promisify(exec)

// Función auxiliar para encontrar rutas de binarios de Foundry
// NOTA: Esta función es solo para health_check. Para comandos reales, usar executeFoundryCommand
// que tiene su propia función findFoundryBinary más robusta en foundryTools.ts
async function findFoundryBinary(tool: 'forge' | 'anvil' | 'cast'): Promise<string> {
  try {
    const { stdout } = await execAsync(`which ${tool}`)
    const path = stdout.trim()
    if (path && path.length > 0) {
      // Verificar que existe y es ejecutable
      try {
        const { access, constants } = await import('fs/promises')
        await access(path, constants.F_OK | constants.X_OK)
        return path
      } catch {
        // Continuar con otras opciones
      }
    }
  } catch {
    // Continuar con otras opciones
  }

  // Rutas comunes
  const home = process.env.HOME || ''
  const commonPaths = [
    join(home, '.foundry', 'bin', tool),
    join(home, '.local', 'bin', tool),
    `/usr/local/bin/${tool}`,
    `/usr/bin/${tool}`,
  ]

  for (const path of commonPaths) {
    try {
      const { access, constants } = await import('fs/promises')
      // Verificar que existe Y es ejecutable
      await access(path, constants.F_OK | constants.X_OK)
      return path
    } catch {
      continue
    }
  }

  return tool // Fallback al nombre del comando
}

// Resolver directorios
const PROJECT_ROOT = join(process.cwd(), '..')
const SC_DIR = join(PROJECT_ROOT, 'sc')

// Crear servidor MCP usando McpServer (API de alto nivel)
const server = new McpServer(
  {
    name: 'foundry-tools',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

// Función auxiliar para obtener todos los PIDs de procesos anvil
async function getAllAnvilPids(): Promise<number[]> {
  try {
    const { stdout } = await execAsync('pgrep -f "anvil"')
    if (!stdout || stdout.trim().length === 0) {
      return []
    }
    return stdout
      .trim()
      .split('\n')
      .map(pid => parseInt(pid))
      .filter(pid => !isNaN(pid))
  } catch {
    return []
  }
}

// Función auxiliar para verificar si Anvil está corriendo
async function checkAnvilRunning(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      'curl -s -X POST -H "Content-Type: application/json" --data \'{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}\' http://127.0.0.1:8545 --max-time 3'
    )
    if (stdout && stdout.includes('"result"') && stdout.includes('0x7a69')) {
      return true
    }
    return false
  } catch {
    return false
  }
}

// Función auxiliar para detener todos los procesos Anvil
async function stopAllAnvilProcesses(): Promise<{ stoppedPids: number[]; errors: string[] }> {
  const stoppedPids: number[] = []
  const errors: string[] = []

  try {
    const allPids = await getAllAnvilPids()
    for (const pid of allPids) {
      try {
        process.kill(pid, 'SIGTERM')
        stoppedPids.push(pid)
      } catch (err: any) {
        if (!err.message.includes('No such process')) {
          errors.push(`Error deteniendo PID ${pid}: ${err.message}`)
        }
      }
    }

    // Esperar un momento y forzar kill si es necesario
    await new Promise(resolve => setTimeout(resolve, 1000))
    const remainingPids = await getAllAnvilPids()
    for (const pid of remainingPids) {
      try {
        process.kill(pid, 'SIGKILL')
        if (!stoppedPids.includes(pid)) {
          stoppedPids.push(pid)
        }
      } catch (err: any) {
        if (!err.message.includes('No such process')) {
          errors.push(`Error forzando kill PID ${pid}: ${err.message}`)
        }
      }
    }
  } catch (err: any) {
    errors.push(`Error general: ${err.message}`)
  }

  return { stoppedPids, errors }
}

// ============ REGISTRAR HERRAMIENTAS MCP ============

// 1. forge_build - Compila smart contracts
server.registerTool(
  'forge_build',
  {
    description: 'Compila los smart contracts usando Foundry Forge. Opcionalmente puede saltar los tests.',
    inputSchema: {
      skipTest: z.boolean().optional().default(false),
      extraArgs: z.array(z.string()).optional().default([]),
    },
  },
  async ({ skipTest, extraArgs }) => {
    const forgeArgs = ['build']
    if (skipTest) {
      forgeArgs.push('--skip', 'test')
    }
    if (extraArgs && extraArgs.length > 0) {
      forgeArgs.push(...extraArgs)
    }

    const result = await executeFoundryCommand('forge', forgeArgs, {
      timeout: 60000,
    })

    return {
      content: [
        {
          type: 'text',
          text: `Forge build ejecutado exitosamente.\n\nComando: forge ${forgeArgs.join(' ')}\n\nSTDOUT:\n${result.stdout}\n\nSTDERR:\n${result.stderr}`,
        },
      ],
    }
  }
)

// 2. forge_test - Ejecuta tests
server.registerTool(
  'forge_test',
  {
    description: 'Ejecuta los tests del contrato usando Foundry Forge. Permite filtrar por nombre y configurar verbosidad.',
    inputSchema: {
      matchTest: z.string().optional(),
      verbosity: z.number().min(0).max(5).optional().default(2),
      extraArgs: z.array(z.string()).optional().default([]),
    },
  },
  async ({ matchTest, verbosity = 2, extraArgs }) => {
    const forgeArgs = ['test']
    if (verbosity > 0) {
      const vFlags = 'v'.repeat(verbosity)
      forgeArgs.push(`-${vFlags}`)
    }
    if (matchTest) {
      forgeArgs.push('--match-test', matchTest)
    }
    if (extraArgs && extraArgs.length > 0) {
      forgeArgs.push(...extraArgs)
    }

    const result = await executeFoundryCommand('forge', forgeArgs, {
      timeout: 120000,
    })

    // Extraer resumen de tests
    const passedMatch = result.stdout.match(/(\d+)\s+passed/)
    const failedMatch = result.stdout.match(/(\d+)\s+failed/)
    const skippedMatch = result.stdout.match(/(\d+)\s+skipped/)

    let summary = 'Forge test ejecutado.\n\n'
    if (passedMatch) summary += `✅ Pasados: ${passedMatch[1]}\n`
    if (failedMatch) summary += `❌ Fallidos: ${failedMatch[1]}\n`
    if (skippedMatch) summary += `⏭️  Omitidos: ${skippedMatch[1]}\n`

    return {
      content: [
        {
          type: 'text',
          text: `${summary}\n\nComando: forge ${forgeArgs.join(' ')}\n\nSTDOUT:\n${result.stdout}\n\nSTDERR:\n${result.stderr}`,
        },
      ],
    }
  }
)

// 3. anvil_start - Inicia Anvil
server.registerTool(
  'anvil_start',
  {
    description: 'Inicia Anvil (nodo local de Ethereum) en background. Si ya está corriendo, devuelve información del proceso existente.',
    inputSchema: {
      host: z.string().optional().default('0.0.0.0'),
      port: z.number().min(1).max(65535).optional().default(8545),
      chainId: z.number().optional(),
      blockTime: z.number().optional(),
      extraArgs: z.array(z.string()).optional().default([]),
    },
  },
  async ({ host = '0.0.0.0', port = 8545, chainId, blockTime, extraArgs = [] }) => {
    // Verificar si ya está corriendo
    const existingPid = await getAnvilPid()
    const isResponding = await checkAnvilRunning()

    if (existingPid && isResponding) {
      return {
        content: [
          {
            type: 'text',
            text: `Anvil ya está corriendo.\n\nPID: ${existingPid}\nPuerto: 8545`,
          },
        ],
      }
    }

    // Si hay proceso pero no responde, detenerlo primero
    if (existingPid && !isResponding) {
      await stopAllAnvilProcesses()
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    const argsArray = ['--host', host, '--port', port.toString()]
    if (chainId) {
      argsArray.push('--chain-id', chainId.toString())
    }
    if (blockTime) {
      argsArray.push('--block-time', blockTime.toString())
    }
    if (extraArgs && extraArgs.length > 0) {
      const sanitized = sanitizeArgs(extraArgs)
      argsArray.push(...sanitized)
    }

    const sanitizedArgs = sanitizeArgs(argsArray)

    // Encontrar ruta absoluta de anvil
    const anvilPath = await findFoundryBinary('anvil')
    const foundryBinDir = process.env.HOME ? `${process.env.HOME}/.foundry/bin` : null

    // Ejecutar anvil en background usando spawn para procesos detached
    const childProcess = spawn(anvilPath, sanitizedArgs, {
      cwd: SC_DIR,
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        ...(foundryBinDir && { PATH: `${foundryBinDir}:${process.env.PATH || ''}` })
      }
    })

    childProcess.unref()

    // Esperar y verificar
    await new Promise(resolve => setTimeout(resolve, 2000))
    const newPid = await getAnvilPid()
    const newIsResponding = await checkAnvilRunning()

    if (!newPid || !newIsResponding) {
      throw new Error('Anvil no se inició correctamente')
    }

    return {
      content: [
        {
          type: 'text',
          text: `Anvil iniciado correctamente.\n\nPID: ${newPid}\nPuerto: ${port}\nHost: ${host}`,
        },
      ],
    }
  }
)

// 4. anvil_stop - Detiene Anvil
server.registerTool(
  'anvil_stop',
  {
    description: 'Detiene todos los procesos Anvil que estén corriendo.',
    inputSchema: {},
  },
  async () => {
    const allPids = await getAllAnvilPids()
    const isResponding = await checkAnvilRunning()

    if (allPids.length === 0 && !isResponding) {
      return {
        content: [
          {
            type: 'text',
            text: 'Anvil no está corriendo.',
          },
        ],
      }
    }

    const stopResult = await stopAllAnvilProcesses()

    await new Promise(resolve => setTimeout(resolve, 2000))
    const finalPids = await getAllAnvilPids()
    const finalIsResponding = await checkAnvilRunning()

    if (finalPids.length > 0 || finalIsResponding) {
      await stopAllAnvilProcesses()
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    if (stopResult.errors.length > 0) {
      return {
        content: [
          {
            type: 'text',
            text: `Anvil detenido (algunos errores menores fueron ignorados).\n\nPIDs detenidos: ${stopResult.stoppedPids.join(', ')}\nAdvertencias: ${stopResult.errors.join('; ')}`,
          },
        ],
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: `Anvil detenido correctamente.\n\nPIDs detenidos: ${stopResult.stoppedPids.join(', ')}`,
        },
      ],
    }
  }
)

// 5. anvil_restart - Reinicia Anvil
server.registerTool(
  'anvil_restart',
  {
    description: 'Reinicia Anvil: detiene todos los procesos existentes y inicia uno nuevo con la configuración especificada.',
    inputSchema: {
      host: z.string().optional().default('0.0.0.0'),
      port: z.number().min(1).max(65535).optional().default(8545),
      chainId: z.number().optional(),
      blockTime: z.number().optional(),
      extraArgs: z.array(z.string()).optional().default([]),
    },
  },
  async ({ host = '0.0.0.0', port = 8545, chainId, blockTime, extraArgs = [] }) => {
    // Detener primero
    await stopAllAnvilProcesses()
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Iniciar (reutilizar lógica de anvil_start)
    const argsArray = ['--host', host, '--port', port.toString()]
    if (chainId) {
      argsArray.push('--chain-id', chainId.toString())
    }
    if (blockTime) {
      argsArray.push('--block-time', blockTime.toString())
    }
    if (extraArgs && extraArgs.length > 0) {
      const sanitized = sanitizeArgs(extraArgs)
      argsArray.push(...sanitized)
    }

    const sanitizedArgs = sanitizeArgs(argsArray)

    // Encontrar ruta absoluta de anvil
    const anvilPath = await findFoundryBinary('anvil')
    const foundryBinDir = process.env.HOME ? `${process.env.HOME}/.foundry/bin` : null

    const childProcess = spawn(anvilPath, sanitizedArgs, {
      cwd: SC_DIR,
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        ...(foundryBinDir && { PATH: `${foundryBinDir}:${process.env.PATH || ''}` })
      }
    })

    childProcess.unref()

    await new Promise(resolve => setTimeout(resolve, 2000))
    const newPid = await getAnvilPid()
    const newIsResponding = await checkAnvilRunning()

    if (!newPid || !newIsResponding) {
      throw new Error('Anvil no se reinició correctamente')
    }

    return {
      content: [
        {
          type: 'text',
          text: `Anvil reiniciado correctamente.\n\nPID: ${newPid}\nPuerto: ${port}\nHost: ${host}`,
        },
      ],
    }
  }
)

// 6. cast_call - Llamadas de solo lectura
server.registerTool(
  'cast_call',
  {
    description: 'Ejecuta una llamada de solo lectura a un contrato inteligente usando Cast.',
    inputSchema: {
      address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      functionSignature: z.string(),
      args: z.array(z.string()).optional().default([]),
      rpcUrl: z.string().optional().default('http://127.0.0.1:8545'),
    },
  },
  async ({ address, functionSignature, args = [], rpcUrl = 'http://127.0.0.1:8545' }) => {
    const castArgs = ['call', address, functionSignature]
    if (args && args.length > 0) {
      castArgs.push(...args)
    }
    castArgs.push('--rpc-url', rpcUrl)

    const result = await executeFoundryCommand('cast', castArgs, {
      timeout: 30000,
    })

    return {
      content: [
        {
          type: 'text',
          text: `Cast call ejecutado.\n\nComando: cast ${castArgs.join(' ')}\n\nResultado:\n${result.stdout}\n\nErrores:\n${result.stderr}`,
        },
      ],
    }
  }
)

// 7. cast_send - Envía transacciones
server.registerTool(
  'cast_send',
  {
    description: 'Envía una transacción a un contrato inteligente usando Cast. Requiere clave privada.',
    inputSchema: {
      address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      functionSignature: z.string(),
      args: z.array(z.string()).optional().default([]),
      value: z.string().optional(),
      privateKey: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
      rpcUrl: z.string().optional().default('http://127.0.0.1:8545'),
    },
  },
  async ({ address, functionSignature, args = [], value, privateKey, rpcUrl = 'http://127.0.0.1:8545' }) => {
    const castArgs = ['send', address, functionSignature]
    if (args && args.length > 0) {
      castArgs.push(...args)
    }
    if (value) {
      castArgs.push('--value', value)
    }
    castArgs.push('--private-key', privateKey)
    castArgs.push('--rpc-url', rpcUrl)

    const result = await executeFoundryCommand('cast', castArgs, {
      timeout: 60000,
    })

    return {
      content: [
        {
          type: 'text',
          text: `Cast send ejecutado.\n\nComando: cast ${castArgs.join(' ')}\n\nResultado:\n${result.stdout}\n\nErrores:\n${result.stderr}`,
        },
      ],
    }
  }
)

// 8. forge_script_fund - Fondea cuentas
server.registerTool(
  'forge_script_fund',
  {
    description: 'Ejecuta el script de Foundry para fondear cuentas de prueba con ETH.',
    inputSchema: {
      rpcUrl: z.string().optional().default('http://127.0.0.1:8545'),
    },
  },
  async ({ rpcUrl = 'http://127.0.0.1:8545' }) => {
    const forgeArgs = [
      'script',
      'script/FundAccounts.s.sol',
      '--rpc-url',
      rpcUrl,
      '--broadcast',
    ]

    const result = await executeFoundryCommand('forge', forgeArgs, {
      timeout: 60000,
      cwd: SC_DIR,
    })

    return {
      content: [
        {
          type: 'text',
          text: `Script de funding ejecutado.\n\nComando: forge ${forgeArgs.join(' ')}\n\nSTDOUT:\n${result.stdout}\n\nSTDERR:\n${result.stderr}`,
        },
      ],
    }
  }
)

// 9. forge_script_deploy - Despliega contrato
server.registerTool(
  'forge_script_deploy',
  {
    description: 'Ejecuta el script de Foundry para desplegar el contrato SupplyChain.',
    inputSchema: {
      rpcUrl: z.string().optional().default('http://127.0.0.1:8545'),
    },
  },
  async ({ rpcUrl = 'http://127.0.0.1:8545' }) => {
    const forgeArgs = [
      'script',
      'script/Deploy.s.sol',
      '--rpc-url',
      rpcUrl,
      '--broadcast',
    ]

    const result = await executeFoundryCommand('forge', forgeArgs, {
      timeout: 60000,
      cwd: SC_DIR,
    })

    // Intentar extraer la dirección del contrato del output
    const addressMatch = result.stdout.match(/SupplyChain deployed at:\s*(0x[a-fA-F0-9]{40})/i)
    const contractAddress = addressMatch ? addressMatch[1] : null

    let responseText = `Script de deploy ejecutado.\n\nComando: forge ${forgeArgs.join(' ')}\n\nSTDOUT:\n${result.stdout}\n\nSTDERR:\n${result.stderr}`
    if (contractAddress) {
      responseText = `✅ Contrato desplegado en: ${contractAddress}\n\n${responseText}`
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    }
  }
)

// 10. anvil_fund - Fondea dirección específica
server.registerTool(
  'anvil_fund',
  {
    description: 'Fondea una dirección específica con ETH usando Anvil.',
    inputSchema: {
      address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      amount: z.string(),
      privateKey: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
      rpcUrl: z.string().optional().default('http://127.0.0.1:8545'),
    },
  },
  async ({ address, amount, privateKey, rpcUrl = 'http://127.0.0.1:8545' }) => {
    const castArgs = [
      'send',
      address,
      '--value',
      amount,
      '--private-key',
      privateKey,
      '--rpc-url',
      rpcUrl,
    ]

    const result = await executeFoundryCommand('cast', castArgs, {
      timeout: 30000,
    })

    return {
      content: [
        {
          type: 'text',
          text: `Dirección fondeada exitosamente.\n\nDirección: ${address}\nCantidad: ${amount}\n\nResultado:\n${result.stdout}\n\nErrores:\n${result.stderr}`,
        },
      ],
    }
  }
)

// 11. health_check - Verifica estado de herramientas
server.registerTool(
  'health_check',
  {
    description: 'Verifica el estado de las herramientas Foundry (forge, anvil, cast) y si Anvil está corriendo.',
    inputSchema: {},
  },
  async () => {
    const health: Record<string, { available: boolean; version?: string; error?: string }> = {}

    // Verificar forge
    try {
      const forgePath = await findFoundryBinary('forge')
      const { stdout } = await execFileAsync(forgePath, ['--version'], { 
        timeout: 5000,
        env: { ...process.env, PATH: `${process.env.HOME}/.foundry/bin:${process.env.PATH || ''}` }
      })
      health.forge = {
        available: true,
        version: stdout.trim(),
      }
    } catch (error: any) {
      health.forge = {
        available: false,
        error: error.message || 'Forge no disponible',
      }
    }

    // Verificar anvil
    try {
      const anvilPath = await findFoundryBinary('anvil')
      const { stdout } = await execFileAsync(anvilPath, ['--version'], { 
        timeout: 5000,
        env: { ...process.env, PATH: `${process.env.HOME}/.foundry/bin:${process.env.PATH || ''}` }
      })
      health.anvil = {
        available: true,
        version: stdout.trim(),
      }
    } catch (error: any) {
      health.anvil = {
        available: false,
        error: error.message || 'Anvil no disponible',
      }
    }

    // Verificar cast
    try {
      const castPath = await findFoundryBinary('cast')
      const { stdout } = await execFileAsync(castPath, ['--version'], { 
        timeout: 5000,
        env: { ...process.env, PATH: `${process.env.HOME}/.foundry/bin:${process.env.PATH || ''}` }
      })
      health.cast = {
        available: true,
        version: stdout.trim(),
      }
    } catch (error: any) {
      health.cast = {
        available: false,
        error: error.message || 'Cast no disponible',
      }
    }

    // Verificar si anvil está corriendo
    const anvilRunning = await checkAnvilRunning()
    const anvilPid = await getAnvilPid()

    let healthText = 'Estado de herramientas Foundry:\n\n'
    for (const [tool, status] of Object.entries(health)) {
      if (status.available) {
        healthText += `✅ ${tool}: ${status.version}\n`
      } else {
        healthText += `❌ ${tool}: ${status.error}\n`
      }
    }

    healthText += `\nAnvil:\n`
    if (anvilRunning) {
      healthText += `✅ Corriendo (PID: ${anvilPid}, Puerto: 8545)\n`
    } else {
      healthText += `❌ No está corriendo`
      if (anvilPid) {
        healthText += ` (hay un proceso con PID ${anvilPid} pero no responde)`
      }
      healthText += `\n`
    }

    return {
      content: [
        {
          type: 'text',
          text: healthText,
        },
      ],
    }
  }
)

// Iniciar servidor con transport STDIO
async function main() {
  const transport = new StdioServerTransport()
  await server.server.connect(transport)
  console.error('Servidor MCP Foundry Tools iniciado (STDIO)')
}

main().catch((error) => {
  console.error('Error iniciando servidor MCP:', error)
  process.exit(1)
})
