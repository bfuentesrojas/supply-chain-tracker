/**
 * Utilidades compartidas para ejecución segura de comandos Foundry
 */

import { execFile, exec, spawn } from 'child_process'
import { promisify } from 'util'
import { join, dirname, resolve } from 'path'
import * as os from 'os'
import { access, constants } from 'fs/promises'

const execFileAsync = promisify(execFile)
const execAsync = promisify(exec)

/**
 * Resuelve el directorio contracts/ buscando hacia arriba desde el directorio actual
 * Busca un directorio llamado 'contracts' que contenga foundry.toml
 * Primero verifica la variable de entorno CONTRACTS_DIR si está definida
 */
async function resolveContractsDir(): Promise<string> {
  // 1. Verificar si hay una variable de entorno CONTRACTS_DIR configurada
  if (process.env.CONTRACTS_DIR) {
    const envContractsDir = resolve(process.env.CONTRACTS_DIR)
    const foundryTomlPath = join(envContractsDir, 'foundry.toml')
    try {
      await access(foundryTomlPath, constants.F_OK)
      // Variable de entorno válida, usar esta ruta
      return envContractsDir
    } catch {
      // Variable de entorno configurada pero no válida, continuar con búsqueda
      console.error(`[WARN] CONTRACTS_DIR=${process.env.CONTRACTS_DIR} no contiene foundry.toml, buscando dinámicamente...`)
    }
  }
  
  const currentDir = process.cwd()
  
  // Intentar la estrategia simple primero: si estamos en backend/, ir un nivel arriba
  let searchDir = currentDir
  if (currentDir.endsWith('backend') || currentDir.endsWith('backend/')) {
    searchDir = resolve(currentDir, '..')
  }
  
  // Buscar hacia arriba desde searchDir hasta encontrar contracts/foundry.toml
  let dir = resolve(searchDir)
  const root = resolve('/')
  
  while (dir !== root && dir !== dirname(dir)) {
    const contractsPath = join(dir, 'contracts')
    const foundryTomlPath = join(contractsPath, 'foundry.toml')
    
    try {
      await access(foundryTomlPath, constants.F_OK)
      // Encontrado! contracts/foundry.toml existe
      return contractsPath
    } catch {
      // No encontrado en este nivel, continuar hacia arriba
    }
    
    const parentDir = dirname(dir)
    if (parentDir === dir) {
      // Hemos llegado a la raíz del sistema
      break
    }
    dir = parentDir
  }
  
  // Si no encontramos, usar la estrategia fallback (asumir estructura backend/../contracts)
  const fallbackRoot = currentDir.endsWith('backend') || currentDir.endsWith('backend/')
    ? resolve(currentDir, '..')
    : currentDir
  return join(fallbackRoot, 'contracts')
}

// Resolver CONTRACTS_DIR de forma asíncrona
// Para compatibilidad con código síncrono, inicializamos con un valor por defecto
// y lo actualizaremos cuando se llame resolveContractsDir() por primera vez
let CONTRACTS_DIR_CACHE: string | null = null

// Función helper para obtener CONTRACTS_DIR (cached)
async function getContractsDir(): Promise<string> {
  if (!CONTRACTS_DIR_CACHE) {
    CONTRACTS_DIR_CACHE = await resolveContractsDir()
  }
  return CONTRACTS_DIR_CACHE
}

// Valor inicial para código síncrono (se actualizará en la primera llamada async)
const currentDir = process.cwd()
const PROJECT_ROOT = currentDir.endsWith('backend') || currentDir.endsWith('backend/')
  ? resolve(currentDir, '..')
  : currentDir
const CONTRACTS_DIR = join(PROJECT_ROOT, 'contracts')

// Cache para rutas de binarios de Foundry
let foundryBinariesCache: {
  forge?: string
  anvil?: string
  cast?: string
} | null = null

/**
 * Construye un entorno de ejecución mejorado con PATH expandido
 * Incluye rutas del sistema necesarias para que Node.js pueda ejecutar /bin/sh
 */
function getEnhancedEnv(customEnv?: Record<string, string>): NodeJS.ProcessEnv {
  const homeDir = process.env.HOME || os.homedir()
  const foundryBin = join(homeDir, '.foundry', 'bin')
  
  // Construir PATH extendido con rutas del sistema
  const existingPath = process.env.PATH || ''
  const systemPaths = [
    foundryBin,
    '/usr/local/sbin',
    '/usr/local/bin',
    '/usr/sbin',
    '/usr/bin',
    '/sbin',
    '/bin',
    existingPath
  ].filter(Boolean).join(':')
  
  // Limpiar PATH (remover duplicados y espacios)
  const cleanPath = systemPaths.replace(/^:/, '').replace(/::+/g, ':')
  
  // Construir entorno base
  const baseEnv: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: cleanPath,
    HOME: homeDir,
    USER: process.env.USER || os.userInfo().username
  }
  
  // Si hay un PATH personalizado en customEnv, combinarlo con las rutas del sistema
  if (customEnv?.PATH) {
    const customPath = `${foundryBin}:${systemPaths.split(existingPath)[0]}${existingPath}:${customEnv.PATH}`
    baseEnv.PATH = customPath.replace(/^:/, '').replace(/::+/g, ':')
  }
  
  // Aplicar variables de entorno personalizadas (excepto PATH que ya manejamos)
  const { PATH: _, ...restCustomEnv } = customEnv || {}
  
  return {
    ...baseEnv,
    ...restCustomEnv,
    // Asegurar que PATH siempre esté presente con rutas del sistema
    PATH: baseEnv.PATH || cleanPath
  }
}

/**
 * Encuentra la ruta absoluta de un binario de Foundry
 * Busca en múltiples ubicaciones comunes y verifica que el binario sea ejecutable
 */
async function findFoundryBinary(tool: 'forge' | 'anvil' | 'cast'): Promise<string> {
  const debugLog = process.env.DEBUG_FOUNDRY === 'true'
  
  // Si ya está en cache, verificar que aún existe antes de usarlo
  if (foundryBinariesCache?.[tool]) {
    const cachedPath = foundryBinariesCache[tool]!
    try {
      const { access, constants } = await import('fs/promises')
      await access(cachedPath, constants.F_OK | constants.X_OK)
      if (debugLog) {
        console.error(`[DEBUG] findFoundryBinary: Cache hit para ${tool}: ${cachedPath}`)
      }
      return cachedPath
    } catch {
      // Cache inválido, limpiar y buscar de nuevo
      if (foundryBinariesCache) {
        delete foundryBinariesCache[tool]
      }
      if (debugLog) {
        console.error(`[DEBUG] findFoundryBinary: Cache inválido para ${tool}, buscando de nuevo`)
      }
    }
  }

  // Inicializar cache si no existe
  if (!foundryBinariesCache) {
    foundryBinariesCache = {}
  }

  if (debugLog) {
    console.error(`[DEBUG] findFoundryBinary: Buscando ${tool}...`)
  }

  try {
    // Intentar encontrar usando 'which' con el entorno mejorado
    const whichEnv = getEnhancedEnv()
    const { stdout } = await execAsync(`which ${tool}`, { env: whichEnv })
    const path = stdout.trim()
    if (path && path.length > 0) {
      // Verificar que existe y es ejecutable
      try {
        const { access, constants } = await import('fs/promises')
        await access(path, constants.F_OK | constants.X_OK)
        foundryBinariesCache[tool] = path
        if (debugLog) {
          console.error(`[DEBUG] findFoundryBinary: Encontrado con 'which': ${path}`)
        }
        return path
      } catch {
        // 'which' encontró algo pero no es válido, continuar
      }
    }
  } catch {
    // 'which' falló, continuar con otras opciones
  }

  // Rutas comunes de instalación de Foundry
  const homeDir = process.env.HOME || os.homedir()
  const userInfo = os.userInfo()
  const commonPaths = [
    join(homeDir, '.foundry', 'bin', tool),
    join(homeDir, '.local', 'bin', tool),
    join('/home', userInfo.username, '.foundry', 'bin', tool),
    `/usr/local/bin/${tool}`,
    `/usr/bin/${tool}`,
    join(homeDir, '.cargo', 'bin', tool),
  ]

  if (debugLog) {
    console.error(`[DEBUG] findFoundryBinary: Verificando rutas comunes: ${commonPaths.join(', ')}`)
  }

  // Verificar cada ruta
  for (const path of commonPaths) {
    try {
      // Primero verificar que el archivo existe y es accesible
      const { access, constants, stat } = await import('fs/promises')
      await access(path, constants.F_OK | constants.X_OK)
      
      // Verificar que no es un directorio
      const stats = await stat(path)
      if (stats.isDirectory()) {
        continue
      }
      
      if (debugLog) {
        console.error(`[DEBUG] findFoundryBinary: Archivo encontrado: ${path}, verificando ejecución...`)
      }
      
      // Si existe, intentar ejecutar --version para verificar que funciona
      const { execFile } = await import('child_process')
      const { promisify } = await import('util')
      const execFileAsync = promisify(execFile)
      
      // Usar el entorno mejorado para verificar que el binario funciona
      const versionCheckEnv = getEnhancedEnv()
      await execFileAsync(path, ['--version'], { 
        timeout: 3000,
        env: versionCheckEnv
      })
      
      foundryBinariesCache[tool] = path
      if (debugLog) {
        console.error(`[DEBUG] findFoundryBinary: Ruta válida encontrada: ${path}`)
      }
      return path
    } catch (err: any) {
      if (debugLog) {
        console.error(`[DEBUG] findFoundryBinary: Ruta ${path} no válida: ${err.message}`)
      }
      // Esta ruta no funciona, continuar
      continue
    }
  }

  // Si no se encuentra, usar el nombre del comando (fallback)
  // Esto permitirá que funcione si está en PATH
  if (debugLog) {
    console.error(`[DEBUG] findFoundryBinary: No se encontró ruta, usando nombre del comando: ${tool}`)
  }
  foundryBinariesCache[tool] = tool
  return tool
}

/**
 * Valida que los binarios de Foundry estén instalados y sean accesibles
 * Retorna un objeto con el estado de cada binario
 */
export async function validateFoundryInstallation(): Promise<Record<string, { found: boolean; path?: string; error?: string }>> {
  const binaries: Array<'forge' | 'anvil' | 'cast'> = ['forge', 'anvil', 'cast']
  const results: Record<string, { found: boolean; path?: string; error?: string }> = {}
  
  for (const binary of binaries) {
    try {
      const binPath = await findFoundryBinary(binary)
      results[binary] = {
        found: true,
        path: binPath
      }
    } catch (error: any) {
      results[binary] = {
        found: false,
        error: error.message || 'No encontrado'
      }
    }
  }
  
  // Logging detallado
  console.error('[Foundry Validation] Estado de instalación:')
  console.error(JSON.stringify(results, null, 2))
  console.error(`[Foundry Validation] HOME: ${process.env.HOME || os.homedir()}`)
  const enhancedEnv = getEnhancedEnv()
  console.error(`[Foundry Validation] PATH: ${enhancedEnv.PATH?.substring(0, 200)}...`)
  
  return results
}

// Allowlist de comandos permitidos
const ALLOWED_COMMANDS = {
  forge: ['build', 'test', 'script'],
  anvil: ['start', 'stop'], // start/stop se manejan en endpoints específicos
  cast: ['call', 'send', 'balance', 'block-number']
} as const

// Timeout por defecto (30 segundos)
const DEFAULT_TIMEOUT = 30000

/**
 * Sanitiza argumentos de comandos para prevenir inyección de comandos
 * 
 * @param args - Array de argumentos a sanitizar
 * @returns Array de argumentos sanitizados
 * @throws Error si un argumento es inválido después de sanitización o demasiado largo
 * 
 * @example
 * ```typescript
 * const sanitized = sanitizeArgs(['build', '--force'])
 * // ['build', '--force']
 * ```
 */
export function sanitizeArgs(args: string[]): string[] {
  return args.map((arg, index) => {
    // Para firmas de función (típicamente en índice 2 para cast call/send),
    // permitir paréntesis, comas y tipos de Solidity
    // Patrón: functionName(type1,type2) o functionName()
    const isLikelyFunctionSignature = index >= 2 && 
      typeof arg === 'string' && 
      /^[a-zA-Z_][a-zA-Z0-9_]*\([^)]*\)$/.test(arg.trim())
    
    if (isLikelyFunctionSignature) {
      // Para firmas de función, solo sanitizar espacios y saltos de línea
      const sanitized = arg
        .replace(/\n/g, '')
        .replace(/\r/g, '')
        .replace(/\s+/g, ' ') // Normalizar espacios
        .trim()
      
      if (!sanitized || sanitized.length === 0) {
        throw new Error('Firma de función inválida después de sanitización')
      }
      
      return sanitized
    }
    
    // Para otros argumentos, sanitizar normalmente pero permitir paréntesis en algunos contextos
    // Permitir: letras, números, guiones, puntos, dos puntos, barras, 0x para direcciones
    // Pero también permitir paréntesis, comas y otros caracteres necesarios para argumentos de funciones
    const sanitized = arg
      .replace(/[;&|`${}<>'"]/g, '') // Remover caracteres peligrosos, pero mantener ()[] para tipos
      .replace(/\n/g, '')
      .replace(/\r/g, '')
      .replace(/\s+/g, ' ') // Normalizar espacios
      .trim()
    
    // Validar que no esté vacío después de sanitizar
    if (!sanitized || sanitized.length === 0) {
      throw new Error('Argumento inválido después de sanitización')
    }
    
    // Validar longitud máxima (prevenir argumentos extremadamente largos)
    if (sanitized.length > 1000) {
      throw new Error('Argumento demasiado largo')
    }
    
    return sanitized
  })
}

/**
 * Valida que un comando esté en la allowlist de comandos permitidos
 * 
 * @param tool - Herramienta Foundry a validar ('forge', 'anvil', o 'cast')
 * @param subcommand - Subcomando a validar (ej: 'build', 'test', 'call')
 * @returns true si el comando está permitido, false en caso contrario
 * 
 * @example
 * ```typescript
 * validateCommand('forge', 'build') // true
 * validateCommand('forge', 'install') // false
 * ```
 */
export function validateCommand(tool: 'forge' | 'anvil' | 'cast', subcommand: string): boolean {
  const allowed = ALLOWED_COMMANDS[tool]
  if (!allowed) return false
  
  // Type assertion seguro porque ya validamos que tool es válido
  return (allowed as readonly string[]).includes(subcommand)
}

/**
 * Ejecuta un comando Foundry de forma segura con validación y sanitización
 * 
 * @param tool - Herramienta Foundry a ejecutar ('forge', 'anvil', o 'cast')
 * @param args - Array de argumentos para el comando
 * @param options - Opciones de ejecución (cwd, timeout, env)
 * @param options.cwd - Directorio de trabajo (por defecto: CONTRACTS_DIR)
 * @param options.timeout - Timeout en milisegundos (por defecto: 30000)
 * @param options.env - Variables de entorno adicionales
 * @returns Promise con stdout y stderr del comando
 * @throws Error si el comando no está permitido, los argumentos son inválidos, o la ejecución falla
 * 
 * @example
 * ```typescript
 * const result = await executeFoundryCommand('forge', ['build', '--force'])
 * console.log(result.stdout)
 * ```
 */
export async function executeFoundryCommand(
  tool: 'forge' | 'anvil' | 'cast',
  args: string[],
  options: {
    cwd?: string
    timeout?: number
    env?: Record<string, string>
  } = {}
): Promise<{ stdout: string; stderr: string }> {
  // Validar comando
  if (args.length === 0) {
    throw new Error('Se requiere al menos un argumento')
  }
  
  const subcommand = args[0]
  if (!validateCommand(tool, subcommand)) {
    throw new Error(`Comando no permitido: ${tool} ${subcommand}`)
  }
  
  // Sanitizar argumentos
  const sanitizedArgs = sanitizeArgs(args)
  
  // Logging detallado para debugging (siempre loggear a stderr para MCP)
  const debugLog = process.env.DEBUG_FOUNDRY === 'true' || process.env.NODE_ENV === 'development'
  
  // Directorio de trabajo
  // Para comandos forge (build, test, script) siempre usar CONTRACTS_DIR
  // porque necesitan encontrar foundry.toml y las dependencias en lib/
  // Para otros comandos, también usar CONTRACTS_DIR por defecto pero permitir override
  // Resolver dinámicamente el directorio contracts/ buscando hacia arriba
  const contractsDir = await getContractsDir()
  const cwd = options.cwd || contractsDir
  
  if (debugLog) {
    console.error(`[DEBUG] contractsDir resuelto: ${contractsDir}`)
    console.error(`[DEBUG] cwd final: ${cwd}`)
  }
  
  // Encontrar ruta absoluta del binario
  const binaryPath = await findFoundryBinary(tool)

  // Usar el entorno mejorado que ya incluye todas las rutas necesarias
  const env = getEnhancedEnv(options.env)
  
  // Verificar que el binario existe y es ejecutable antes de ejecutar
  let finalBinaryPath = binaryPath
  try {
    const { access, constants } = await import('fs/promises')
    await access(binaryPath, constants.F_OK | constants.X_OK)
    // Si la verificación pasa, usar binaryPath
    finalBinaryPath = binaryPath
  } catch (accessError: any) {
    // Si el binario no existe o no es ejecutable, intentar encontrar una ruta alternativa
    const home = process.env.HOME || ''
    const fallbackPath = join(home, '.foundry', 'bin', tool)
    
    // Si binaryPath es solo el nombre o no existe, intentar fallback
    if (binaryPath === tool || !binaryPath.includes('/') || accessError.code === 'ENOENT') {
      try {
        const { access, constants } = await import('fs/promises')
        await access(fallbackPath, constants.F_OK | constants.X_OK)
        // Actualizar cache y usar la ruta encontrada
        if (foundryBinariesCache) {
          foundryBinariesCache[tool] = fallbackPath
        }
        finalBinaryPath = fallbackPath
      } catch (fallbackError: any) {
        // Limpiar cache si falla
        if (foundryBinariesCache) {
          delete foundryBinariesCache[tool]
        }
        throw new Error(
          `Comando no encontrado: ${tool}. Asegúrate de que Foundry esté instalado. Rutas verificadas: ${binaryPath}, ${fallbackPath}. Error original: ${accessError.message}`
        )
      }
    } else {
      // Si binaryPath es una ruta absoluta pero no existe, limpiar cache y lanzar error
      if (foundryBinariesCache) {
        delete foundryBinariesCache[tool]
      }
      throw new Error(
        `Comando no encontrado: ${tool}. Ruta buscada: ${binaryPath}. Error: ${accessError.message} (code: ${accessError.code})`
      )
    }
  }

  // Logging inicial
  if (debugLog) {
    console.error(`[DEBUG] executeFoundryCommand: tool=${tool}, subcommand=${subcommand}`)
    console.error(`[DEBUG] binaryPath inicial: ${binaryPath}`)
    console.error(`[DEBUG] finalBinaryPath: ${finalBinaryPath}`)
    console.error(`[DEBUG] cwd: ${cwd}`)
    console.error(`[DEBUG] PATH: ${env.PATH?.substring(0, 150)}...`)
    console.error(`[DEBUG] sanitizedArgs: ${JSON.stringify(sanitizedArgs)}`)
  }

  // Resolver ruta real (por si es symlink) y verificar una vez más
  let resolvedBinaryPath = finalBinaryPath
  try {
    const { realpath, access, constants, stat } = await import('fs/promises')
    resolvedBinaryPath = await realpath(finalBinaryPath)
    
    // Verificar que existe y es ejecutable
    await access(resolvedBinaryPath, constants.F_OK | constants.X_OK)
    
    // Verificar que es un archivo (no directorio)
    const stats = await stat(resolvedBinaryPath)
    if (!stats.isFile()) {
      throw new Error(`La ruta ${resolvedBinaryPath} no es un archivo regular`)
    }
    
    if (debugLog) {
      console.error(`[DEBUG] Binary verificado: ${resolvedBinaryPath}, size: ${stats.size}, mode: ${stats.mode.toString(8)}`)
    }
  } catch (verifyError: any) {
    // Limpiar cache si la verificación falla
    if (foundryBinariesCache) {
      delete foundryBinariesCache[tool]
    }
    
    // Intentar con la ruta original si la resolución falla
    if (resolvedBinaryPath !== finalBinaryPath) {
      try {
        const { access, constants } = await import('fs/promises')
        await access(finalBinaryPath, constants.F_OK | constants.X_OK)
        resolvedBinaryPath = finalBinaryPath
        if (debugLog) {
          console.error(`[DEBUG] Usando ruta original después de fallo en realpath: ${finalBinaryPath}`)
        }
      } catch {
        throw new Error(
          `Comando no encontrado: ${tool}. Verificación falló para: ${finalBinaryPath} (resuelto: ${resolvedBinaryPath}). Error: ${verifyError.message} (code: ${verifyError.code})`
        )
      }
    } else {
      throw new Error(
        `Comando no encontrado: ${tool}. Verificación falló para: ${finalBinaryPath}. Error: ${verifyError.message} (code: ${verifyError.code})`
      )
    }
  }

  // ESTRATEGIA FINAL: Usar el mismo entorno y configuración que health_check
  // health_check funciona, así que replicamos exactamente su entorno
  if (debugLog) {
    console.error(`[DEBUG] Ejecutando con execFileAsync (replicando health_check): ${resolvedBinaryPath} ${sanitizedArgs.join(' ')}`)
    console.error(`[DEBUG] cwd: ${cwd}`)
    console.error(`[DEBUG] env.PATH: ${env.PATH?.substring(0, 150)}...`)
  }

  // ESTRATEGIA: Usar exec() con comando completo (cd + comando) para evitar problemas con cwd en spawn
  // Esto replica la estrategia de health_check que funciona correctamente
  // health_check funciona porque NO usa cwd, así que usamos exec() con comando completo
  try {
    
    // Para comandos forge, necesitan estar en contracts/ para encontrar foundry.toml
    // En lugar de usar cwd (que causa problemas con spawn), construimos un comando con cd
    const contractsDirRef = await getContractsDir()
    if (tool === 'forge' || options.cwd || cwd !== contractsDirRef) {
      if (debugLog) {
        console.error(`[DEBUG] Usando estrategia exec() con cd (como health_check): ${cwd} (tool: ${tool})`)
      }
      
      // Construir comando completo: cd al directorio y ejecutar el comando
      // Escapar el cwd y los argumentos correctamente
      const escapedCwd = cwd.replace(/'/g, "'\\''")
      const escapedArgs = sanitizedArgs.map(arg => {
        // Escapar comillas y espacios
        const escaped = arg.replace(/"/g, '\\"').replace(/\$/g, '\\$')
        return `"${escaped}"`
      }).join(' ')
      
      // Usar bash -c para ejecutar el comando completo
      const fullCommand = `cd "${escapedCwd}" && ${resolvedBinaryPath} ${escapedArgs}`
      
      if (debugLog) {
        console.error(`[DEBUG] Comando completo: ${fullCommand.substring(0, 200)}...`)
      }
      
      // Usar exec() sin cwd (como health_check) - el cd está en el comando mismo
      // Especificar shell explícitamente para asegurar que use el PATH correcto
      const { exec } = await import('child_process')
      const { promisify } = await import('util')
      const execAsync = promisify(exec)
      
      const result = await execAsync(fullCommand, {
        // NO usar cwd aquí - el cd está en el comando mismo
        // Usar shell explícito para asegurar que el PATH se respete
        shell: '/bin/bash',
        timeout: options.timeout || DEFAULT_TIMEOUT,
        env: env,
        maxBuffer: 10 * 1024 * 1024 // 10MB
      })

      if (debugLog) {
        console.error(`[DEBUG] ✅ Comando ejecutado exitosamente con exec() (cd en comando)`)
        console.error(`[DEBUG] stdout length: ${result.stdout.length}, stderr length: ${result.stderr.length}`)
      }

      return { stdout: result.stdout, stderr: result.stderr }
    } else {
      // Para otros comandos (cast, anvil), intentar sin cwd primero (como health_check)
      // Sin cwd, usar el mismo env que ya incluye rutas del sistema (pero funciona sin cwd)
      try {
        const { stdout, stderr } = await execFileAsync(
          resolvedBinaryPath,
          sanitizedArgs,
          {
            timeout: options.timeout || DEFAULT_TIMEOUT,
            env: env,
            maxBuffer: 10 * 1024 * 1024 // 10MB
          }
        )

        if (debugLog) {
          console.error(`[DEBUG] ✅ Comando ejecutado exitosamente sin cwd (como health_check)`)
          console.error(`[DEBUG] stdout length: ${stdout.length}, stderr length: ${stderr.length}`)
        }

        return { stdout, stderr }
      } catch (errorNoCwd: any) {
        // Si falla sin cwd, intentar con exec() y comando completo (cd incluido)
        if (debugLog) {
          console.error(`[DEBUG] Falló sin cwd (${errorNoCwd.message}), intentando con exec() y cd en comando: ${cwd}`)
        }
        
        // Construir comando con cd (sin usar cwd en opciones)
        const escapedCwd = cwd.replace(/'/g, "'\\''")
        const escapedArgs = sanitizedArgs.map(arg => {
          const escaped = arg.replace(/"/g, '\\"').replace(/\$/g, '\\$')
          return `"${escaped}"`
        }).join(' ')
        
        const fullCommand = `cd "${escapedCwd}" && ${resolvedBinaryPath} ${escapedArgs}`
        
        const { exec } = await import('child_process')
        const { promisify } = await import('util')
        const execAsync = promisify(exec)
        
        const result = await execAsync(fullCommand, {
          // NO usar cwd aquí - el cd está en el comando mismo
          // Usar shell explícito para asegurar que el PATH se respete
          shell: '/bin/bash',
          timeout: options.timeout || DEFAULT_TIMEOUT,
          env: env,
          maxBuffer: 10 * 1024 * 1024 // 10MB
        })
        
        if (debugLog) {
          console.error(`[DEBUG] ✅ Comando ejecutado exitosamente con exec() (cd en comando, fallback)`)
        }
        
        return { stdout: result.stdout, stderr: result.stderr }
      }
    }
  } catch (error: any) {
    if (debugLog) {
      console.error(`[DEBUG] execFileAsync falló: ${error.message}`)
      console.error(`[DEBUG] Error code: ${error.code}`)
      console.error(`[DEBUG] process.env.HOME: ${process.env.HOME}`)
      console.error(`[DEBUG] process.env.PATH: ${process.env.PATH?.substring(0, 200)}`)
      console.error(`[DEBUG] resolvedBinaryPath: ${resolvedBinaryPath}`)
    }

    // Si execFileAsync falla con ENOENT, limpiar cache y diagnosticar
    if (error.code === 'ENOENT' && foundryBinariesCache) {
      delete foundryBinariesCache[tool]
      
      if (debugLog) {
        console.error(`[DEBUG] ENOENT detectado, cache limpiado. Diagnosticando...`)
      }
      
      // Verificar archivo y entorno
      try {
        const { access, constants, stat } = await import('fs/promises')
        await access(resolvedBinaryPath, constants.F_OK | constants.X_OK)
        const stats = await stat(resolvedBinaryPath)
        
        if (debugLog) {
          console.error(`[DEBUG] Archivo existe y es accesible: ${resolvedBinaryPath}`)
          console.error(`[DEBUG] Tamaño: ${stats.size}, Permisos: ${stats.mode.toString(8)}`)
        }
        
        // Si el archivo existe pero execFileAsync falla, puede ser un problema del entorno
        // Intentar ejecutar directamente el comando con el path completo en el comando
        if (debugLog) {
          console.error(`[DEBUG] Intentando estrategia alternativa: usar 'which' y ejecutar...`)
        }
        
        // Última estrategia: intentar ejecutar con exec() y comando completo (cd incluido)
        try {
          const { exec } = await import('child_process')
          const { promisify } = await import('util')
          const execAsync = promisify(exec)
          
          // Construir comando con cd (sin usar cwd en opciones)
          const escapedCwd = cwd.replace(/'/g, "'\\''")
          const escapedArgs = sanitizedArgs.map(arg => {
            const escaped = arg.replace(/"/g, '\\"').replace(/\$/g, '\\$')
            return `"${escaped}"`
          }).join(' ')
          
          const fullCommand = `cd "${escapedCwd}" && ${resolvedBinaryPath} ${escapedArgs}`
          
          if (debugLog) {
            console.error(`[DEBUG] Intentando exec() con comando completo (cd incluido): ${fullCommand.substring(0, 200)}...`)
          }
          
          // NO usar cwd en opciones - el cd está en el comando mismo
          // Usar shell explícito para asegurar que el PATH se respete
          const result = await execAsync(fullCommand, {
            shell: '/bin/bash',
            timeout: options.timeout || DEFAULT_TIMEOUT,
            env: env,
            maxBuffer: 10 * 1024 * 1024
          })
          
          if (debugLog) {
            console.error(`[DEBUG] ✅ Ejecución con exec() (cd en comando) exitosa`)
          }
          
          return { stdout: result.stdout, stderr: result.stderr }
        } catch (execError: any) {
          if (debugLog) {
            console.error(`[DEBUG] exec() también falla: ${execError.message}`)
          }
          throw new Error(
            `Comando no encontrado: ${tool}. El archivo existe (${resolvedBinaryPath}) pero no se puede ejecutar desde Claude Desktop. ` +
            `execFileAsync falló: ${error.message}. exec() falló: ${execError.message}. ` +
            `Esto indica un problema con el entorno de ejecución de Claude Desktop. ` +
            `HOME: ${process.env.HOME}, PATH: ${process.env.PATH?.substring(0, 100)}...`
          )
        }
      } catch (accessError: any) {
        throw new Error(
          `Comando no encontrado: ${tool}. El archivo no es accesible en: ${resolvedBinaryPath}. Error: ${accessError.message}`
        )
      }
    }
    
    // Para otros errores, lanzar el error original
    throw error
  }
}

/**
 * Verifica si un proceso está corriendo
 */
export async function isProcessRunning(processName: string): Promise<boolean> {
  try {
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)
    
    const { stdout } = await execAsync(`pgrep -f "${processName}"`)
    return stdout.trim().length > 0
  } catch {
    return false
  }
}

/**
 * Obtiene el PID de un proceso anvil si está corriendo
 */
export async function getAnvilPid(): Promise<number | null> {
  try {
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)
    
    const { stdout } = await execAsync('pgrep -f "anvil.*8545"')
    const pid = parseInt(stdout.trim())
    return isNaN(pid) ? null : pid
  } catch {
    return null
  }
}

