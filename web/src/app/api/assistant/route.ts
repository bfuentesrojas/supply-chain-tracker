import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { JsonRpcProvider, Contract } from 'ethers'
import { SUPPLY_CHAIN_ABI, CONTRACT_ADDRESS } from '@/contracts/SupplyChain'

// Schema de validación para la entrada
const assistantRequestSchema = z.object({
  message: z.string().min(1, 'El mensaje no puede estar vacío'),
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Dirección inválida').optional(),
})

// Configuración desde variables de entorno (Next.js lee .env.local desde web/)
const LLM_URL = process.env.LLM_URL || process.env.NEXT_PUBLIC_LLM_URL || 'http://127.0.0.1:11434'
const LLM_MODEL = process.env.LLM_MODEL || process.env.NEXT_PUBLIC_LLM_MODEL || 'llama3.2'
const RPC_URL = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545'
const CONTRACT = process.env.CONTRACT || process.env.NEXT_PUBLIC_CONTRACT || CONTRACT_ADDRESS

// Provider y contrato
const provider = new JsonRpcProvider(RPC_URL)
const contract = new Contract(CONTRACT, SUPPLY_CHAIN_ABI, provider)

// Definición de herramientas (tools) para el LLM
const tools = [
  // ============ TOKENS ============
  {
    type: 'function',
    function: {
      name: 'get_token_status',
      description: 'Obtiene el estado completo de un token por su ID. Incluye: ID, creador, nombre, totalSupply, tipo de token, fecha de creación, estado de recall, IDs de tokens padres, y balance del usuario si se proporciona dirección. Útil para consultas como "estado del token 123", "información del token 456", "¿quién creó el token X?", "¿el token Y está en recall?".',
      parameters: {
        type: 'object',
        properties: {
          tokenId: {
            type: 'number',
            description: 'El ID del token a consultar (número entero positivo)'
          }
        },
        required: ['tokenId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_all_tokens',
      description: 'Obtiene la lista completa de todos los tokens creados en el sistema. Devuelve información completa de cada token (ID, nombre, tipo, creador, supply, recall, etc.). Útil para: "lista de tokens", "todos los tokens", "cuántos tokens hay", "tokens en recall", "buscar token por nombre", "tokens de tipo X", etc. Esta herramienta devuelve TODOS los tokens y debes filtrar los resultados según los criterios solicitados.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_user_tokens',
      description: 'Obtiene la lista de IDs de tokens que pertenecen a un usuario específico (tokens que el usuario ha creado o recibido). Útil para: "tokens del usuario 0x...", "productos de la dirección 0x...", "qué tokens tiene el usuario X".',
      parameters: {
        type: 'object',
        properties: {
          address: {
            type: 'string',
            description: 'Dirección Ethereum del usuario (formato 0x...)'
          }
        },
        required: ['address']
      }
    }
  },
  
  // ============ USUARIOS ============
  {
    type: 'function',
    function: {
      name: 'get_user_info',
      description: 'Obtiene la información completa de un usuario por su dirección, incluyendo ID, rol, estado (Pending/Approved/Rejected/Canceled), y si es admin. Útil para consultas como "información del usuario 0x...", "rol de la dirección 0x...", "¿cuál es el estado del usuario 0x...?", "¿es admin el usuario 0x...?".',
      parameters: {
        type: 'object',
        properties: {
          address: {
            type: 'string',
            description: 'Dirección Ethereum del usuario (formato 0x...)'
          }
        },
        required: ['address']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_all_users',
      description: 'Obtiene la lista completa de todos los usuarios registrados en el sistema con sus datos completos (ID, dirección, rol, estado). Útil para: "lista de usuarios", "usuarios del sistema", "cuántos usuarios hay", "buscar usuario con rol X", "primer usuario con rol fabricante", "usuarios aprobados", "usuarios con rol manufacturer", etc. Esta herramienta devuelve TODOS los usuarios con sus roles y estados, y debes filtrar los resultados para encontrar usuarios con características específicas.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  
  // ============ TRANSFERENCIAS ============
  {
    type: 'function',
    function: {
      name: 'get_transfer_info',
      description: 'Obtiene la información completa de una transferencia por su ID. Incluye: ID, remitente (from), destinatario (to), tokenId, cantidad (amount), fecha de creación, y estado (Pending/Accepted/Rejected). Útil para consultas como "estado de la transferencia 123", "información de transferencia 456", "¿quién envió la transferencia X?", "transferencia entre usuarios".',
      parameters: {
        type: 'object',
        properties: {
          transferId: {
            type: 'number',
            description: 'El ID de la transferencia a consultar (número entero positivo)'
          }
        },
        required: ['transferId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_all_transfers',
      description: 'Obtiene la lista completa de todas las transferencias en el sistema. Devuelve información completa de cada transferencia (ID, remitente, destinatario, token, cantidad, estado). Útil para: "lista de transferencias", "todas las transferencias", "cuántas transferencias hay", "transferencias pendientes", "transferencias del token X", "transferencias entre usuarios", etc. Esta herramienta devuelve TODAS las transferencias y debes filtrar según los criterios solicitados.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_user_transfers',
      description: 'Obtiene la lista de IDs de transferencias relacionadas con un usuario específico (tanto transferencias enviadas como recibidas). Útil para: "transferencias del usuario 0x...", "movimientos de la dirección 0x...", "historial de transferencias del usuario X".',
      parameters: {
        type: 'object',
        properties: {
          address: {
            type: 'string',
            description: 'Dirección Ethereum del usuario (formato 0x...)'
          }
        },
        required: ['address']
      }
    }
  },
  
  // ============ ESTADÍSTICAS DEL SISTEMA ============
  {
    type: 'function',
    function: {
      name: 'get_system_stats',
      description: 'Obtiene estadísticas generales del sistema: número total de tokens, usuarios, y transferencias. Útil para consultas como "estadísticas del sistema", "cuántos tokens hay", "cuántos usuarios hay", "cuántas transferencias hay", "resumen del sistema", "estado general de la aplicación".',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  
  // ============ ACCIONES (REQUIEREN CONFIRMACIÓN) ============
  {
    type: 'function',
    function: {
      name: 'change_user_status',
      description: 'Cambia el estado de un usuario (solo admin). Estados: 0=Pending, 1=Approved, 2=Rejected, 3=Canceled. Requiere confirmación del usuario y firma de transacción. Útil para: "aprobar usuario 0x...", "aprobar solicitud de este usuario", "rechazar usuario 0x...", "cambiar estado del usuario X", "aprobar la solicitud", "rechazar la solicitud". IMPORTANTE: Si el usuario dice "aprobar solicitud" o "aprobar este usuario", debes usar newStatus=1 (Approved). Si dice "rechazar", usa newStatus=2 (Rejected).',
      parameters: {
        type: 'object',
        properties: {
          userAddress: {
            type: 'string',
            description: 'Dirección Ethereum del usuario a modificar (formato 0x...). Si el usuario menciona "este usuario" o "este", debes usar la dirección del usuario mencionado anteriormente en la conversación.'
          },
          newStatus: {
            type: 'number',
            description: 'Nuevo estado: 0=Pending, 1=Approved (para aprobar), 2=Rejected (para rechazar), 3=Canceled',
            enum: [0, 1, 2, 3]
          }
        },
        required: ['userAddress', 'newStatus']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_token',
      description: 'Crea un nuevo token en el sistema. Requiere confirmación del usuario y firma de transacción. Útil para: "crear token", "crear materia prima", "crear receta", "crear lote", "crear producto". Tipos de token: 0=API_MP (materia prima), 1=BOM (receta), 2=PT_LOTE (lote), 3=SSCC (unidad lógica), 4=COMPLIANCE_LOG (evidencia). Si el token tiene padres (parentIds), también debes proporcionar parentAmounts con la misma cantidad de elementos.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nombre del token'
          },
          totalSupply: {
            type: 'number',
            description: 'Cantidad total del token (debe ser mayor a 0)'
          },
          features: {
            type: 'string',
            description: 'Características del token en formato JSON (puede ser "{}" si no hay características)'
          },
          tokenType: {
            type: 'number',
            description: 'Tipo de token: 0=API_MP, 1=BOM, 2=PT_LOTE, 3=SSCC, 4=COMPLIANCE_LOG',
            enum: [0, 1, 2, 3, 4]
          },
          parentIds: {
            type: 'array',
            items: { type: 'number' },
            description: 'IDs de los tokens padres (array vacío [] si no tiene padres, ej: API_MP no tiene padres)'
          },
          parentAmounts: {
            type: 'array',
            items: { type: 'number' },
            description: 'Cantidades de cada token padre (debe tener la misma longitud que parentIds, array vacío [] si no tiene padres)'
          },
          isRecall: {
            type: 'boolean',
            description: 'Si es true, marca el token como recall (solo válido para COMPLIANCE_LOG tipo 4)'
          }
        },
        required: ['name', 'totalSupply', 'features', 'tokenType', 'parentIds', 'parentAmounts', 'isRecall']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'transfer_token',
      description: 'Crea una solicitud de transferencia de tokens a otro usuario. Requiere confirmación del usuario y firma de transacción. Útil para: "transferir token", "enviar token a usuario", "transferir X cantidad del token Y al usuario Z". El destinatario debe estar aprobado. La transferencia queda pendiente hasta que el destinatario la acepte.',
      parameters: {
        type: 'object',
        properties: {
          to: {
            type: 'string',
            description: 'Dirección Ethereum del destinatario (formato 0x...). Si el usuario menciona "este usuario" o "al usuario mencionado", usa la dirección del contexto previo.'
          },
          tokenId: {
            type: 'number',
            description: 'ID del token a transferir'
          },
          amount: {
            type: 'number',
            description: 'Cantidad a transferir (debe ser mayor a 0 y no exceder el balance disponible)'
          }
        },
        required: ['to', 'tokenId', 'amount']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'accept_transfer',
      description: 'Acepta una transferencia pendiente. Requiere confirmación del usuario y firma de transacción. Útil para: "aceptar transferencia", "aceptar la transferencia X", "aceptar esta transferencia". Solo el destinatario puede aceptar una transferencia.',
      parameters: {
        type: 'object',
        properties: {
          transferId: {
            type: 'number',
            description: 'ID de la transferencia a aceptar'
          }
        },
        required: ['transferId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'reject_transfer',
      description: 'Rechaza una transferencia pendiente. Requiere confirmación del usuario y firma de transacción. Útil para: "rechazar transferencia", "rechazar la transferencia X", "rechazar esta transferencia". Solo el destinatario puede rechazar una transferencia.',
      parameters: {
        type: 'object',
        properties: {
          transferId: {
            type: 'number',
            description: 'ID de la transferencia a rechazar'
          }
        },
        required: ['transferId']
      }
    }
  }
]

// Función para ejecutar herramientas
async function executeTool(toolName: string, args: any): Promise<any> {
  try {
    switch (toolName) {
      case 'get_token_status': {
        const tokenId = BigInt(args.tokenId)
        const token = await contract.getToken(tokenId)
        
        // Obtener balance si hay userAddress
        let balance = null
        if (args.userAddress) {
          try {
            balance = await contract.getTokenBalance(tokenId, args.userAddress)
          } catch {
            // Ignorar error de balance
          }
        }
        
        return {
          success: true,
          data: {
            id: token.id.toString(),
            creator: token.creator,
            name: token.name,
            totalSupply: token.totalSupply.toString(),
            tokenType: Number(token.tokenType),
            dateCreated: new Date(Number(token.dateCreated) * 1000).toISOString(),
            recall: token.recall,
            balance: balance ? balance.toString() : null,
            parentIds: token.parentIds.map((p: bigint) => p.toString()),
            parentAmounts: token.parentAmounts.map((p: bigint) => p.toString())
          }
        }
      }
      
      case 'get_user_info': {
        const address = args.address
        try {
          // Verificar primero si el usuario existe
          const userId = await contract.addressToUserId(address)
          if (!userId || userId === BigInt(0)) {
            return {
              success: false,
              error: 'Usuario no encontrado. Esta dirección no está registrada en el sistema.'
            }
          }
          
          const user = await contract.getUserInfo(address)
          
          // Verificar si es admin
          let isAdmin = false
          try {
            const adminAddress = await contract.admin()
            isAdmin = address.toLowerCase() === adminAddress.toLowerCase()
          } catch (err) {
            // Si falla obtener admin, asumir que no es admin
            console.error('Error verificando admin:', err)
          }
          
          // Convertir estado numérico a texto descriptivo
          const statusNumber = Number(user.status)
          const statusLabels: Record<number, string> = {
            0: 'Pending',
            1: 'Approved',
            2: 'Rejected',
            3: 'Canceled'
          }
          const statusText = statusLabels[statusNumber] || `Unknown (${statusNumber})`
          
          return {
            success: true,
            data: {
              id: user.id.toString(),
              address: user.userAddress,
              role: user.role,
              status: statusNumber,
              statusText: statusText,
              statusDescription: statusNumber === 0 ? 'Pendiente de aprobación' : 
                                 statusNumber === 1 ? 'Aprobado' : 
                                 statusNumber === 2 ? 'Rechazado' : 'Cancelado',
              isAdmin
            }
          }
        } catch (err: any) {
          return {
            success: false,
            error: err.message || 'Error obteniendo información del usuario'
          }
        }
      }
      
      case 'list_all_users': {
        try {
          // Obtener el número total de usuarios usando getTotalUsers()
          const totalUsers = await contract.getTotalUsers()
          const totalUsersNum = Number(totalUsers)
          
          console.log(`[API Assistant] Total usuarios: ${totalUsersNum}`)
          
          if (totalUsersNum === 0) {
            return {
              success: true,
              data: {
                total: 0,
                users: []
              }
            }
          }

          // Obtener información del admin para verificar
          let adminAddress = ''
          try {
            adminAddress = await contract.admin()
            console.log(`[API Assistant] Admin address: ${adminAddress}`)
          } catch (err: any) {
            console.error('[API Assistant] Error obteniendo admin:', err.message)
          }

          // Iterar sobre todos los usuarios (los IDs empiezan en 1)
          const usersList = []
          for (let i = 1; i <= totalUsersNum; i++) {
            try {
              const user = await contract.users(BigInt(i))
              
              // Verificar si es admin
              let isAdmin = false
              if (adminAddress && user.userAddress.toLowerCase() === adminAddress.toLowerCase()) {
                isAdmin = true
              }
              
              // Convertir estado numérico a texto descriptivo
              const statusNumber = Number(user.status)
              const statusLabels: Record<number, string> = {
                0: 'Pending',
                1: 'Approved',
                2: 'Rejected',
                3: 'Canceled'
              }
              const statusText = statusLabels[statusNumber] || `Unknown (${statusNumber})`
              
              usersList.push({
                id: user.id.toString(),
                address: user.userAddress,
                role: user.role,
                status: statusNumber,
                statusText: statusText,
                statusDescription: statusNumber === 0 ? 'Pendiente de aprobación' : 
                                   statusNumber === 1 ? 'Aprobado' : 
                                   statusNumber === 2 ? 'Rechazado' : 'Cancelado',
                isAdmin
              })
              
              console.log(`[API Assistant] Usuario ${i}: ${user.userAddress} - ${user.role} - Status: ${user.status}`)
            } catch (err: any) {
              // Si falla obtener un usuario, continuar con el siguiente
              console.error(`[API Assistant] Error obteniendo usuario ${i}:`, err.message)
            }
          }

          console.log(`[API Assistant] Total usuarios obtenidos: ${usersList.length}`)

          return {
            success: true,
            data: {
              total: usersList.length,
              users: usersList
            }
          }
        } catch (err: any) {
          console.error('[API Assistant] Error en list_all_users:', err)
          return {
            success: false,
            error: err.message || 'Error obteniendo lista de usuarios',
            details: err.stack || 'Sin detalles adicionales'
          }
        }
      }
      
      case 'list_all_tokens': {
        try {
          const nextTokenIdValue = await contract.nextTokenId()
          const totalTokensNum = Number(nextTokenIdValue)
          
          console.log(`[API Assistant] Total tokens: ${totalTokensNum}`)
          
          if (totalTokensNum === 0) {
            return {
              success: true,
              data: {
                total: 0,
                tokens: []
              }
            }
          }

          const tokensList = []
          for (let i = 1; i < totalTokensNum; i++) {
            try {
              const token = await contract.getToken(BigInt(i))
              
              const tokenTypeLabels: Record<number, string> = {
                0: 'API_MP',
                1: 'BOM',
                2: 'PT_LOTE',
                3: 'SSCC',
                4: 'COMPLIANCE_LOG'
              }
              const tokenTypeText = tokenTypeLabels[Number(token.tokenType)] || `Unknown (${token.tokenType})`
              
              tokensList.push({
                id: token.id.toString(),
                creator: token.creator,
                name: token.name,
                totalSupply: token.totalSupply.toString(),
                tokenType: Number(token.tokenType),
                tokenTypeText: tokenTypeText,
                dateCreated: new Date(Number(token.dateCreated) * 1000).toISOString(),
                recall: token.recall,
                parentIds: token.parentIds.map((p: bigint) => p.toString()),
                parentAmounts: token.parentAmounts.map((p: bigint) => p.toString())
              })
            } catch (err: any) {
              console.error(`[API Assistant] Error obteniendo token ${i}:`, err.message)
            }
          }

          return {
            success: true,
            data: {
              total: tokensList.length,
              tokens: tokensList
            }
          }
        } catch (err: any) {
          console.error('[API Assistant] Error en list_all_tokens:', err)
          return {
            success: false,
            error: err.message || 'Error obteniendo lista de tokens'
          }
        }
      }
      
      case 'get_user_tokens': {
        try {
          const address = args.address
          const tokenIds = await contract.getUserTokens(address)
          
          return {
            success: true,
            data: {
              address: address,
              tokenIds: tokenIds.map((id: bigint) => id.toString()),
              count: tokenIds.length
            }
          }
        } catch (err: any) {
          return {
            success: false,
            error: err.message || 'Error obteniendo tokens del usuario'
          }
        }
      }
      
      case 'get_transfer_info': {
        try {
          const transferId = BigInt(args.transferId)
          const transfer = await contract.getTransfer(transferId)
          
          const statusLabels: Record<number, string> = {
            0: 'Pending',
            1: 'Accepted',
            2: 'Rejected'
          }
          const statusText = statusLabels[Number(transfer.status)] || `Unknown (${transfer.status})`
          
          return {
            success: true,
            data: {
              id: transfer.id.toString(),
              from: transfer.from,
              to: transfer.to,
              tokenId: transfer.tokenId.toString(),
              amount: transfer.amount.toString(),
              dateCreated: new Date(Number(transfer.dateCreated) * 1000).toISOString(),
              status: Number(transfer.status),
              statusText: statusText,
              statusDescription: Number(transfer.status) === 0 ? 'Pendiente' : 
                                 Number(transfer.status) === 1 ? 'Aceptada' : 'Rechazada'
            }
          }
        } catch (err: any) {
          return {
            success: false,
            error: err.message || 'Error obteniendo información de la transferencia'
          }
        }
      }
      
      case 'list_all_transfers': {
        try {
          const nextTransferIdValue = await contract.nextTransferId()
          const totalTransfersNum = Number(nextTransferIdValue)
          
          console.log(`[API Assistant] Total transferencias: ${totalTransfersNum}`)
          
          if (totalTransfersNum === 0) {
            return {
              success: true,
              data: {
                total: 0,
                transfers: []
              }
            }
          }

          const transfersList = []
          for (let i = 1; i < totalTransfersNum; i++) {
            try {
              const transfer = await contract.getTransfer(BigInt(i))
              
              const statusLabels: Record<number, string> = {
                0: 'Pending',
                1: 'Accepted',
                2: 'Rejected'
              }
              const statusText = statusLabels[Number(transfer.status)] || `Unknown (${transfer.status})`
              
              transfersList.push({
                id: transfer.id.toString(),
                from: transfer.from,
                to: transfer.to,
                tokenId: transfer.tokenId.toString(),
                amount: transfer.amount.toString(),
                dateCreated: new Date(Number(transfer.dateCreated) * 1000).toISOString(),
                status: Number(transfer.status),
                statusText: statusText,
                statusDescription: Number(transfer.status) === 0 ? 'Pendiente' : 
                                   Number(transfer.status) === 1 ? 'Aceptada' : 'Rechazada'
              })
            } catch (err: any) {
              console.error(`[API Assistant] Error obteniendo transferencia ${i}:`, err.message)
            }
          }

          return {
            success: true,
            data: {
              total: transfersList.length,
              transfers: transfersList
            }
          }
        } catch (err: any) {
          console.error('[API Assistant] Error en list_all_transfers:', err)
          return {
            success: false,
            error: err.message || 'Error obteniendo lista de transferencias'
          }
        }
      }
      
      case 'get_user_transfers': {
        try {
          const address = args.address
          const transferIds = await contract.getUserTransfers(address)
          
          return {
            success: true,
            data: {
              address: address,
              transferIds: transferIds.map((id: bigint) => id.toString()),
              count: transferIds.length
            }
          }
        } catch (err: any) {
          return {
            success: false,
            error: err.message || 'Error obteniendo transferencias del usuario'
          }
        }
      }
      
      case 'get_system_stats': {
        try {
          const [totalTokens, totalUsers, totalTransfers] = await Promise.all([
            contract.nextTokenId().then((v: bigint) => Number(v) - 1), // nextTokenId - 1
            contract.getTotalUsers().then((v: bigint) => Number(v)),
            contract.nextTransferId().then((v: bigint) => Number(v) - 1) // nextTransferId - 1
          ])
          
          return {
            success: true,
            data: {
              totalTokens: totalTokens,
              totalUsers: totalUsers,
              totalTransfers: totalTransfers
            }
          }
        } catch (err: any) {
          return {
            success: false,
            error: err.message || 'Error obteniendo estadísticas del sistema'
          }
        }
      }
      
      case 'change_user_status': {
        // Esta función requiere firma, así que solo devolvemos que requiere confirmación
        return {
          success: false,
          requiresConfirmation: true,
          action: 'change_user_status',
          params: {
            userAddress: args.userAddress,
            newStatus: args.newStatus
          },
          message: 'Esta operación requiere confirmación y firma de transacción.'
        }
      }
      
      case 'create_token': {
        // Esta función requiere firma, así que solo devolvemos que requiere confirmación
        return {
          success: false,
          requiresConfirmation: true,
          action: 'create_token',
          params: {
            name: args.name,
            totalSupply: args.totalSupply,
            features: args.features,
            tokenType: args.tokenType,
            parentIds: args.parentIds || [],
            parentAmounts: args.parentAmounts || [],
            isRecall: args.isRecall || false
          },
          message: 'Esta operación requiere confirmación y firma de transacción.'
        }
      }
      
      case 'transfer_token': {
        // Esta función requiere firma, así que solo devolvemos que requiere confirmación
        return {
          success: false,
          requiresConfirmation: true,
          action: 'transfer_token',
          params: {
            to: args.to,
            tokenId: args.tokenId,
            amount: args.amount
          },
          message: 'Esta operación requiere confirmación y firma de transacción.'
        }
      }
      
      case 'accept_transfer': {
        // Esta función requiere firma, así que solo devolvemos que requiere confirmación
        return {
          success: false,
          requiresConfirmation: true,
          action: 'accept_transfer',
          params: {
            transferId: args.transferId
          },
          message: 'Esta operación requiere confirmación y firma de transacción.'
        }
      }
      
      case 'reject_transfer': {
        // Esta función requiere firma, así que solo devolvemos que requiere confirmación
        return {
          success: false,
          requiresConfirmation: true,
          action: 'reject_transfer',
          params: {
            transferId: args.transferId
          },
          message: 'Esta operación requiere confirmación y firma de transacción.'
        }
      }
      
      default:
        return {
          success: false,
          error: `Herramienta desconocida: ${toolName}`
        }
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Error ejecutando herramienta'
    }
  }
}

// Función para llamar a Ollama
async function callOllama(messages: any[], tools: any[]): Promise<any> {
  try {
    // Crear un AbortController para timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 segundos timeout

    const response = await fetch(`${LLM_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages,
        tools,
        tool_choice: 'auto',
        stream: false
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Error llamando a Ollama: ${response.status} - ${errorText}`)
    }

    return response.json()
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('La solicitud a Ollama excedió el tiempo de espera (60 segundos). Verifica que Ollama esté corriendo.')
    }
    if (error.message?.includes('fetch failed') || error.message?.includes('ECONNREFUSED')) {
      throw new Error(`No se pudo conectar con Ollama en ${LLM_URL}. Verifica que Ollama esté corriendo y accesible.`)
    }
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = assistantRequestSchema.parse(body)
    
    const { message, userAddress } = validated

    // Verificar que Ollama esté disponible (opcional, no bloquea si falla)
    try {
      const healthCheck = await fetch(`${LLM_URL}/api/tags`, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 segundos para health check
      })
      if (!healthCheck.ok) {
        console.warn(`[API Assistant] Ollama health check failed: ${healthCheck.status}`)
      }
    } catch (healthError) {
      console.warn(`[API Assistant] Ollama no está disponible en ${LLM_URL}:`, healthError)
      // No lanzamos error aquí, dejamos que falle en callOllama con mejor mensaje
    }

    // Construir mensajes para el LLM
    const messages = [
      {
        role: 'system',
        content: `Eres un asistente de IA experto para un sistema de cadena de suministro farmacéutica basado en blockchain.

## 📋 ACERCA DEL SISTEMA

Este es un sistema de trazabilidad farmacéutica que rastrea productos desde materias primas hasta el consumidor final usando tokens NFT en blockchain.

### 🎯 FUNCIONALIDADES PRINCIPALES
- Gestión de usuarios con roles y estados
- Creación y rastreo de tokens (productos) con jerarquía padre-hijo
- Transferencias entre usuarios con aprobación
- Sistema de recall (retiro de productos) que marca toda la cadena relacionada
- Trazabilidad completa de la cadena de suministro

## 👥 USUARIOS Y ROLES

### Estados de Usuario:
- 0 / Pending: Pendiente de aprobación por el admin
- 1 / Approved: Aprobado, puede usar todas las funcionalidades del sistema
- 2 / Rejected: Rechazado, no puede usar el sistema
- 3 / Canceled: Cancelado, cuenta desactivada

### Roles Comunes:
- admin: Administrador del sistema (puede aprobar/rechazar usuarios, crear cualquier token, etc.)
- manufacturer / fabricante: Fabricante de productos
- distributor / distribuidor: Distribuidor de productos
- retailer / minorista: Vendedor minorista
- consumer / consumidor: Consumidor final

## 🏷️ TIPOS DE TOKENS Y JERARQUÍA

El sistema usa una jerarquía de tokens que representa la cadena de suministro:

1. **API_MP (0)**: Materia Prima / API (Active Pharmaceutical Ingredient)
   - Nivel más bajo, no tiene padres
   - Creado por fabricantes

2. **BOM (1)**: Receta / Bill of Materials
   - Tiene materias primas (API_MP) como padres
   - Define la composición de un producto
   - Creado por fabricantes

3. **PT_LOTE (2)**: Producto Terminado - Lote
   - Tiene una receta (BOM) como padre
   - Al crearse, consume automáticamente las materias primas según la receta
   - Creado por fabricantes

4. **SSCC (3)**: Unidad Lógica / Serialized Shipping Container Code
   - Tiene un lote (PT_LOTE) como padre
   - Representa unidades individuales de producto
   - Creado por fabricantes o distribuidores

5. **COMPLIANCE_LOG (4)**: Evidencia de Cumplimiento
   - Puede ser TempLog, CAPA, o Recall
   - Si es Recall (isRecall=true), marca toda la cadena relacionada como retirada
   - Tiene un token padre relacionado

### Reglas de Jerarquía:
- API_MP: Sin padres
- BOM: Debe tener al menos un padre API_MP
- PT_LOTE: Debe tener exactamente 1 padre (BOM)
- SSCC: Debe tener exactamente 1 padre (PT_LOTE)
- COMPLIANCE_LOG: Puede tener un padre relacionado

### Sistema de Recall:
- Cuando se crea un COMPLIANCE_LOG con isRecall=true, marca recursivamente:
  - Todos los tokens padres (hacia arriba)
  - Todos los tokens hijos (hacia abajo)
- Los tokens en recall no pueden usarse para crear nuevos tokens

## 🔄 TRANSFERENCIAS

### Estados de Transferencia:
- 0 / Pending: Pendiente de aceptación por el destinatario
- 1 / Accepted: Aceptada y completada
- 2 / Rejected: Rechazada por el destinatario

### Proceso de Transferencia:
1. Usuario A solicita transferir tokens a Usuario B
2. Se crea una transferencia con estado Pending
3. Usuario B puede aceptar o rechazar
4. Si acepta, los tokens se transfieren y el estado cambia a Accepted

## 🛠️ HERRAMIENTAS DISPONIBLES

### CONSULTA DE TOKENS:
- get_token_status: Obtiene información completa de un token por ID
- list_all_tokens: Obtiene todos los tokens del sistema (debes filtrar según criterios)
- get_user_tokens: Obtiene los IDs de tokens de un usuario específico

### CONSULTA DE USUARIOS:
- get_user_info: Obtiene información completa de un usuario por dirección
- list_all_users: Obtiene todos los usuarios del sistema (debes filtrar según criterios)

### CONSULTA DE TRANSFERENCIAS:
- get_transfer_info: Obtiene información completa de una transferencia por ID
- list_all_transfers: Obtiene todas las transferencias del sistema (debes filtrar según criterios)
- get_user_transfers: Obtiene los IDs de transferencias de un usuario específico

### ESTADÍSTICAS:
- get_system_stats: Obtiene estadísticas generales (total tokens, usuarios, transferencias)

### ACCIONES (REQUIEREN CONFIRMACIÓN):
- change_user_status: Cambia el estado de un usuario (solo admin). Para aprobar: newStatus=1, para rechazar: newStatus=2
- create_token: Crea un nuevo token. Tipos: 0=API_MP, 1=BOM, 2=PT_LOTE, 3=SSCC, 4=COMPLIANCE_LOG
- transfer_token: Crea una solicitud de transferencia de tokens a otro usuario
- accept_transfer: Acepta una transferencia pendiente (solo el destinatario)
- reject_transfer: Rechaza una transferencia pendiente (solo el destinatario)

## 📝 INSTRUCCIONES DE USO

### Ejecución de Acciones sobre el Contrato:
- Puedes ejecutar acciones sobre el contrato usando las herramientas de ACCIONES
- Todas las acciones requieren confirmación del usuario y firma de transacción

#### Cambiar Estado de Usuario:
- Cuando el usuario solicite cambiar estado de usuario (ej: "aprobar solicitud", "rechazar usuario"), debes:
  1. Identificar la dirección del usuario objetivo:
     - Si menciona una dirección específica (0x...), úsala directamente
     - Si dice "este usuario", "este", "la solicitud de este usuario", usa la dirección del usuario mencionado anteriormente en la conversación
     - Si NO hay contexto previo y dice "aprobar solicitud" o similar sin especificar usuario:
       * Primero usa list_all_users para obtener todos los usuarios
       * Filtra por status === 0 o statusText === "Pending" (usuarios pendientes)
       * Si hay solo uno pendiente, usa su dirección
       * Si hay varios, pregunta al usuario cuál quiere aprobar o usa el primero encontrado
       * Si no hay usuarios pendientes, informa al usuario
  2. Determinar el nuevo estado según la acción solicitada:
     - "aprobar" / "aprobar solicitud" / "aceptar" / "aprobar la solicitud" → newStatus = 1 (Approved)
     - "rechazar" / "rechazar solicitud" / "denegar" → newStatus = 2 (Rejected)
     - "cancelar" → newStatus = 3 (Canceled)
     - "poner pendiente" → newStatus = 0 (Pending)
  3. Usar la herramienta change_user_status con userAddress y newStatus

#### Crear Token:
- Cuando el usuario solicite crear un token (ej: "crear materia prima", "crear receta", "crear lote"), debes:
  1. Identificar el tipo de token según la solicitud:
     - "materia prima" / "API" / "API_MP" → tokenType = 0, parentIds = [], parentAmounts = []
     - "receta" / "BOM" / "composición" → tokenType = 1, necesita parentIds (materias primas)
     - "lote" / "PT_LOTE" → tokenType = 2, necesita 1 parentId (receta)
     - "unidad lógica" / "SSCC" → tokenType = 3, necesita 1 parentId (lote)
     - "evidencia" / "compliance" / "recall" → tokenType = 4, puede tener parentId relacionado
  2. Si el token necesita padres, identifica los parentIds y parentAmounts:
     - Para BOM: necesita IDs de materias primas (API_MP) y cantidades de cada una
     - Para PT_LOTE: necesita 1 ID de receta (BOM) y 1 cantidad
     - Para SSCC: necesita 1 ID de lote (PT_LOTE) y 1 cantidad
  3. Pregunta al usuario si falta información (nombre, cantidad, características, padres, etc.)
  4. Usa create_token con todos los parámetros requeridos
- Ejemplos:
  * "Crear materia prima llamada Paracetamol con cantidad 1000" → tokenType=0, name="Paracetamol", totalSupply=1000, parentIds=[], parentAmounts=[], features="{}"
  * "Crear receta usando las materias primas 1 y 2" → tokenType=1, necesitas preguntar cantidades de cada materia prima

#### Transferir Token:
- Cuando el usuario solicite transferir tokens (ej: "transferir token", "enviar token a usuario"), debes:
  1. Identificar el destinatario:
     - Si menciona una dirección (0x...), úsala directamente
     - Si dice "este usuario" o "al usuario mencionado", usa la dirección del contexto
     - Si menciona un rol o nombre, primero busca el usuario usando list_all_users
  2. Identificar el token a transferir:
     - Si menciona un ID específico, úsalo
     - Si dice "este token" o "el token mencionado", usa el ID del contexto
  3. Identificar la cantidad:
     - Si menciona una cantidad específica, úsala
     - Si no menciona, pregunta al usuario
  4. Verifica que el usuario tenga balance suficiente (opcional, pero recomendado)
  5. Usa transfer_token con to, tokenId y amount

#### Aceptar/Rechazar Transferencia:
- Cuando el usuario solicite aceptar o rechazar una transferencia:
  1. Identifica el transferId:
     - Si menciona un ID específico, úsalo
     - Si dice "esta transferencia" o "la transferencia mencionada", usa el ID del contexto
     - Si no hay contexto, primero consulta las transferencias pendientes del usuario usando get_user_transfers y luego list_all_transfers
  2. Usa accept_transfer o reject_transfer según corresponda

- Todas las acciones devuelven que requieren confirmación - explica al usuario que necesita confirmar y firmar la transacción
  * "Aprueba la solicitud" (sin contexto) → Usa list_all_users, filtra por status=0, si hay uno usa su dirección, si hay varios pregunta o usa el primero

### Búsqueda y Filtrado:
- Para buscar por características (rol, estado, tipo, etc.), SIEMPRE usa las herramientas list_* correspondientes
- Después de obtener la lista completa, DEBES filtrar los resultados según los criterios solicitados
- Puedes combinar MÚLTIPLES criterios en una sola búsqueda (ej: rol Y estado, tipo Y recall, etc.)
- Ejemplos de búsquedas simples:
  * "primer usuario con rol fabricante" → Usa list_all_users, filtra por role que contenga "fabricante" o "manufacturer", devuelve el primero
  * "tokens en recall" → Usa list_all_tokens, filtra por recall === true
  * "transferencias pendientes" → Usa list_all_transfers, filtra por status === 0 o statusText === "Pending"
  * "usuarios aprobados" → Usa list_all_users, filtra por status === 1 o statusText === "Approved"
- Ejemplos de búsquedas con MÚLTIPLES criterios (MUY IMPORTANTE):
  * "usuarios fabricantes pendientes" o "fabricante pendiente de aprobación" → Usa list_all_users, luego filtra por:
    - role.toLowerCase().includes("fabricante") OR role.toLowerCase().includes("manufacturer")
    - Y ADEMÁS status === 0 o statusText === "Pending"
    - Devuelve todos los usuarios que cumplan AMBOS criterios
  * "usuarios aprobados con rol distribuidor" → Usa list_all_users, filtra por:
    - status === 1 o statusText === "Approved"
    - Y ADEMÁS role.toLowerCase().includes("distribuidor") OR role.toLowerCase().includes("distributor")
  * "tokens de tipo BOM en recall" → Usa list_all_tokens, filtra por:
    - tokenType === 1 o tokenTypeText === "BOM"
    - Y ADEMÁS recall === true
- Cuando el usuario pregunta "¿hay algún...?" o "¿existe algún...?", debes:
  1. Usar la herramienta list_* correspondiente
  2. Filtrar por los criterios mencionados
  3. Si encuentras resultados, responde "Sí, hay X..." y lista los resultados
  4. Si no encuentras resultados, responde "No, no hay..." o "No se encontraron..."
- NO inventes herramientas nuevas, NO uses comandos que no existen, SIEMPRE usa las herramientas list_* disponibles
- tokens del usuario 0x..." → Usa get_user_tokens para obtener IDs, luego get_token_status para cada uno si necesitas detalles

### Contexto de Conversación:
- Mantén el contexto: si mencionaste información de un usuario/token/transferencia, y el usuario pregunta "su estado", "su rol", etc., se refiere al elemento mencionado anteriormente
- Para acciones: si el usuario dice "este usuario", "este", "la solicitud de este usuario", etc., se refiere al usuario mencionado anteriormente
- Usa get_user_info, get_token_status, o get_transfer_info con los identificadores mencionados previamente
- Si necesitas la dirección de un usuario para una acción y no la tienes en el contexto, primero consulta usando get_user_info o list_all_users

### Explicaciones del Sistema:
- Cuando te pregunten sobre cómo funciona el sistema, explica usando la información sobre tipos de tokens, jerarquía, transferencias, etc.
- Explica los flujos típicos:
  * Fabricante: API_MP → BOM → PT_LOTE → SSCC
  * Transferencias: Fabricante → Distribuidor → Minorista → Consumidor
  * Recall: Se marca toda la cadena relacionada automáticamente

### Respuestas:
- Sé claro, conciso y amigable
- Siempre responde en español
- Cuando proporciones información, incluye todos los detalles relevantes (estados, tipos, fechas, etc.)
- Para consultas sobre uso del sistema, proporciona guías paso a paso
- Si una operación requiere confirmación, explica claramente qué se va a hacer y que necesita confirmación del usuario
- NO inventes herramientas nuevas, solo usa las disponibles
- El contrato está desplegado y configurado correctamente, siempre puedes consultar información usando las herramientas

## 💡 EJEMPLOS DE CONSULTAS QUE PUEDES RESOLVER

### Consultas Generales:
- "¿Cómo funciona este sistema?"
- "Explícame la cadena de suministro"
- "¿Qué tipos de tokens existen?"
- "¿Cómo se crea un producto desde materias primas?"
- "¿Qué es un recall y cómo funciona?"

### Consultas de Usuarios:
- "Lista todos los usuarios aprobados"
- "Encuentra el primer usuario con rol fabricante"
- "¿Hay algún usuario fabricante pendiente de aprobación?" → Usa list_all_users, filtra por rol="fabricante" Y status=0
- "Usuarios con rol distribuidor aprobados"
- "¿Cuántos usuarios hay en el sistema?"

### Acciones sobre Usuarios:
- "Aprueba la solicitud de este usuario" → Usa change_user_status con la dirección del contexto y newStatus=1
- "Aprueba al usuario 0x..." → Usa change_user_status con userAddress="0x..." y newStatus=1
- "Rechaza la solicitud" → Usa change_user_status con la dirección del contexto y newStatus=2
- "Aprobar usuario con rol fabricante pendiente" → list_all_users, filtra, luego change_user_status con newStatus=1

### Acciones sobre Tokens:
- "Crear materia prima llamada X con cantidad Y" → Usa create_token con tokenType=0, parentIds=[], parentAmounts=[]
- "Crear receta usando materias primas 1 y 2" → Usa create_token con tokenType=1, parentIds=[1,2], parentAmounts=[cantidad1, cantidad2]
- "Crear lote usando la receta 5" → Usa create_token con tokenType=2, parentIds=[5], parentAmounts=[cantidad]
- "Transferir 100 unidades del token 3 al usuario 0x..." → Usa transfer_token con tokenId=3, to="0x...", amount=100
- "Aceptar la transferencia 10" → Usa accept_transfer con transferId=10
- "Rechazar esta transferencia" → Usa reject_transfer con transferId del contexto

### Consultas de Tokens:
- "¿Cuántos tokens hay en el sistema?"
- "¿Qué tokens tiene el usuario 0x...?"
- "Estado del token 123"
- "Tokens en recall"
- "Tokens de tipo BOM"

### Consultas de Transferencias:
- "Muestra las transferencias pendientes"
- "Información de la transferencia 456"
- "Transferencias del usuario 0x..."
- "Transferencias del token 123"

### Estadísticas:
- "Resumen del sistema"
- "Estadísticas generales"
- Y muchas más...`
      },
      {
        role: 'user',
        content: message
      }
    ]

    // Primera llamada al LLM
    const llmResponse = await callOllama(messages, tools)

    // Procesar tool calls si existen
    let finalResponse = llmResponse.message?.content || ''
    const toolCalls = llmResponse.message?.tool_calls || []

    if (toolCalls.length > 0) {
      // Ejecutar todas las herramientas
      const toolResults = await Promise.all(
        toolCalls.map(async (toolCall: any) => {
          const toolName = toolCall.function.name
          // Parsear arguments - puede venir como string JSON o como objeto ya parseado
          let args: any
          try {
            if (typeof toolCall.function.arguments === 'string') {
              args = JSON.parse(toolCall.function.arguments)
            } else {
              args = toolCall.function.arguments
            }
          } catch (e) {
            // Si falla el parse, intentar usar el valor tal cual
            args = toolCall.function.arguments || {}
          }
          
          // Agregar userAddress si está disponible
          if (userAddress && (toolName === 'get_token_status')) {
            args.userAddress = userAddress
          }
          
          const result = await executeTool(toolName, args)
          
          return {
            tool_call_id: toolCall.id,
            role: 'tool',
            name: toolName,
            content: JSON.stringify(result)
          }
        })
      )

      // Segunda llamada al LLM con los resultados
      const messagesWithResults = [
        ...messages,
        {
          role: 'assistant',
          content: llmResponse.message.content,
          tool_calls: toolCalls
        },
        ...toolResults
      ]

      const finalLlmResponse = await callOllama(messagesWithResults, tools)
      finalResponse = finalLlmResponse.message?.content || finalResponse

      // Verificar si hay operaciones que requieren confirmación
      const requiresConfirmation = toolResults.some((tr: any) => {
        const result = JSON.parse(tr.content)
        return result.requiresConfirmation === true
      })

      if (requiresConfirmation) {
        const confirmationAction = toolResults.find((tr: any) => {
          const result = JSON.parse(tr.content)
          return result.requiresConfirmation === true
        })

        if (confirmationAction) {
          const actionData = JSON.parse(confirmationAction.content)
          return NextResponse.json({
            success: true,
            response: finalResponse,
            requiresConfirmation: true,
            action: actionData.action,
            params: actionData.params
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      response: finalResponse,
      requiresConfirmation: false
    })

  } catch (error: any) {
    console.error('Error en /api/assistant:', error)
    console.error('Stack trace:', error.stack)
    
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

    // Mensaje de error más descriptivo
    let errorMessage = error.message || 'Error procesando solicitud'
    
    // Mejorar mensajes de error comunes
    if (errorMessage.includes('Ollama') || errorMessage.includes('fetch failed') || errorMessage.includes('ECONNREFUSED')) {
      errorMessage = `Error de conexión: ${errorMessage}. Verifica que Ollama esté corriendo en ${LLM_URL}`
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage
      },
      { status: 500 }
    )
  }
}
