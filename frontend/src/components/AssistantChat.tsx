'use client'

import { useState, useRef, useEffect } from 'react'
import { useWeb3 } from '@/contexts/Web3Context'
import { z } from 'zod'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ConfirmationAction {
  action: string
  params: Record<string, any>
}

export function AssistantChat() {
  const { account } = useWeb3()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationAction, setConfirmationAction] = useState<ConfirmationAction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          userAddress: account || undefined
        })
      })

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
      setError(err.message || 'Error al enviar mensaje')
      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ Error: ${err.message || 'No se pudo procesar tu solicitud'}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleConfirm = async () => {
    if (!confirmationAction) return

    setIsLoading(true)
    setShowConfirmation(false)

    try {
      const response = await fetch('/api/assistant/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(confirmationAction)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error confirmando transacción')
      }

      if (data.success) {
        const successMessage: Message = {
          role: 'assistant',
          content: `✅ ${data.message}\n📋 Hash de transacción: ${data.txHash}`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, successMessage])
      } else {
        throw new Error(data.error || 'Error desconocido')
      }
    } catch (err: any) {
      setError(err.message || 'Error al confirmar')
      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ Error al confirmar: ${err.message || 'No se pudo ejecutar la transacción'}`,
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
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-surface-800">Asistente IA</h2>
          <p className="text-sm text-surface-500">Consulta información y gestiona tu cadena de suministro</p>
        </div>
      </div>

      {/* Mensajes */}
      <div className="border border-surface-200 rounded-lg p-4 h-96 overflow-y-auto bg-surface-50 mb-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-surface-400">
            <div className="text-center">
              <p className="mb-2">👋 ¡Hola! ¿En qué puedo ayudarte?</p>
              <p className="text-sm">Puedes preguntar sobre tokens, usuarios o realizar acciones en el contrato.</p>
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
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white border border-surface-200 text-surface-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                  <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-primary-100' : 'text-surface-400'}`}>
                    {msg.timestamp.toLocaleTimeString()}
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

      {/* Input */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Escribe tu mensaje..."
          className="flex-1 px-4 py-2 border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-surface-300 disabled:cursor-not-allowed transition-colors"
        >
          Enviar
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Modal de confirmación */}
      {showConfirmation && confirmationAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
    </div>
  )
}





