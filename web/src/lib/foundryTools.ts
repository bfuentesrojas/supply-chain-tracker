/**
 * Utilidades compartidas para ejecución segura de comandos Foundry
 */

import { execFile, exec, spawn } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'

const execFileAsync = promisify(execFile)
const execAsync = promisify(exec)

// Directorio raíz del proyecto (donde está sc/)
const PROJECT_ROOT = join(process.cwd(), '..')
const SC_DIR = join(PROJECT_ROOT, 'sc')

// Cache para rutas de binarios de Foundry
let foundryBinariesCache: {
  forge?: string
  anvil?: string
  cast?: string
} | null = null

/**
 * Encuentra la ruta absoluta de un binario de Foundry
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
    // Intentar encontrar usando 'which'
    const { stdout } = await execAsync(`which ${tool}`, {
      env: { ...process.env, PATH: `${process.env.HOME}/.foundry/bin:${process.env.PATH || ''}` }
    })
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
  const commonPaths = [
    join(process.env.HOME || '', '.foundry', 'bin', tool),
    join(process.env.HOME || '', '.local', 'bin', tool),
    `/usr/local/bin/${tool}`,
    `/usr/bin/${tool}`,
    join(process.env.HOME || '', '.cargo', 'bin', tool),
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
      
      await execFileAsync(path, ['--version'], { 
        timeout: 3000,
        env: { ...process.env, PATH: `${process.env.HOME}/.foundry/bin:${process.env.PATH || ''}` }
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

// Allowlist de comandos permitidos
const ALLOWED_COMMANDS = {
  forge: ['build', 'test', 'script'],
  anvil: ['start', 'stop'], // start/stop se manejan en endpoints específicos
  cast: ['call', 'send', 'balance', 'block-number']
} as const

// Timeout por defecto (30 segundos)
const DEFAULT_TIMEOUT = 30000

/**
 * Sanitiza argumentos de comandos para prevenir inyección
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
 * Valida que un comando esté en la allowlist
 */
export function validateCommand(tool: 'forge' | 'anvil' | 'cast', subcommand: string): boolean {
  const allowed = ALLOWED_COMMANDS[tool]
  if (!allowed) return false
  
  // Type assertion seguro porque ya validamos que tool es válido
  return (allowed as readonly string[]).includes(subcommand)
}

/**
 * Ejecuta un comando Foundry de forma segura
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
  
  // Directorio de trabajo (por defecto sc/)
  const cwd = options.cwd || SC_DIR
  
  // Encontrar ruta absoluta del binario
  const binaryPath = await findFoundryBinary(tool)

  // Configurar PATH para incluir directorios comunes de Foundry
  const foundryBinDir = binaryPath.includes('/') 
    ? binaryPath.substring(0, binaryPath.lastIndexOf('/'))
    : null
  
  // Asegurar que el PATH incluya .foundry/bin incluso si binaryPath es absoluto
  const foundryPath = process.env.HOME ? `${process.env.HOME}/.foundry/bin` : null
  const pathParts = [foundryBinDir, foundryPath].filter(Boolean) as string[]
  const existingPath = process.env.PATH || ''
  
  const env = {
    ...process.env,
    ...options.env,
    PATH: pathParts.length > 0 
      ? `${pathParts.join(':')}:${existingPath}`
      : existingPath
  }

  // Logging detallado para debugging (siempre loggear a stderr para MCP)
  const debugLog = process.env.DEBUG_FOUNDRY === 'true' || process.env.NODE_ENV === 'development'
  
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

  try {
    // IMPORTANTE: Usar el mismo entorno que health_check (mismo env con PATH)
    // Pero algunos comandos (como forge script/build/test) necesitan cwd para encontrar foundry.toml
    // Por lo tanto, si se especifica cwd, usarlo; si no, intentar sin cwd primero
    const healthCheckEnv = {
      ...process.env,
      PATH: `${process.env.HOME}/.foundry/bin:${process.env.PATH || ''}`
    }
    
    // Si se especifica cwd explícitamente, usarlo directamente (para comandos que lo necesitan)
    // Si no se especifica cwd, intentar sin cwd primero (como health_check)
    if (options.cwd || cwd !== SC_DIR) {
      // cwd explícito o diferente al default - usarlo directamente
      if (debugLog) {
        console.error(`[DEBUG] Usando cwd especificado: ${cwd}`)
      }
      
      const { stdout, stderr } = await execFileAsync(
        resolvedBinaryPath,
        sanitizedArgs,
        {
          cwd,
          timeout: options.timeout || DEFAULT_TIMEOUT,
          env: healthCheckEnv,
          maxBuffer: 10 * 1024 * 1024 // 10MB
        }
      )

      if (debugLog) {
        console.error(`[DEBUG] ✅ Comando ejecutado exitosamente con cwd`)
        console.error(`[DEBUG] stdout length: ${stdout.length}, stderr length: ${stderr.length}`)
      }

      return { stdout, stderr }
    } else {
      // Sin cwd explícito - intentar sin cwd primero (como health_check)
      try {
        const { stdout, stderr } = await execFileAsync(
          resolvedBinaryPath,
          sanitizedArgs,
          {
            timeout: options.timeout || DEFAULT_TIMEOUT,
            env: healthCheckEnv,
            maxBuffer: 10 * 1024 * 1024 // 10MB
          }
        )

        if (debugLog) {
          console.error(`[DEBUG] ✅ Comando ejecutado exitosamente sin cwd (como health_check)`)
          console.error(`[DEBUG] stdout length: ${stdout.length}, stderr length: ${stderr.length}`)
        }

        return { stdout, stderr }
      } catch (errorNoCwd: any) {
        // Si falla sin cwd, puede ser porque necesita estar en el directorio del proyecto
        // Intentar con cwd como fallback
        if (errorNoCwd.code === 'ENOENT' || errorNoCwd.message?.includes('No such file') || errorNoCwd.message?.includes('foundry.toml')) {
          if (debugLog) {
            console.error(`[DEBUG] Falló sin cwd (${errorNoCwd.message}), intentando con cwd: ${cwd}`)
          }
          
          const { stdout, stderr } = await execFileAsync(
            resolvedBinaryPath,
            sanitizedArgs,
            {
              cwd,
              timeout: options.timeout || DEFAULT_TIMEOUT,
              env: healthCheckEnv,
              maxBuffer: 10 * 1024 * 1024 // 10MB
            }
          )
          
          if (debugLog) {
            console.error(`[DEBUG] ✅ Comando ejecutado exitosamente con cwd (fallback)`)
          }
          
          return { stdout, stderr }
        }
        throw errorNoCwd
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
        
        // Última estrategia: intentar ejecutar con el comando completo como string
        try {
          const { exec } = await import('child_process')
          const { promisify } = await import('util')
          const execAsync = promisify(exec)
          
          const fullCommand = `${resolvedBinaryPath} ${sanitizedArgs.map(arg => `"${arg.replace(/"/g, '\\"')}"`).join(' ')}`
          
          const result = await execAsync(fullCommand, {
            cwd,
            env: {
              ...process.env,
              PATH: `${process.env.HOME}/.foundry/bin:${process.env.PATH || ''}`
            },
            timeout: options.timeout || DEFAULT_TIMEOUT,
            maxBuffer: 10 * 1024 * 1024
          })
          
          if (debugLog) {
            console.error(`[DEBUG] ✅ Ejecución con exec() exitosa`)
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
