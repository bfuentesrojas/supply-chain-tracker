/**
 * Manejador de errores para transacciones de MetaMask/ethers.js
 * Parsea los errores técnicos y devuelve mensajes amigables para el usuario
 */

// Códigos de error comunes de MetaMask
const METAMASK_ERROR_CODES = {
  4001: 'Transacción rechazada por el usuario',
  4100: 'La cuenta solicitada no está autorizada',
  4200: 'El método solicitado no es soportado',
  4900: 'MetaMask está desconectado de la red',
  4901: 'MetaMask no está conectado a esta red',
  '-32000': 'Fondos insuficientes para la transacción',
  '-32002': 'Hay una solicitud pendiente en MetaMask. Abre la extensión.',
  '-32003': 'Transacción rechazada',
  '-32602': 'Parámetros inválidos',
  '-32603': 'Error interno',
}

// Códigos de error de ethers.js v6
const ETHERS_ERROR_CODES = {
  ACTION_REJECTED: 'Transacción rechazada por el usuario',
  INSUFFICIENT_FUNDS: 'Fondos insuficientes para completar la transacción',
  NETWORK_ERROR: 'Error de conexión con la red',
  NONCE_EXPIRED: 'La transacción expiró. Intenta de nuevo.',
  REPLACEMENT_UNDERPRICED: 'El precio del gas es muy bajo para reemplazar la transacción',
  TRANSACTION_REPLACED: 'La transacción fue reemplazada',
  UNPREDICTABLE_GAS_LIMIT: 'No se pudo estimar el gas. La transacción puede fallar.',
  CALL_EXCEPTION: 'Error en la ejecución del contrato',
  UNKNOWN_ERROR: 'Error desconocido',
}

// Mensajes de revert del contrato SupplyChain
const CONTRACT_REVERT_MESSAGES: Record<string, string> = {
  'Solo el admin puede ejecutar esta funcion': 'Solo el administrador puede realizar esta acción',
  'Usuario no registrado': 'Tu cuenta no está registrada en el sistema',
  'Usuario no aprobado': 'Tu cuenta aún no ha sido aprobada por el administrador',
  'Usuario ya registrado': 'Esta cuenta ya está registrada',
  'Usuario no encontrado': 'El usuario especificado no existe',
  'Token no existe': 'El token especificado no existe',
  'Transferencia no existe': 'La transferencia especificada no existe',
  'El nombre no puede estar vacio': 'El nombre del token es obligatorio',
  'El supply debe ser mayor a 0': 'La cantidad debe ser mayor a cero',
  'Token padre no existe': 'El token padre especificado no existe',
  'Direccion destino invalida': 'La dirección de destino no es válida',
  'No puedes transferir a ti mismo': 'No puedes transferirte tokens a ti mismo',
  'La cantidad debe ser mayor a 0': 'La cantidad a transferir debe ser mayor a cero',
  'Balance insuficiente': 'No tienes suficiente balance de este token',
  'parentIds y parentAmounts deben tener la misma longitud': 'Los arrays de padres y cantidades deben tener la misma longitud',
  'La cantidad del padre debe ser mayor a 0': 'La cantidad de cada padre debe ser mayor a cero',
  'Componente insuficiente: no hay suficiente cantidad de componentes para crear el lote': 'No hay suficientes componentes para crear el lote. El número de unidades del lote excede la cantidad de componentes disponibles. Verifica que tengas suficiente cantidad de todos los componentes requeridos por la receta antes de crear el lote.',
  'Un lote debe tener exactamente un padre (receta)': 'Un lote debe tener exactamente un padre que sea una receta (BOM). Un lote no puede tener múltiples padres ni puede ser creado sin una receta.',
  'El padre de un lote debe ser una receta (BOM)': 'El padre de un lote debe ser una receta (BOM), no otro tipo de token. Solo las recetas (BOM) pueden ser usadas como padre de un lote.',
  'Destinatario no registrado': 'El destinatario no está registrado en el sistema',
  'Destinatario no aprobado': 'El destinatario no ha sido aprobado por el administrador',
  'Solo el destinatario puede aceptar': 'Solo el destinatario puede aceptar esta transferencia',
  'Solo el destinatario puede rechazar': 'Solo el destinatario puede rechazar esta transferencia',
  'Transferencia no esta pendiente': 'Esta transferencia ya fue procesada',
  'El remitente ya no tiene balance suficiente': 'El remitente ya no tiene balance suficiente',
  'El rol no puede estar vacio': 'El rol es obligatorio',
  'No se puede cambiar el estado del admin': 'No se puede cambiar el estado del administrador',
}

/**
 * Interfaz para errores tipados
 */
interface EthersError {
  code?: string | number
  message?: string
  reason?: string
  data?: {
    message?: string
  }
  error?: {
    message?: string
    data?: {
      message?: string
    }
  }
  shortMessage?: string
  info?: {
    error?: {
      message?: string
      code?: number
    }
  }
}

/**
 * Extrae el mensaje de revert del contrato si existe
 */
function extractRevertMessage(error: EthersError): string | null {
  // Buscar en diferentes ubicaciones donde puede estar el mensaje de revert
  const possibleMessages = [
    error.reason,
    error.data?.message,
    error.error?.message,
    error.error?.data?.message,
    error.shortMessage,
    error.info?.error?.message,
    error.message,
  ]

  for (const msg of possibleMessages) {
    if (msg) {
      // Buscar coincidencia con mensajes conocidos del contrato (incluye parcial)
      for (const [revertMsg, friendlyMsg] of Object.entries(CONTRACT_REVERT_MESSAGES)) {
        if (msg.includes(revertMsg)) {
          return friendlyMsg
        }
      }
      
      // Si hay un mensaje de revert pero no coincide, intentar extraerlo
      if (msg.includes('revert') || msg.includes('require') || msg.includes('execution reverted')) {
        // Intentar extraer solo el mensaje relevante de diferentes formatos
        const patterns = [
          /reason="([^"]+)"/,
          /reverted with reason string '([^']+)'/,
          /execution reverted: (.+?)(?: \(action=|$)/,
          /execution reverted(?: \(no data present[^)]*\))?:?\s*(.+?)(?: \(action=|$)/,
          /revert\s+(.+?)(?: \(action=|$)/,
        ]
        
        for (const pattern of patterns) {
          const match = msg.match(pattern)
          if (match && match[1]) {
            const extractedMsg = match[1].trim()
            // Buscar si el mensaje extraído está en nuestro mapeo
            for (const [revertMsg, friendlyMsg] of Object.entries(CONTRACT_REVERT_MESSAGES)) {
              if (extractedMsg.includes(revertMsg)) {
                return friendlyMsg
              }
            }
            // Si no está mapeado, devolver el mensaje original del contrato si parece ser un mensaje de revert
            if (extractedMsg.length > 0 && extractedMsg.length < 200 && !extractedMsg.includes('action=')) {
              return extractedMsg
            }
          }
        }
      }
    }
  }

  return null
}

/**
 * Parsea un error de transacción y devuelve un mensaje amigable
 */
export function parseTransactionError(error: unknown): string {
  if (!error) {
    return 'Error desconocido'
  }

  const err = error as EthersError

  // 1. Verificar código de error de MetaMask (usuario rechazó)
  if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
    return METAMASK_ERROR_CODES[4001]
  }

  // 2. Verificar código numérico de MetaMask
  if (typeof err.code === 'number' && err.code in METAMASK_ERROR_CODES) {
    return METAMASK_ERROR_CODES[err.code as keyof typeof METAMASK_ERROR_CODES]
  }

  // 3. Verificar código string de MetaMask
  if (typeof err.code === 'string') {
    const numCode = err.code as string
    if (numCode in METAMASK_ERROR_CODES) {
      return METAMASK_ERROR_CODES[numCode as keyof typeof METAMASK_ERROR_CODES]
    }
  }

  // 4. Verificar código de error de ethers.js
  if (typeof err.code === 'string' && err.code in ETHERS_ERROR_CODES) {
    return ETHERS_ERROR_CODES[err.code as keyof typeof ETHERS_ERROR_CODES]
  }

  // 5. Verificar error anidado de MetaMask (info.error.code)
  if (err.info?.error?.code) {
    const nestedCode = err.info.error.code
    if (nestedCode === 4001) {
      return METAMASK_ERROR_CODES[4001]
    }
  }

  // 6. Intentar extraer mensaje de revert del contrato
  const revertMessage = extractRevertMessage(err)
  if (revertMessage) {
    return revertMessage
  }

  // 7. Buscar "user rejected" en el mensaje
  const message = err.message?.toLowerCase() || ''
  if (message.includes('user rejected') || 
      message.includes('user denied') || 
      message.includes('rejected by user')) {
    return METAMASK_ERROR_CODES[4001]
  }

  // 8. Buscar errores de red
  if (message.includes('network') || message.includes('connection')) {
    return 'Error de conexión con la red. Verifica tu conexión.'
  }

  // 9. Si hay un shortMessage de ethers.js, intentar extraer mensaje de revert primero
  if (err.shortMessage) {
    // Intentar extraer mensaje de revert del shortMessage
    const revertFromShortMsg = extractRevertMessage({ ...err, message: err.shortMessage })
    if (revertFromShortMsg) {
      return revertFromShortMsg
    }
    
    // Si no hay revert, usar el shortMessage directamente
    let cleanMessage = err.shortMessage
    if (cleanMessage.includes('user rejected')) {
      return METAMASK_ERROR_CODES[4001]
    }
    
    // Si el shortMessage contiene "execution reverted", intentar extraer más información
    if (cleanMessage.includes('execution reverted')) {
      const revertMsg = extractRevertMessage({ ...err, message: cleanMessage })
      if (revertMsg) {
        return revertMsg
      }
    }
    
    return cleanMessage
  }

  // 10. Fallback: mensaje de error original o genérico
  if (err.message && err.message.length < 200) {
    return err.message
  }

  return 'Error al procesar la transacción. Por favor, intenta de nuevo.'
}

/**
 * Verifica si el error es por rechazo del usuario
 */
export function isUserRejectionError(error: unknown): boolean {
  if (!error) return false
  
  const err = error as EthersError
  
  return (
    err.code === 4001 ||
    err.code === 'ACTION_REJECTED' ||
    err.info?.error?.code === 4001 ||
    (err.message?.toLowerCase() || '').includes('user rejected') ||
    (err.message?.toLowerCase() || '').includes('user denied')
  )
}




