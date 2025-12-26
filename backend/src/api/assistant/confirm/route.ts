import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Schema de validación para confirmación usando discriminated union
// Ahora solo valida los datos, la transacción se ejecuta en el frontend con MetaMask
const confirmRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('change_user_status'),
    params: z.object({
      userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      newStatus: z.number().min(0).max(3) // 0=Pending, 1=Approved, 2=Rejected, 3=Canceled
    })
  }),
  z.object({
    action: z.literal('create_token'),
    params: z.object({
      name: z.string().min(1),
      totalSupply: z.number().positive(),
      features: z.string(),
      tokenType: z.number().min(0).max(4),
      parentIds: z.array(z.number()),
      parentAmounts: z.array(z.number()),
      isRecall: z.boolean()
    })
  }),
  z.object({
    action: z.literal('transfer_token'),
    params: z.object({
      to: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      tokenId: z.number().positive(),
      amount: z.number().positive()
    })
  }),
  z.object({
    action: z.literal('accept_transfer'),
    params: z.object({
      transferId: z.number().positive()
    })
  }),
  z.object({
    action: z.literal('reject_transfer'),
    params: z.object({
      transferId: z.number().positive()
    })
  })
])

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = confirmRequestSchema.parse(body)
    
    // Solo validar los datos, la transacción se ejecutará en el frontend con MetaMask
    // Esto asegura que la transacción se firme con la cuenta conectada del usuario
    
    return NextResponse.json({
      success: true,
      action: validated.action,
      params: validated.params,
      message: 'Datos validados correctamente. La transacción se ejecutará con MetaMask.'
    })

  } catch (error: any) {
    console.error('Error en /api/assistant/confirm:', error)
    
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
        error: error.message || 'Error validando datos'
      },
      { status: 500 }
    )
  }
}



