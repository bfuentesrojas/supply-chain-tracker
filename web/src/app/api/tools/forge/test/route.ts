import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { executeFoundryCommand } from '@/lib/foundryTools'

// Schema de validación para test
const testSchema = z.object({
  matchTest: z.string().optional(),
  verbosity: z.number().min(0).max(5).optional().default(2),
  extraArgs: z.array(z.string()).optional().default([])
})

/**
 * POST /api/tools/forge/test
 * Ejecuta tests usando forge test
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = testSchema.parse(body)
    
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
    
    return NextResponse.json({
      success: true,
      command: `forge ${args.join(' ')}`,
      stdout: result.stdout,
      stderr: result.stderr,
      summary: testSummary,
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
        error: error.message || 'Error ejecutando forge test'
      },
      { status: 500 }
    )
  }
}

/**
 * Extrae resumen de tests del output
 */
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



