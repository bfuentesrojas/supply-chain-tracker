/**
 * Utilidades compartidas para ejecución segura de comandos Foundry
 */

import { execFile } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'

const execFileAsync = promisify(execFile)

// Directorio raíz del proyecto (donde está sc/)
const PROJECT_ROOT = join(process.cwd(), '..')
const SC_DIR = join(PROJECT_ROOT, 'sc')

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
  
  // Ejecutar comando
  try {
    const { stdout, stderr } = await execFileAsync(
      tool,
      sanitizedArgs,
      {
        cwd,
        timeout: options.timeout || DEFAULT_TIMEOUT,
        env: { ...process.env, ...options.env },
        maxBuffer: 10 * 1024 * 1024 // 10MB
      }
    )
    
    return { stdout, stderr }
  } catch (error: any) {
    // Capturar errores de ejecución
    throw new Error(
      error.stderr || error.message || `Error ejecutando ${tool} ${subcommand}`
    )
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



