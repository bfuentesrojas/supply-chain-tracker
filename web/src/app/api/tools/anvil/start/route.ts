import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { execFile } from 'child_process'
import { join } from 'path'
import { getAnvilPid, sanitizeArgs } from '@/lib/foundryTools'

const PROJECT_ROOT = join(process.cwd(), '..')
const SC_DIR = join(PROJECT_ROOT, 'sc')

// Schema de validación para start anvil
const anvilStartSchema = z.object({
  host: z.string().optional().default('0.0.0.0'),
  port: z.number().min(1).max(65535).optional().default(8545),
  chainId: z.number().optional(),
  blockTime: z.number().optional(),
  extraArgs: z.array(z.string()).optional().default([])
})

/**
 * POST /api/tools/anvil/start
 * Inicia Anvil en background
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar si ya está corriendo
    const existingPid = await getAnvilPid()
    if (existingPid) {
      return NextResponse.json({
        success: true,
        message: 'Anvil ya está corriendo',
        pid: existingPid,
        port: 8545,
        timestamp: new Date().toISOString()
      })
    }
    
    const body = await request.json()
    const validated = anvilStartSchema.parse(body)
    
    // Construir argumentos
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
    
    const pid = await getAnvilPid()
    
    if (!pid) {
      throw new Error('Anvil no se inició correctamente')
    }
    
    return NextResponse.json({
      success: true,
      message: 'Anvil iniciado correctamente',
      pid,
      port: validated.port,
      host: validated.host,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos de entrada inválidos',
          details: error.errors
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error iniciando Anvil'
      },
      { status: 500 }
    )
  }
}








