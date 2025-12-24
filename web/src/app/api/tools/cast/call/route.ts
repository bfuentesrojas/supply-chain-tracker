import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { executeFoundryCommand } from '@/lib/foundryTools'

// Schema de validación para cast call
const castCallSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Dirección inválida'),
  functionSignature: z.string().min(1, 'Firma de función requerida'),
  rpcUrl: z.string().url().optional().default('http://127.0.0.1:8545'),
  extraArgs: z.array(z.string()).optional().default([])
})

/**
 * POST /api/tools/cast/call
 * Ejecuta una llamada a un contrato usando cast call
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = castCallSchema.parse(body)
    
    // Construir argumentos
    const args = [
      'call',
      validated.address,
      validated.functionSignature,
      '--rpc-url', validated.rpcUrl
    ]
    
    // Agregar argumentos extra (sanitizados)
    if (validated.extraArgs && validated.extraArgs.length > 0) {
      args.push(...validated.extraArgs)
    }
    
    // Ejecutar comando
    const result = await executeFoundryCommand('cast', args, {
      timeout: 30000 // 30 segundos
    })
    
    return NextResponse.json({
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
        error: error.message || 'Error ejecutando cast call'
      },
      { status: 500 }
    )
  }
}









