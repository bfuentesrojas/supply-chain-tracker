'use client'

import { useState, useRef, useEffect } from 'react'
import { useWeb3 } from '@/contexts/Web3Context'
import { Contract } from 'ethers'
import { SUPPLY_CHAIN_ABI, CONTRACT_ADDRESS } from '@/contracts/SupplyChain'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ConfirmationAction {
  action: string
  params: Record<string, any>
}

export function FloatingAssistantChat() {
  const { account, signer, contract: web3Contract } = useWeb3()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationAction, setConfirmationAction] = useState<ConfirmationAction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Obtener el modelo desde variables de entorno
  const llmModel = process.env.NEXT_PUBLIC_LLM_MODEL || 'llama3.2'

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
      inputRef.current?.focus()
    }
  }, [messages, isOpen])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      // Crear AbortController con timeout de 210 segundos (3.5 minutos, más que el backend de 180s)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 210000) // 210 segundos (3.5 minutos)

      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          userAddress: account || undefined
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error en la solicitud')
      }

      if (data.success) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])

        // Si requiere confirmación, mostrar modal
        if (data.requiresConfirmation && data.action) {
          setConfirmationAction({
            action: data.action,
            params: data.params
          })
          setShowConfirmation(true)
        }
      } else {
        throw new Error(data.error || 'Error desconocido')
      }
    } catch (err: any) {
      let errorMessage = err.message || 'Error al enviar mensaje'
      
      // Manejar errores de timeout específicamente
      if (err.name === 'AbortError' || err.message?.includes('timeout') || err.message?.includes('tiempo de espera')) {
        errorMessage = 'La solicitud tardó demasiado tiempo (más de 3 minutos). Esto puede ocurrir con consultas complejas. Intenta reformular tu pregunta o verifica que Ollama tenga suficientes recursos.'
      }
      
      setError(errorMessage)
      const assistantErrorMessage: Message = {
        role: 'assistant',
        content: `❌ Error: ${errorMessage}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantErrorMessage])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleConfirm = async () => {
    if (!confirmationAction) return

    // Verificar que el usuario esté conectado
    if (!account || !signer) {
      const errorMessage: Message = {
        role: 'assistant',
        content: '❌ Error: Debes estar conectado con MetaMask para ejecutar esta transacción.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      setShowConfirmation(false)
      setConfirmationAction(null)
      return
    }

    setIsLoading(true)
    setShowConfirmation(false)

    try {
      // Validar datos con el endpoint
      const response = await fetch('/api/assistant/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(confirmationAction)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error validando transacción')
      }

      if (!data.success) {
        throw new Error(data.error || 'Error validando datos')
      }

      // Usar el contrato del Web3Context (conectado con MetaMask)
      const contract = web3Contract || (signer ? new Contract(CONTRACT_ADDRESS, SUPPLY_CHAIN_ABI, signer) : null)
      
      if (!contract) {
        throw new Error('Contrato no disponible. Asegúrate de estar conectado con MetaMask.')
      }

      let tx: any
      const { action, params } = confirmationAction

      // Ejecutar la transacción según la acción
      switch (action) {
        case 'change_user_status': {
          tx = await contract.changeStatusUser(params.userAddress, params.newStatus)
          break
        }
        case 'create_token': {
          // Convertir arrays a BigInt
          const parentIds = params.parentIds.map((id: number) => BigInt(id))
          const parentAmounts = params.parentAmounts.map((amt: number) => BigInt(amt))
          tx = await contract.createToken(
            params.name,
            BigInt(params.totalSupply),
            params.features,
            params.tokenType,
            parentIds,
            parentAmounts,
            params.isRecall
          )
          break
        }
        case 'transfer_token': {
          tx = await contract.transfer(params.to, params.tokenId, params.amount)
          break
        }
        case 'accept_transfer': {
          tx = await contract.acceptTransfer(params.transferId)
          break
        }
        case 'reject_transfer': {
          tx = await contract.rejectTransfer(params.transferId)
          break
        }
        default:
          throw new Error(`Acción desconocida: ${action}`)
      }

      // Esperar a que MetaMask firme y envíe la transacción
      // Esto abrirá MetaMask para que el usuario apruebe
      const receipt = await tx.wait()

      const successMessage: Message = {
        role: 'assistant',
        content: `✅ Transacción confirmada y ejecutada exitosamente\n📋 Hash: ${tx.hash}\n⛽ Gas usado: ${receipt.gasUsed.toString()}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, successMessage])
    } catch (err: any) {
      console.error('Error ejecutando transacción:', err)
      
      // Mensaje de error más descriptivo
      let errorMsg = err.message || 'No se pudo ejecutar la transacción'
      
      // Si el error es de rechazo de usuario en MetaMask
      if (err.code === 4001 || err.message?.includes('user rejected') || err.message?.includes('User denied')) {
        errorMsg = 'Transacción cancelada por el usuario en MetaMask'
      } else if (err.reason) {
        errorMsg = err.reason
      } else if (err.data) {
        // Intentar decodificar el error del contrato
        try {
          const contract = web3Contract || (signer ? new Contract(CONTRACT_ADDRESS, SUPPLY_CHAIN_ABI, signer) : null)
          if (contract) {
            const decoded = contract.interface.parseError(err.data)
            if (decoded) {
              errorMsg = decoded.name || errorMsg
            }
          }
        } catch {
          // Si no se puede decodificar, usar el mensaje original
        }
      }

      setError(errorMsg)
      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ Error al confirmar: ${errorMsg}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      setConfirmationAction(null)
    }
  }

  const handleCancel = () => {
    setShowConfirmation(false)
    setConfirmationAction(null)
    const cancelMessage: Message = {
      role: 'assistant',
      content: 'Operación cancelada por el usuario.',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, cancelMessage])
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const getStatusLabel = (status: number) => {
    const labels: Record<number, string> = {
      0: 'Pending',
      1: 'Active',
      2: 'Suspended'
    }
    return labels[status] || `Status ${status}`
  }

  return (
    <>
      {/* Botón flotante para abrir el chat */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-all duration-300 hover:scale-110 flex items-center justify-center z-40"
          aria-label="Abrir asistente de IA"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {/* Indicador de notificación (opcional) */}
          <span className="absolute top-0 right-0 w-4 h-4 bg-accent-500 rounded-full border-2 border-white"></span>
        </button>
      )}

      {/* Panel de chat flotante */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[520px] h-[600px] bg-white rounded-xl shadow-2xl border border-surface-200 flex flex-col z-50 animate-slide-up">
          {/* Header del chat */}
          <div className="bg-primary-600 text-white p-4 rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">Asistente IA</h3>
                <p className="text-xs text-primary-100">¿En qué puedo ayudarte?</p>
                <p className="text-xs text-primary-200 mt-1 flex items-center gap-1">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary-500/30">
                    Modelo: {llmModel}
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-primary-100 transition-colors p-1"
              aria-label="Cerrar chat"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Área de mensajes */}
          <div className="flex-1 overflow-y-auto p-4 bg-surface-50">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-surface-400">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="mb-2 font-medium">¡Hola! 👋</p>
                  <p className="text-sm">Soy tu asistente de IA. Puedo ayudarte con:</p>
                  <ul className="text-xs mt-2 space-y-1 text-left max-w-xs mx-auto">
                    <li>• Consultar información de tokens</li>
                    <li>• Consultar información de usuarios</li>
                    <li>• Realizar acciones en el contrato</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg p-3 ${
                        msg.role === 'user'
                          ? 'bg-primary-600 text-white'
                          : 'bg-white border border-surface-200 text-surface-800'
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm break-words">{msg.content}</p>
                      <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-primary-100' : 'text-surface-400'}`}>
                        {msg.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-surface-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                        <span className="text-sm text-surface-500">Pensando...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input y acciones */}
          <div className="p-4 bg-white border-t border-surface-200 rounded-b-xl">
            {error && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu mensaje..."
                className="flex-1 px-4 py-2 border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-surface-300 disabled:cursor-not-allowed transition-colors"
                aria-label="Enviar mensaje"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación */}
      {showConfirmation && confirmationAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-semibold text-surface-800 mb-4">Confirmar acción</h3>
            
            {confirmationAction.action === 'change_user_status' && (
              <div className="space-y-3 mb-6">
                <p className="text-surface-600">
                  ¿Estás seguro de que deseas cambiar el estado del usuario?
                </p>
                <div className="bg-surface-50 p-3 rounded-lg space-y-2">
                  <p className="text-sm">
                    <strong>Usuario:</strong> {confirmationAction.params.userAddress}
                  </p>
                  <p className="text-sm">
                    <strong>Nuevo estado:</strong> {getStatusLabel(confirmationAction.params.newStatus)}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 border border-surface-300 text-surface-700 rounded-lg hover:bg-surface-50 transition-colors"
                disabled={isLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-surface-300 disabled:cursor-not-allowed transition-colors"
                disabled={isLoading}
              >
                {isLoading ? 'Confirmando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}




