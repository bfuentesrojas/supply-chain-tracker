/**
 * Servidor Express separado para APIs MCP Foundry Tools
 * Corre en el puerto 3002
 */

import express from 'express'
import cors from 'cors'
import { z } from 'zod'
import { execFile, exec } from 'child_process'
import { promisify } from 'util'
import { join, resolve } from 'path'
import {
  executeFoundryCommand,
  getAnvilPid,
  sanitizeArgs
} from '../src/lib/foundryTools'

const execFileAsync = promisify(execFile)
const execAsync = promisify(exec)

const app = express()
const PORT = 3002

// Resolver el directorio del proyecto correctamente
// Cuando se ejecuta desde web/, process.cwd() es web/
// Necesitamos ir un nivel arriba para llegar a sc/
const PROJECT_ROOT = join(process.cwd(), '..')
const SC_DIR = join(PROJECT_ROOT, 'sc')

// Middleware
app.use(cors())
app.use(express.json())

// Health Check
async function checkAnvilRunning(): Promise<boolean> {
  // Verificar que realmente responda en el puerto 8545 haciendo una llamada RPC
  try {
    const { stdout } = await execAsync('curl -s -X POST -H "Content-Type: application/json" --data \'{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}\' http://127.0.0.1:8545 --max-time 3')
    
    // Si la respuesta contiene "result" y "0x7a69" (31337 en hex), está respondiendo correctamente
    if (stdout && stdout.includes('"result"') && stdout.includes('0x7a69')) {
      return true
    }
    return false
  } catch {
    // Si hay error o timeout, no está respondiendo
    return false
  }
}

app.get('/health', async (req, res) => {
  try {
    const health: Record<string, { available: boolean; version?: string; error?: string }> = {}
    
    // Verificar forge
    try {
      const { stdout } = await execFileAsync('forge', ['--version'], { timeout: 5000 })
      health.forge = {
        available: true,
        version: stdout.trim()
      }
    } catch (error: any) {
      health.forge = {
        available: false,
        error: error.message || 'Forge no disponible'
      }
    }
    
    // Verificar anvil
    try {
      const { stdout } = await execFileAsync('anvil', ['--version'], { timeout: 5000 })
      health.anvil = {
        available: true,
        version: stdout.trim()
      }
    } catch (error: any) {
      health.anvil = {
        available: false,
        error: error.message || 'Anvil no disponible'
      }
    }
    
    // Verificar cast
    try {
      const { stdout } = await execFileAsync('cast', ['--version'], { timeout: 5000 })
      health.cast = {
        available: true,
        version: stdout.trim()
      }
    } catch (error: any) {
      health.cast = {
        available: false,
        error: error.message || 'Cast no disponible'
      }
    }
    
    // Verificar si anvil está corriendo
    const anvilRunning = await checkAnvilRunning()
    const anvilPid = await getAnvilPid()
    
    res.json({
      success: true,
      tools: health,
      anvil: {
        running: anvilRunning,
        port: anvilRunning ? 8545 : null,
        pid: anvilPid,
        // Advertencia si hay PID pero no responde (proceso zombie o iniciando)
        warning: anvilPid && !anvilRunning ? 'Hay un proceso de Anvil pero no está respondiendo (puede estar iniciando o en estado zombie)' : null
      },
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error verificando estado de herramientas'
    })
  }
})

// Forge Build
const buildSchema = z.object({
  skipTest: z.boolean().optional().default(false),
  extraArgs: z.array(z.string()).optional().default([])
})

app.post('/forge/build', async (req, res) => {
  try {
    const validated = buildSchema.parse(req.body)
    
    // Construir argumentos
    const args = ['build']
    
    if (validated.skipTest) {
      args.push('--skip', 'test')
    }
    
    // Agregar argumentos extra (sanitizados)
    if (validated.extraArgs && validated.extraArgs.length > 0) {
      args.push(...validated.extraArgs)
    }
    
    // Ejecutar comando
    const result = await executeFoundryCommand('forge', args, {
      timeout: 60000 // 60 segundos para compilación
    })
    
    res.json({
      success: true,
      command: `forge ${args.join(' ')}`,
      stdout: result.stdout,
      stderr: result.stderr,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: error.errors
      })
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Error ejecutando forge build'
    })
  }
})

// Forge Test
const testSchema = z.object({
  matchTest: z.string().optional(),
  verbosity: z.number().min(0).max(5).optional().default(2),
  extraArgs: z.array(z.string()).optional().default([])
})

function extractTestSummary(output: string): {
  passed?: number
  failed?: number
  skipped?: number
} {
  const summary: { passed?: number; failed?: number; skipped?: number } = {}
  
  // Buscar patrones como "X passed; Y failed; Z skipped"
  const passedMatch = output.match(/(\d+)\s+passed/)
  const failedMatch = output.match(/(\d+)\s+failed/)
  const skippedMatch = output.match(/(\d+)\s+skipped/)
  
  if (passedMatch) summary.passed = parseInt(passedMatch[1])
  if (failedMatch) summary.failed = parseInt(failedMatch[1])
  if (skippedMatch) summary.skipped = parseInt(skippedMatch[1])
  
  return summary
}

app.post('/forge/test', async (req, res) => {
  try {
    const validated = testSchema.parse(req.body)
    
    // Construir argumentos
    const args = ['test']
    
    // Agregar verbosity
    if (validated.verbosity > 0) {
      const vFlags = 'v'.repeat(validated.verbosity)
      args.push(`-${vFlags}`)
    }
    
    // Match test específico
    if (validated.matchTest) {
      args.push('--match-test', validated.matchTest)
    }
    
    // Agregar argumentos extra (sanitizados)
    if (validated.extraArgs && validated.extraArgs.length > 0) {
      args.push(...validated.extraArgs)
    }
    
    // Ejecutar comando
    const result = await executeFoundryCommand('forge', args, {
      timeout: 120000 // 120 segundos para tests
    })
    
    // Intentar extraer información de los tests
    const testSummary = extractTestSummary(result.stdout)
    
    res.json({
      success: true,
      command: `forge ${args.join(' ')}`,
      stdout: result.stdout,
      stderr: result.stderr,
      summary: testSummary,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: error.errors
      })
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Error ejecutando forge test'
    })
  }
})

// Anvil Restart Schema
const anvilRestartSchema = z.object({
  host: z.string().optional().default('0.0.0.0'),
  port: z.number().min(1).max(65535).optional().default(8545),
  chainId: z.number().optional(),
  blockTime: z.number().optional(),
  extraArgs: z.array(z.string()).optional().default([])
})

// Función auxiliar para detener todos los procesos Anvil
async function stopAllAnvilProcesses(): Promise<{ stoppedPids: number[]; errors: string[] }> {
  const stoppedPids: number[] = []
  const errors: string[] = []
  
  // Obtener todos los PIDs de procesos anvil
  const allPids = await getAllAnvilPids()
  
  if (allPids.length === 0) {
    return { stoppedPids, errors }
  }
  
  // Paso 1: Enviar SIGTERM a todos los procesos
  for (const pid of allPids) {
    try {
      await execAsync(`kill ${pid}`)
      stoppedPids.push(pid)
    } catch (error: any) {
      if (!error.message.includes('No such process')) {
        errors.push(`Error deteniendo PID ${pid}: ${error.message}`)
      }
    }
  }
  
  // Esperar un momento para que los procesos terminen
  await new Promise(resolve => setTimeout(resolve, 1500))
  
  // Paso 2: Verificar si aún hay procesos corriendo y usar kill -9
  const remainingPids = await getAllAnvilPids()
  for (const pid of remainingPids) {
    try {
      await execAsync(`kill -9 ${pid}`)
      if (!stoppedPids.includes(pid)) {
        stoppedPids.push(pid)
      }
    } catch (error: any) {
      if (!error.message.includes('No such process')) {
        errors.push(`Error matando PID ${pid}: ${error.message}`)
      }
    }
  }
  
  // Paso 3: Usar pkill de forma más agresiva - matar TODOS los procesos anvil
  try {
    await execAsync('pkill -9 -f "anvil.*8545"')
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Si aún hay procesos, intentar matar todos los procesos anvil
    const stillRunning = await getAllAnvilPids()
    if (stillRunning.length > 0) {
      await execAsync('pkill -9 -f "anvil"')
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  } catch (error: any) {
    // Ignorar errores si no hay procesos
    if (!error.message.includes('No matching processes') && !error.message.includes('No such process')) {
      errors.push(`Error con pkill: ${error.message}`)
    }
  }
  
  // Esperar más tiempo para asegurar que todos los procesos terminen
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  return { stoppedPids, errors }
}

// Anvil Restart - Detiene todos los procesos Anvil y reinicia con un nuevo PID
app.post('/anvil/restart', async (req, res) => {
  try {
    const validated = anvilRestartSchema.parse(req.body)
    
    // Paso 1: Detener todos los procesos Anvil existentes
    const oldPids = await getAllAnvilPids()
    const stopResult = await stopAllAnvilProcesses()
    
    // Paso 2: Verificar que todos los procesos se detuvieron
    const finalPids = await getAllAnvilPids()
    const finalIsResponding = await checkAnvilRunning()
    
    if (finalPids.length > 0 || finalIsResponding) {
      // Si aún hay procesos, intentar una última vez
      await stopAllAnvilProcesses()
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const secondCheckPids = await getAllAnvilPids()
      const secondCheckResponding = await checkAnvilRunning()
      
      if (secondCheckPids.length > 0 || secondCheckResponding) {
        return res.json({
          success: false,
          error: `No se pudieron detener todos los procesos Anvil. PIDs que no se pudieron detener: ${secondCheckPids.join(', ')}`,
          stoppedPids: stopResult.stoppedPids,
          remainingPids: secondCheckPids,
          timestamp: new Date().toISOString()
        })
      }
    }
    
    // Paso 3: Iniciar un nuevo proceso Anvil
    const args = [
      '--host', validated.host,
      '--port', validated.port.toString()
    ]
    
    if (validated.chainId) {
      args.push('--chain-id', validated.chainId.toString())
    }
    
    if (validated.blockTime) {
      args.push('--block-time', validated.blockTime.toString())
    }
    
    // Agregar argumentos extra (sanitizados)
    if (validated.extraArgs && validated.extraArgs.length > 0) {
      const sanitized = sanitizeArgs(validated.extraArgs)
      args.push(...sanitized)
    }
    
    // Sanitizar todos los argumentos antes de ejecutar
    const sanitizedArgs = sanitizeArgs(args)
    
    // Ejecutar anvil en background
    const childProcess = execFile(
      'anvil',
      sanitizedArgs,
      {
        cwd: SC_DIR,
        detached: true,
        stdio: 'ignore'
      }
    )
    
    // Desconectar el proceso para que corra en background
    childProcess.unref()
    
    // Esperar un momento y verificar que esté corriendo
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const newPid = await getAnvilPid()
    const isResponding = await checkAnvilRunning()
    
    if (!newPid || !isResponding) {
      return res.json({
        success: false,
        error: 'Anvil se detuvo correctamente pero no se pudo iniciar el nuevo proceso',
        stoppedPids: stopResult.stoppedPids,
        timestamp: new Date().toISOString()
      })
    }
    
    // Verificar que el nuevo PID sea diferente de los anteriores
    const pidChanged = !oldPids.includes(newPid)
    
    res.json({
      success: true,
      message: 'Anvil reiniciado correctamente',
      oldPids: oldPids.length > 0 ? oldPids : undefined,
      newPid,
      pidChanged,
      port: validated.port,
      host: validated.host,
      stoppedPids: stopResult.stoppedPids.length > 0 ? stopResult.stoppedPids : undefined,
      warnings: stopResult.errors.length > 0 ? stopResult.errors : undefined,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: error.errors
      })
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Error reiniciando Anvil'
    })
  }
})

// Función auxiliar para obtener todos los PIDs de procesos anvil en el puerto 8545
async function getAllAnvilPids(): Promise<number[]> {
  try {
    const { stdout } = await execAsync('pgrep -f "anvil.*8545"')
    return stdout.trim().split('\n')
      .map(line => parseInt(line.trim()))
      .filter(pid => !isNaN(pid) && pid > 0)
  } catch {
    return []
  }
}

// Cast Call
const castCallSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Dirección inválida'),
  functionSignature: z.string().min(1, 'Firma de función requerida'),
  args: z.array(z.string()).optional(), // Argumentos de la función
  rpcUrl: z.string().url().optional().default('http://127.0.0.1:8545'),
  extraArgs: z.array(z.string()).optional().default([]) // Mantener por compatibilidad
})

app.post('/cast/call', async (req, res) => {
  try {
    const validated = castCallSchema.parse(req.body)
    
    // Construir argumentos
    // Formato: cast call <address> <functionSignature> [args...] --rpc-url <url>
    const args = [
      'call',
      validated.address,
      validated.functionSignature
    ]
    
    // Agregar argumentos de la función ANTES de --rpc-url
    // Los argumentos deben ir inmediatamente después de la firma de función
    if (validated.args && Array.isArray(validated.args) && validated.args.length > 0) {
      args.push(...validated.args)
    } else if (validated.extraArgs && validated.extraArgs.length > 0) {
      // Mantener compatibilidad con extraArgs
      args.push(...validated.extraArgs)
    }
    
    // Agregar --rpc-url al final
    args.push('--rpc-url', validated.rpcUrl)
    
    // Ejecutar comando
    const result = await executeFoundryCommand('cast', args, {
      timeout: 30000 // 30 segundos
    })
    
    res.json({
      success: true,
      command: `cast ${args.join(' ')}`,
      address: validated.address,
      functionSignature: validated.functionSignature,
      result: result.stdout.trim(),
      stderr: result.stderr,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: error.errors
      })
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Error ejecutando cast call'
    })
  }
})

// Cast Send
const castSendSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Dirección inválida'),
  functionSignature: z.string().optional(), // Debe incluir paréntesis con tipos, ej: "functionName(uint256)"
  args: z.array(z.string()).optional(), // Argumentos de la función
  value: z.string().optional(),
  privateKey: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Clave privada inválida'),
  rpcUrl: z.string().url().optional().default('http://127.0.0.1:8545'),
  extraArgs: z.array(z.string()).optional().default([]) // Mantener por compatibilidad
})

function extractTxHash(output: string): string | null {
  // Buscar patrón de hash (0x seguido de 64 caracteres hex)
  const hashMatch = output.match(/0x[a-fA-F0-9]{64}/)
  return hashMatch ? hashMatch[0] : null
}

app.post('/cast/send', async (req, res) => {
  try {
    const validated = castSendSchema.parse(req.body)
    
    // Construir argumentos
    // Formato: cast send <address> <functionSignature> [args...] --private-key <key> --value <value> --rpc-url <url>
    const args = [
      'send',
      validated.address
    ]
    
    // Agregar función si se proporciona (debe incluir paréntesis, ej: "functionName(uint256)")
    if (validated.functionSignature) {
      args.push(validated.functionSignature)
      
      // Agregar argumentos de la función inmediatamente después de la firma
      if (validated.args && Array.isArray(validated.args) && validated.args.length > 0) {
        args.push(...validated.args)
      } else if (validated.extraArgs && validated.extraArgs.length > 0) {
        // Mantener compatibilidad con extraArgs
        args.push(...validated.extraArgs)
      }
    }
    
    // Agregar --private-key
    args.push('--private-key', validated.privateKey)
    
    // Agregar valor si se proporciona
    if (validated.value) {
      args.push('--value', validated.value)
    }
    
    // Agregar --rpc-url al final
    args.push('--rpc-url', validated.rpcUrl)
    
    // Ejecutar comando
    const result = await executeFoundryCommand('cast', args, {
      timeout: 60000 // 60 segundos para transacciones
    })
    
    // Intentar extraer hash de transacción
    const txHash = extractTxHash(result.stdout)
    
    res.json({
      success: true,
      command: `cast send ${validated.address}${validated.functionSignature ? ' ' + validated.functionSignature : ''}`,
      address: validated.address,
      transactionHash: txHash,
      stdout: result.stdout,
      stderr: result.stderr,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: error.errors
      })
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Error ejecutando cast send'
    })
  }
})

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor MCP API corriendo en http://localhost:${PORT}`)
  console.log(`📋 Endpoints disponibles:`)
  console.log(`   GET  /health`)
  console.log(`   POST /forge/build`)
  console.log(`   POST /forge/test`)
  console.log(`   POST /anvil/restart`)
  console.log(`   POST /cast/call`)
  console.log(`   POST /cast/send`)
})


