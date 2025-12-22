import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { executeFoundryCommand } from '@/lib/foundryTools'

// Schema de validación para cast send
const castSendSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Dirección inválida'),
  functionSignature: z.string().optional(),
  value: z.string().optional(),
  privateKey: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Clave privada inválida'),
  rpcUrl: z.string().url().optional().default('http://127.0.0.1:8545'),
  extraArgs: z.array(z.string()).optional().default([])
})

/**
 * POST /api/tools/cast/send
 * Envía una transacción usando cast send
 * 
 * ⚠️ ADVERTENCIA: Este endpoint maneja claves privadas.
 * En producción, considerar usar un keystore o wallet manager más seguro.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = castSendSchema.parse(body)
    
    // Construir argumentos
    const args = [
      'send',
      validated.address,
      '--private-key', validated.privateKey,
      '--rpc-url', validated.rpcUrl
    ]
    
    // Agregar función si se proporciona
    if (validated.functionSignature) {
      args.push(validated.functionSignature)
    }
    
    // Agregar valor si se proporciona
    if (validated.value) {
      args.push('--value', validated.value)
    }
    
    // Agregar argumentos extra (sanitizados)
    if (validated.extraArgs && validated.extraArgs.length > 0) {
      args.push(...validated.extraArgs)
    }
    
    // Ejecutar comando
    const result = await executeFoundryCommand('cast', args, {
      timeout: 60000 // 60 segundos para transacciones
    })
    
    // Intentar extraer hash de transacción
    const txHash = extractTxHash(result.stdout)
    
    return NextResponse.json({
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
        error: error.message || 'Error ejecutando cast send'
      },
      { status: 500 }
    )
  }
}

/**
 * Extrae el hash de transacción del output
 */
function extractTxHash(output: string): string | null {
  // Buscar patrón de hash (0x seguido de 64 caracteres hex)
  const hashMatch = output.match(/0x[a-fA-F0-9]{64}/)
  return hashMatch ? hashMatch[0] : null
}





