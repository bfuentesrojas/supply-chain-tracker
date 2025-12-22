import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { JsonRpcProvider, Contract, Wallet } from 'ethers'
import { SUPPLY_CHAIN_ABI, CONTRACT_ADDRESS } from '@/contracts/SupplyChain'

// Schema de validación para confirmación usando discriminated union
const confirmRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('change_user_status'),
    params: z.object({
      userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      newStatus: z.number().min(0).max(3) // 0=Pending, 1=Approved, 2=Rejected, 3=Canceled
    }),
    privateKey: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional()
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
    }),
    privateKey: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional()
  }),
  z.object({
    action: z.literal('transfer_token'),
    params: z.object({
      to: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      tokenId: z.number().positive(),
      amount: z.number().positive()
    }),
    privateKey: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional()
  }),
  z.object({
    action: z.literal('accept_transfer'),
    params: z.object({
      transferId: z.number().positive()
    }),
    privateKey: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional()
  }),
  z.object({
    action: z.literal('reject_transfer'),
    params: z.object({
      transferId: z.number().positive()
    }),
    privateKey: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional()
  })
])

// Configuración desde variables de entorno (Next.js lee .env.local desde web/)
const RPC_URL = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545'
const CONTRACT = process.env.CONTRACT || process.env.NEXT_PUBLIC_CONTRACT || CONTRACT_ADDRESS
const PRIVKEY = process.env.PRIVKEY

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = confirmRequestSchema.parse(body)
    
    const { action, params, privateKey } = validated

    // Determinar la clave privada a usar
    const privKey = privateKey || PRIVKEY
    if (!privKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Se requiere una clave privada para firmar transacciones. Configura PRIVKEY en .env o envíala en la solicitud.'
        },
        { status: 400 }
      )
    }

    const provider = new JsonRpcProvider(RPC_URL)
    const wallet = new Wallet(privKey, provider)
    const contract = new Contract(CONTRACT, SUPPLY_CHAIN_ABI, wallet)

    let txHash: string

    switch (action) {
      case 'change_user_status': {
        const tx = await contract.changeStatusUser(params.userAddress, params.newStatus)
        await tx.wait()
        txHash = tx.hash
        break
      }
      case 'create_token': {
        const tx = await contract.createToken(
          params.name,
          params.totalSupply,
          params.features,
          params.tokenType,
          params.parentIds,
          params.parentAmounts,
          params.isRecall
        )
        await tx.wait()
        txHash = tx.hash
        break
      }
      case 'transfer_token': {
        const tx = await contract.transfer(params.to, params.tokenId, params.amount)
        await tx.wait()
        txHash = tx.hash
        break
      }
      case 'accept_transfer': {
        const tx = await contract.acceptTransfer(params.transferId)
        await tx.wait()
        txHash = tx.hash
        break
      }
      case 'reject_transfer': {
        const tx = await contract.rejectTransfer(params.transferId)
        await tx.wait()
        txHash = tx.hash
        break
      }
      default:
        return NextResponse.json(
          {
            success: false,
            error: `Acción desconocida: ${action}`
          },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      txHash,
      message: 'Transacción confirmada y ejecutada exitosamente'
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
        error: error.message || 'Error ejecutando transacción'
      },
      { status: 500 }
    )
  }
}
