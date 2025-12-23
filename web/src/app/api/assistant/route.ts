import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { JsonRpcProvider, Contract } from 'ethers'
import { SUPPLY_CHAIN_ABI, CONTRACT_ADDRESS } from '@/contracts/SupplyChain'

// Schema de validación para la entrada
const assistantRequestSchema = z.object({
  message: z.string().min(1, 'El mensaje no puede estar vacío'),
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Dirección inválida').optional(),
})

// Configuración desde variables de entorno
const LLM_URL = process.env.LLM_URL || process.env.NEXT_PUBLIC_LLM_URL || 'http://127.0.0.1:11434'
const LLM_MODEL = process.env.LLM_MODEL || process.env.NEXT_PUBLIC_LLM_MODEL || 'llama3.2'
const RPC_URL = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545'
const CONTRACT = process.env.CONTRACT || process.env.NEXT_PUBLIC_CONTRACT || CONTRACT_ADDRESS

// Provider y contrato
const provider = new JsonRpcProvider(RPC_URL)
const contract = new Contract(CONTRACT, SUPPLY_CHAIN_ABI, provider)

// ABI compacto para el modelo (solo funciones relevantes)
const CONTRACT_ABI_SUMMARY = {
  users: "users(uint256) → (id, userAddress, role, status)",
  getUserInfo: "getUserInfo(address) → (id, userAddress, role, status)",
  addressToUserId: "addressToUserId(address) → uint256",
  admin: "admin() → address",
  isAdmin: "isAdmin(address) → bool",
  getToken: "getToken(uint256) → (id, creator, name, totalSupply, features, tokenType, parentIds, parentAmounts, dateCreated, recall)",
  getTokenBalance: "getTokenBalance(uint256, address) → uint256",
  getUserTokens: "getUserTokens(address) → uint256[]",
  getTransfer: "getTransfer(uint256) → (id, from, to, tokenId, dateCreated, amount, status)",
  getUserTransfers: "getUserTransfers(address) → uint256[]",
  nextTokenId: "nextTokenId() → uint256",
  nextTransferId: "nextTransferId() → uint256",
  getTotalUsers: "getTotalUsers() → uint256",
  createToken: "createToken(name, totalSupply, features, tokenType, parentIds[], parentAmounts[], isRecall)",
  changeStatusUser: "changeStatusUser(userAddress, newStatus: 0=Pending, 1=Approved, 2=Rejected, 3=Canceled)",
  transfer: "transfer(to, tokenId, amount)",
  acceptTransfer: "acceptTransfer(transferId)",
  rejectTransfer: "rejectTransfer(transferId)"
}

// System prompt optimizado
const SYSTEM_PROMPT = `Eres asistente de un sistema blockchain de cadena de suministro farmacéutica.

CONTRATO: ${CONTRACT}
ABI: ${JSON.stringify(CONTRACT_ABI_SUMMARY)}

TIPOS DE TOKEN: API_MP(0), BOM(1), PT_LOTE(2), SSCC(3), COMPLIANCE_LOG(4)
JERARQUÍA: API_MP → BOM → PT_LOTE → SSCC
ESTADOS USUARIO: 0=Pending, 1=Approved, 2=Rejected, 3=Canceled
ESTADOS TRANSFERENCIA: 0=Pending, 1=Accepted, 2=Rejected

PERMISOS Y RESTRICCIONES:
- change_user_status: SOLO ADMIN puede cambiar estados de usuarios
- create_token: Usuarios aprobados (NO consumer) pueden crear tokens
- transfer_token: Usuarios aprobados pueden transferir
- accept_transfer/reject_transfer: Usuarios aprobados pueden aceptar/rechazar
- Todas las acciones requieren que el usuario esté conectado y aprobado (status=1)

HERRAMIENTAS:
- get_token_status(tokenId): Info completa de token
- list_all_tokens(): Todos los tokens (filtrar resultados)
- get_user_info(address): Info de usuario
- list_all_users(): Todos los usuarios (filtrar resultados)
- get_transfer_info(transferId): Info de transferencia
- list_all_transfers(): Todas las transferencias (filtrar resultados)
- get_user_tokens(address): IDs de tokens del usuario
- get_user_transfers(address): IDs de transferencias del usuario
- get_system_stats(): Estadísticas generales
- change_user_status(userAddress, newStatus): Cambiar estado (SOLO ADMIN, requiere confirmación)
- create_token(...): Crear token (requiere usuario aprobado, NO consumer, requiere confirmación)
- transfer_token(to, tokenId, amount): Transferir (requiere usuario aprobado, requiere confirmación)
- accept_transfer(transferId): Aceptar transferencia (requiere usuario aprobado, requiere confirmación)
- reject_transfer(transferId): Rechazar transferencia (requiere usuario aprobado, requiere confirmación)

INSTRUCCIONES:
1. Para búsquedas: usa list_* y filtra resultados por criterios (rol, estado, tipo, etc.)
2. Para acciones: identifica parámetros, usa herramienta correspondiente
3. IMPORTANTE: Si el usuario solicita una acción pero no está conectado o no tiene permisos, informa claramente el problema
4. Mantén contexto de conversación para referencias ("este usuario", "este token")
5. Responde en español, sé conciso y claro
6. Para aprobar usuario: newStatus=1, rechazar: newStatus=2
7. Si una acción falla por permisos, explica qué permisos se requieren
8. CUENTA CONECTADA: Si el usuario pregunta sobre "mi cuenta", "mi perfil", "con qué cuenta estoy conectado", etc., usa get_user_info con la dirección del usuario conectado que se te proporciona en el contexto. Si no hay dirección en el contexto, informa que debe conectarse primero.

APROBAR USUARIOS PENDIENTES:
- Cuando el usuario diga "aprueba al usuario pendiente", "aprueba la solicitud", etc.:
  1. PRIMERO usa list_all_users para obtener todos los usuarios
  2. El resultado de list_all_users tiene formato: { success: true, data: { total: N, users: [...] } }
  3. Cada usuario en users[] tiene: { id, address, role, status, statusText, ... }
  4. Filtra por status === 0 o statusText === "Pending" (usuarios pendientes)
  5. Si hay solo un usuario pendiente, usa su campo "address" como "userAddress" en change_user_status con newStatus=1
  6. Si hay varios usuarios pendientes, pregunta cuál quiere aprobar o usa el primero encontrado
  7. Si no hay usuarios pendientes, informa al usuario
  8. IMPORTANTE: El campo del resultado de list_all_users se llama "address", pero change_user_status requiere "userAddress". Usa el valor de "address" como "userAddress".
  9. SIEMPRE proporciona userAddress (dirección 0x...) y newStatus (1 para aprobar) al llamar change_user_status`

// Definición de herramientas optimizadas
const tools = [
  {
    type: 'function',
    function: {
      name: 'get_token_status',
      description: 'Info completa de token por ID',
      parameters: {
        type: 'object',
        properties: {
          tokenId: { type: 'number', description: 'ID del token' }
        },
        required: ['tokenId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_all_tokens',
      description: 'Todos los tokens. Filtrar resultados según criterios.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_user_info',
      description: 'Info completa de usuario por dirección',
      parameters: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Dirección Ethereum (0x...)' }
        },
        required: ['address']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_all_users',
      description: 'Todos los usuarios. Filtrar por rol/estado según criterios.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_user_tokens',
      description: 'IDs de tokens de un usuario',
      parameters: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Dirección del usuario' }
        },
        required: ['address']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_transfer_info',
      description: 'Info completa de transferencia por ID',
      parameters: {
        type: 'object',
        properties: {
          transferId: { type: 'number', description: 'ID de la transferencia' }
        },
        required: ['transferId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_all_transfers',
      description: 'Todas las transferencias. Filtrar por estado según criterios.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_user_transfers',
      description: 'IDs de transferencias de un usuario',
      parameters: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Dirección del usuario' }
        },
        required: ['address']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_system_stats',
      description: 'Estadísticas: total tokens, usuarios, transferencias',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'change_user_status',
      description: 'Cambiar estado de usuario. Solo admin. newStatus: 0=Pending, 1=Approved, 2=Rejected, 3=Canceled. IMPORTANTE: Si el usuario dice "aprueba al usuario pendiente" o similar, PRIMERO debes usar list_all_users para encontrar usuarios con status=0. El resultado de list_all_users tiene usuarios con campo "address". Usa ese valor como "userAddress" en change_user_status con newStatus=1.',
      parameters: {
        type: 'object',
        properties: {
          userAddress: { 
            type: 'string', 
            description: 'Dirección Ethereum del usuario a modificar (formato 0x...). Si el usuario dice "aprueba al usuario pendiente", primero usa list_all_users para encontrar usuarios pendientes (status=0), luego usa la dirección del usuario encontrado aquí.' 
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
      description: 'Crear token. Tipos: 0=API_MP, 1=BOM, 2=PT_LOTE, 3=SSCC, 4=COMPLIANCE_LOG',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          totalSupply: { type: 'number' },
          features: { type: 'string', description: 'JSON string' },
          tokenType: { type: 'number', description: '0-4' },
          parentIds: { type: 'array', items: { type: 'number' } },
          parentAmounts: { type: 'array', items: { type: 'number' } },
          isRecall: { type: 'boolean' }
        },
        required: ['name', 'totalSupply', 'features', 'tokenType']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'transfer_token',
      description: 'Crear solicitud de transferencia',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string' },
          tokenId: { type: 'number' },
          amount: { type: 'number' }
        },
        required: ['to', 'tokenId', 'amount']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'accept_transfer',
      description: 'Aceptar transferencia pendiente',
      parameters: {
        type: 'object',
        properties: {
          transferId: { type: 'number' }
        },
        required: ['transferId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'reject_transfer',
      description: 'Rechazar transferencia pendiente',
      parameters: {
        type: 'object',
        properties: {
          transferId: { type: 'number' }
        },
        required: ['transferId']
      }
    }
  }
]

// Función para verificar permisos de usuario
async function checkUserPermissions(userAddress: string, action: string): Promise<{ allowed: boolean; error?: string; userInfo?: any }> {
  if (!userAddress) {
    return { allowed: false, error: 'No se proporcionó la dirección del usuario. Debes estar conectado para realizar esta acción.' }
  }

  try {
    // Obtener información del usuario
    const user = await contract.getUserInfo(userAddress)
    const userStatus = Number(user.status)
    const userRole = user.role.toLowerCase()
    
    // Verificar que el usuario esté aprobado
    if (userStatus !== 1) { // 1 = Approved
      const statusText = userStatus === 0 ? 'pendiente de aprobación' : 
                         userStatus === 2 ? 'rechazado' : 'cancelado'
      return {
        allowed: false,
        error: `Tu cuenta está ${statusText}. Solo los usuarios aprobados pueden realizar acciones en el sistema.`,
        userInfo: { role: user.role, status: userStatus }
      }
    }

    // Verificar permisos según la acción
    switch (action) {
      case 'change_user_status': {
        // Solo admin puede cambiar estados de usuario
        const adminAddress = await contract.admin()
        const isAdmin = userAddress.toLowerCase() === adminAddress.toLowerCase()
        if (!isAdmin) {
          return {
            allowed: false,
            error: 'Solo el administrador puede cambiar el estado de usuarios.',
            userInfo: { role: user.role, status: userStatus }
          }
        }
        break
      }
      
      case 'create_token': {
        // Consumer no puede crear tokens
        if (userRole === 'consumer' || userRole === 'consumidor') {
          return {
            allowed: false,
            error: 'Los consumidores no pueden crear tokens. Solo fabricantes, distribuidores, minoristas y administradores pueden crear tokens.',
            userInfo: { role: user.role, status: userStatus }
          }
        }
        break
      }
      
      case 'transfer_token':
      case 'accept_transfer':
      case 'reject_transfer': {
        // Cualquier usuario aprobado puede transferir/aceptar/rechazar
        // No hay restricciones adicionales
        break
      }
    }

    return {
      allowed: true,
      userInfo: {
        address: userAddress,
        role: user.role,
        status: userStatus,
        isAdmin: userAddress.toLowerCase() === (await contract.admin()).toLowerCase()
      }
    }
  } catch (err: any) {
    // Si el usuario no existe en el contrato
    if (err.message?.includes('could not decode') || err.message?.includes('BAD_DATA')) {
      return {
        allowed: false,
        error: 'Tu cuenta no está registrada en el sistema. Debes registrarte primero antes de realizar acciones.'
      }
    }
    return {
      allowed: false,
      error: `Error verificando permisos: ${err.message || 'Error desconocido'}`
    }
  }
}

// Función para ejecutar herramientas
async function executeTool(toolName: string, args: any, userAddress?: string): Promise<any> {
  try {
    // Verificar permisos para acciones que requieren autenticación
    const actionsRequiringAuth = ['change_user_status', 'create_token', 'transfer_token', 'accept_transfer', 'reject_transfer']
    if (actionsRequiringAuth.includes(toolName)) {
      if (!userAddress) {
        return {
          success: false,
          error: 'Esta acción requiere que estés conectado con tu cuenta. Por favor, conecta tu wallet primero.',
          requiresAuth: true
        }
      }
      
      const permissionCheck = await checkUserPermissions(userAddress, toolName)
      if (!permissionCheck.allowed) {
        return {
          success: false,
          error: permissionCheck.error || 'No tienes permisos para realizar esta acción.',
          requiresAuth: true,
          userInfo: permissionCheck.userInfo
        }
      }
    }

    switch (toolName) {
      case 'get_token_status': {
        try {
          const tokenId = BigInt(args.tokenId)
          const token = await contract.getToken(tokenId)
          const tokenTypeLabels: Record<number, string> = {
            0: 'API_MP', 1: 'BOM', 2: 'PT_LOTE', 3: 'SSCC', 4: 'COMPLIANCE_LOG'
          }
          
          let balance = BigInt(0)
          if (args.userAddress) {
            try {
              balance = await contract.getTokenBalance(tokenId, args.userAddress)
            } catch {}
          }
          
          return {
            success: true,
            data: {
              id: token.id.toString(),
              creator: token.creator,
              name: token.name,
              totalSupply: token.totalSupply.toString(),
              tokenType: Number(token.tokenType),
              tokenTypeText: tokenTypeLabels[Number(token.tokenType)] || 'Unknown',
              dateCreated: new Date(Number(token.dateCreated) * 1000).toISOString(),
              recall: token.recall,
              parentIds: token.parentIds.map((p: bigint) => p.toString()),
              parentAmounts: token.parentAmounts.map((p: bigint) => p.toString()),
              balance: balance.toString()
            }
          }
        } catch (err: any) {
          return { success: false, error: err.message || 'Error obteniendo token' }
        }
      }
      
      case 'get_user_info': {
        try {
          const user = await contract.getUserInfo(args.address)
          const statusLabels: Record<number, string> = {
            0: 'Pending', 1: 'Approved', 2: 'Rejected', 3: 'Canceled'
          }
          const adminAddress = await contract.admin()
          const isAdmin = user.userAddress.toLowerCase() === adminAddress.toLowerCase()
          
          return {
            success: true,
            data: {
              id: user.id.toString(),
              address: user.userAddress,
              role: user.role,
              status: Number(user.status),
              statusText: statusLabels[Number(user.status)] || 'Unknown',
              statusDescription: Number(user.status) === 0 ? 'Pendiente' : 
                                 Number(user.status) === 1 ? 'Aprobado' : 
                                 Number(user.status) === 2 ? 'Rechazado' : 'Cancelado',
              isAdmin
            }
          }
        } catch (err: any) {
          return { success: false, error: err.message || 'Error obteniendo usuario' }
        }
      }
      
      case 'list_all_users': {
        try {
          const totalUsers = await contract.getTotalUsers()
          const totalUsersNum = Number(totalUsers)
          const usersList = []
          const adminAddress = await contract.admin()
          
          for (let i = 1; i <= totalUsersNum; i++) {
            try {
              const user = await contract.users(BigInt(i))
              const statusNumber = Number(user.status)
              const statusLabels: Record<number, string> = {
                0: 'Pending', 1: 'Approved', 2: 'Rejected', 3: 'Canceled'
              }
              
              usersList.push({
                id: user.id.toString(),
                address: user.userAddress,
                role: user.role,
                status: statusNumber,
                statusText: statusLabels[statusNumber] || 'Unknown',
                statusDescription: statusNumber === 0 ? 'Pendiente' : 
                                   statusNumber === 1 ? 'Aprobado' : 
                                   statusNumber === 2 ? 'Rechazado' : 'Cancelado',
                isAdmin: user.userAddress.toLowerCase() === adminAddress.toLowerCase()
              })
            } catch (err: any) {
              console.error(`Error obteniendo usuario ${i}:`, err.message)
            }
          }
          
          return { success: true, data: { total: usersList.length, users: usersList } }
        } catch (err: any) {
          return { success: false, error: err.message || 'Error obteniendo usuarios' }
        }
      }
      
      case 'list_all_tokens': {
        try {
          const nextTokenIdValue = await contract.nextTokenId()
          const totalTokensNum = Number(nextTokenIdValue)
          const tokensList = []
          
          for (let i = 1; i < totalTokensNum; i++) {
            try {
              const token = await contract.getToken(BigInt(i))
              const tokenTypeLabels: Record<number, string> = {
                0: 'API_MP', 1: 'BOM', 2: 'PT_LOTE', 3: 'SSCC', 4: 'COMPLIANCE_LOG'
              }
              
              tokensList.push({
                id: token.id.toString(),
                creator: token.creator,
                name: token.name,
                totalSupply: token.totalSupply.toString(),
                tokenType: Number(token.tokenType),
                tokenTypeText: tokenTypeLabels[Number(token.tokenType)] || 'Unknown',
                dateCreated: new Date(Number(token.dateCreated) * 1000).toISOString(),
                recall: token.recall,
                parentIds: token.parentIds.map((p: bigint) => p.toString()),
                parentAmounts: token.parentAmounts.map((p: bigint) => p.toString())
              })
            } catch (err: any) {
              console.error(`Error obteniendo token ${i}:`, err.message)
            }
          }
          
          return { success: true, data: { total: tokensList.length, tokens: tokensList } }
        } catch (err: any) {
          return { success: false, error: err.message || 'Error obteniendo tokens' }
        }
      }
      
      case 'get_user_tokens': {
        try {
          const tokenIds = await contract.getUserTokens(args.address)
          return {
            success: true,
            data: {
              address: args.address,
              tokenIds: tokenIds.map((id: bigint) => id.toString()),
              count: tokenIds.length
            }
          }
        } catch (err: any) {
          return { success: false, error: err.message || 'Error obteniendo tokens del usuario' }
        }
      }
      
      case 'get_transfer_info': {
        try {
          const transfer = await contract.getTransfer(BigInt(args.transferId))
          const statusLabels: Record<number, string> = {
            0: 'Pending', 1: 'Accepted', 2: 'Rejected'
          }
          
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
              statusText: statusLabels[Number(transfer.status)] || 'Unknown',
              statusDescription: Number(transfer.status) === 0 ? 'Pendiente' : 
                                 Number(transfer.status) === 1 ? 'Aceptada' : 'Rechazada'
            }
          }
        } catch (err: any) {
          return { success: false, error: err.message || 'Error obteniendo transferencia' }
        }
      }
      
      case 'list_all_transfers': {
        try {
          const nextTransferIdValue = await contract.nextTransferId()
          const totalTransfersNum = Number(nextTransferIdValue)
          const transfersList = []
          
          for (let i = 1; i < totalTransfersNum; i++) {
            try {
              const transfer = await contract.getTransfer(BigInt(i))
              const statusLabels: Record<number, string> = {
                0: 'Pending', 1: 'Accepted', 2: 'Rejected'
              }
              
              transfersList.push({
                id: transfer.id.toString(),
                from: transfer.from,
                to: transfer.to,
                tokenId: transfer.tokenId.toString(),
                amount: transfer.amount.toString(),
                dateCreated: new Date(Number(transfer.dateCreated) * 1000).toISOString(),
                status: Number(transfer.status),
                statusText: statusLabels[Number(transfer.status)] || 'Unknown',
                statusDescription: Number(transfer.status) === 0 ? 'Pendiente' : 
                                   Number(transfer.status) === 1 ? 'Aceptada' : 'Rechazada'
              })
            } catch (err: any) {
              console.error(`Error obteniendo transferencia ${i}:`, err.message)
            }
          }
          
          return { success: true, data: { total: transfersList.length, transfers: transfersList } }
        } catch (err: any) {
          return { success: false, error: err.message || 'Error obteniendo transferencias' }
        }
      }
      
      case 'get_user_transfers': {
        try {
          const transferIds = await contract.getUserTransfers(args.address)
          return {
            success: true,
            data: {
              address: args.address,
              transferIds: transferIds.map((id: bigint) => id.toString()),
              count: transferIds.length
            }
          }
        } catch (err: any) {
          return { success: false, error: err.message || 'Error obteniendo transferencias del usuario' }
        }
      }
      
      case 'get_system_stats': {
        try {
          const [totalTokens, totalUsers, totalTransfers] = await Promise.all([
            contract.nextTokenId().then((v: bigint) => Number(v) - 1),
            contract.getTotalUsers().then((v: bigint) => Number(v)),
            contract.nextTransferId().then((v: bigint) => Number(v) - 1)
          ])
          
          return {
            success: true,
            data: { totalTokens, totalUsers, totalTransfers }
          }
        } catch (err: any) {
          return { success: false, error: err.message || 'Error obteniendo estadísticas' }
        }
      }
      
      case 'change_user_status': {
        // Validación temprana: verificar que userAddress o address esté presente
        const userAddr = args.userAddress || args.address
        if (!userAddr || !userAddr.match(/^0x[a-fA-F0-9]{40}$/)) {
          return {
            success: false,
            error: `Para cambiar el estado de un usuario, primero debes obtener su dirección usando list_all_users. Luego usa el campo "address" del resultado como "userAddress" en change_user_status.`,
            hint: 'Ejemplo: 1) list_all_users → 2) filtrar por status=0 → 3) usar address del usuario encontrado'
          }
        }
        
        // Normalizar a userAddress
        const normalizedArgs = {
          ...args,
          userAddress: userAddr.toLowerCase(),
          newStatus: typeof args.newStatus === 'string' ? parseInt(args.newStatus, 10) : args.newStatus
        }
        delete normalizedArgs.address // Eliminar si existe
        
        return {
          success: false,
          requiresConfirmation: true,
          action: toolName,
          params: normalizedArgs,
          message: 'Esta operación requiere confirmación y firma de transacción.'
        }
      }
      
      case 'create_token':
      case 'transfer_token':
      case 'accept_transfer':
      case 'reject_transfer': {
        return {
          success: false,
          requiresConfirmation: true,
          action: toolName,
          params: args,
          message: 'Esta operación requiere confirmación y firma de transacción.'
        }
      }
      
      default:
        return { success: false, error: `Herramienta desconocida: ${toolName}` }
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Error ejecutando herramienta' }
  }
}

// Función optimizada para llamar a Ollama
async function callOllama(messages: any[], tools: any[]): Promise<any> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 180000)
  
  try {
    const response = await fetch(`${LLM_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages,
        tools,
        tool_choice: 'auto',
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 512
        }
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
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('La solicitud excedió el tiempo de espera (3 minutos). Intenta reformular tu pregunta.')
    }
    if (error.message?.includes('fetch failed') || error.message?.includes('ECONNREFUSED')) {
      throw new Error(`No se pudo conectar con Ollama en ${LLM_URL}. Verifica que Ollama esté corriendo.`)
    }
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = assistantRequestSchema.parse(body)
    const { message, userAddress } = validated

    // Health check rápido
    try {
      await fetch(`${LLM_URL}/api/tags`, { 
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      })
    } catch (healthError) {
      console.warn(`[API] Ollama no disponible:`, healthError)
    }

    // Construir system prompt con información del usuario conectado si está disponible
    let systemPromptWithUser = SYSTEM_PROMPT
    if (userAddress) {
      // Obtener información del usuario para incluirla en el prompt
      try {
        const userInfo = await contract.getUserInfo(userAddress)
        const adminAddress = await contract.admin()
        const isAdmin = userAddress.toLowerCase() === adminAddress.toLowerCase()
        const statusLabels: Record<number, string> = {
          0: 'Pendiente', 1: 'Aprobado', 2: 'Rechazado', 3: 'Cancelado'
        }
        
        systemPromptWithUser = `${SYSTEM_PROMPT}

CUENTA CONECTADA ACTUAL:
- Dirección: ${userAddress}
- Rol: ${userInfo.role}
- Estado: ${statusLabels[Number(userInfo.status)] || 'Desconocido'} (${Number(userInfo.status)})
- Es Admin: ${isAdmin ? 'Sí' : 'No'}

IMPORTANTE: Cuando el usuario pregunte sobre "mi cuenta", "mi perfil", "con qué cuenta estoy conectado", "mi información", etc., debes usar get_user_info con la dirección ${userAddress} para obtener la información completa del usuario conectado.`
      } catch (err: any) {
        // Si no se puede obtener la info del usuario, solo incluir la dirección
        systemPromptWithUser = `${SYSTEM_PROMPT}

CUENTA CONECTADA ACTUAL:
- Dirección: ${userAddress}
- Nota: El usuario está conectado pero no se pudo obtener su información completa. Usa get_user_info(${userAddress}) para obtenerla.`
      }
    } else {
      // Si no hay userAddress, informar al modelo
      systemPromptWithUser = `${SYSTEM_PROMPT}

NOTA: No hay cuenta conectada actualmente. Si el usuario pregunta sobre su cuenta o perfil, informa que debe conectarse primero.`
    }

    // Construir mensajes optimizados
    const messages = [
      { role: 'system', content: systemPromptWithUser },
      { role: 'user', content: message }
    ]

    console.log(`[API] Llamando Ollama (modelo: ${LLM_MODEL})`)
    const llmResponse = await callOllama(messages, tools)
    
    let messageContent = ''
    let toolCalls: any[] = []
    
    if (llmResponse.message) {
      messageContent = llmResponse.message.content || ''
      toolCalls = llmResponse.message.tool_calls || []
    } else if (llmResponse.content) {
      messageContent = llmResponse.content
    } else if (typeof llmResponse === 'string') {
      messageContent = llmResponse
    }
    
    let finalResponse = messageContent || ''
    
    if (toolCalls.length > 0) {
      const toolResults = await Promise.all(
        toolCalls.map(async (toolCall: any) => {
          const toolName = toolCall.function?.name || toolCall.name
          let toolArgs = toolCall.function?.arguments || toolCall.arguments || {}
          
          if (typeof toolArgs === 'string') {
            try {
              toolArgs = JSON.parse(toolArgs)
            } catch {
              toolArgs = {}
            }
          }
          
          // Normalizar tipos de datos comunes que pueden venir como string desde el LLM
          if (toolArgs.newStatus !== undefined) {
            // Convertir newStatus a número si viene como string
            if (typeof toolArgs.newStatus === 'string') {
              toolArgs.newStatus = parseInt(toolArgs.newStatus, 10)
            }
          }
          
          // Normalizar: aceptar 'address' como 'userAddress' para change_user_status
          if (toolName === 'change_user_status' && toolArgs.address && !toolArgs.userAddress) {
            toolArgs.userAddress = toolArgs.address
            delete toolArgs.address
            console.log('[API] Normalizado: address → userAddress para change_user_status')
          }
          
          if (toolArgs.tokenId !== undefined && typeof toolArgs.tokenId === 'string') {
            toolArgs.tokenId = parseInt(toolArgs.tokenId, 10)
          }
          
          if (toolArgs.transferId !== undefined && typeof toolArgs.transferId === 'string') {
            toolArgs.transferId = parseInt(toolArgs.transferId, 10)
          }
          
          if (toolArgs.totalSupply !== undefined && typeof toolArgs.totalSupply === 'string') {
            toolArgs.totalSupply = parseInt(toolArgs.totalSupply, 10)
          }
          
          if (toolArgs.amount !== undefined && typeof toolArgs.amount === 'string') {
            toolArgs.amount = parseInt(toolArgs.amount, 10)
          }
          
          if (userAddress && toolName === 'get_token_status') {
            toolArgs.userAddress = userAddress
          }
          
          // Pasar userAddress a executeTool para validaciones de permisos
          const result = await executeTool(toolName, toolArgs, userAddress)
          
          return {
            tool_call_id: toolCall.id,
            role: 'tool',
            name: toolName,
            content: JSON.stringify(result)
          }
        })
      )

      const messagesWithResults = [
        ...messages,
        {
          role: 'assistant',
          content: messageContent,
          tool_calls: toolCalls
        },
        ...toolResults
      ]

      const finalLlmResponse = await callOllama(messagesWithResults, tools)
      finalResponse = finalLlmResponse.message?.content || finalResponse
      
      if (!finalResponse || finalResponse.trim() === '') {
        finalResponse = messageContent || 'Lo siento, no pude generar una respuesta. Por favor, intenta reformular tu pregunta.'
      }

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
          
          // Validar y normalizar params antes de enviar
          let normalizedParams = actionData.params
          
          // Para change_user_status, asegurar que userAddress y newStatus estén presentes y correctos
          if (actionData.action === 'change_user_status') {
            // Normalizar: aceptar tanto 'userAddress' como 'address' (del resultado de list_all_users)
            const userAddr = normalizedParams.userAddress || normalizedParams.address
            
            if (!userAddr || !userAddr.match(/^0x[a-fA-F0-9]{40}$/)) {
              console.error('[API] Error: userAddress inválido en change_user_status:', {
                normalizedParams,
                userAddress: normalizedParams.userAddress,
                address: normalizedParams.address,
                allKeys: Object.keys(normalizedParams)
              })
              return NextResponse.json({
                success: false,
                error: 'Dirección de usuario inválida. La IA debe proporcionar una dirección válida (0x...). Asegúrate de usar el campo "address" del resultado de list_all_users.',
                details: { 
                  params: normalizedParams,
                  receivedKeys: Object.keys(normalizedParams),
                  hint: 'Si usaste list_all_users, el campo se llama "address" en el resultado, úsalo como "userAddress" en change_user_status'
                }
              }, { status: 400 })
            }
            
            // Normalizar a userAddress
            normalizedParams.userAddress = userAddr.toLowerCase()
            delete normalizedParams.address // Eliminar si existe
            
            // Convertir newStatus a número si viene como string
            let newStatusNum: number
            if (typeof normalizedParams.newStatus === 'string') {
              newStatusNum = parseInt(normalizedParams.newStatus, 10)
              if (isNaN(newStatusNum)) {
                console.error('[API] Error: newStatus no es un número válido:', normalizedParams)
                return NextResponse.json({
                  success: false,
                  error: 'Estado inválido. Debe ser un número entre 0 y 3.',
                  details: { params: normalizedParams, newStatusType: typeof normalizedParams.newStatus }
                }, { status: 400 })
              }
            } else if (typeof normalizedParams.newStatus === 'number') {
              newStatusNum = normalizedParams.newStatus
            } else {
              console.error('[API] Error: newStatus tiene tipo inválido:', normalizedParams, typeof normalizedParams.newStatus)
              return NextResponse.json({
                success: false,
                error: 'Estado inválido. Debe ser un número entre 0 y 3.',
                details: { params: normalizedParams, newStatusType: typeof normalizedParams.newStatus }
              }, { status: 400 })
            }
            
            // Validar rango
            if (newStatusNum < 0 || newStatusNum > 3 || !Number.isInteger(newStatusNum)) {
              console.error('[API] Error: newStatus fuera de rango:', normalizedParams, newStatusNum)
              return NextResponse.json({
                success: false,
                error: 'Estado inválido. Debe ser un número entero entre 0 y 3.',
                details: { params: normalizedParams, newStatusValue: newStatusNum }
              }, { status: 400 })
            }
            
            // Asegurar newStatus como número (userAddress ya está normalizado arriba)
            normalizedParams = {
              ...normalizedParams,
              newStatus: newStatusNum
            }
            
            console.log('[API] Parámetros normalizados para change_user_status:', normalizedParams)
          }
          
          console.log(`[API] Enviando acción para confirmación: ${actionData.action}`, normalizedParams)
          
          return NextResponse.json({
            success: true,
            response: finalResponse,
            requiresConfirmation: true,
            action: actionData.action,
            params: normalizedParams
          })
        }
      }
    }

    if (!finalResponse || finalResponse.trim() === '') {
      finalResponse = 'Lo siento, no pude generar una respuesta. Por favor, intenta reformular tu pregunta.'
    }
    
    return NextResponse.json({
      success: true,
      response: finalResponse,
      requiresConfirmation: false
    })

  } catch (error: any) {
    console.error('[API] Error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos de entrada inválidos', details: error.errors },
        { status: 400 }
      )
    }

    let errorMessage = error.message || 'Error procesando solicitud'
    if (errorMessage.includes('Ollama') || errorMessage.includes('fetch failed') || errorMessage.includes('ECONNREFUSED')) {
      errorMessage = `Error de conexión: ${errorMessage}. Verifica que Ollama esté corriendo en ${LLM_URL}`
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
