/**
 * Tests unitarios para el componente FloatingAssistantChat
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FloatingAssistantChat } from '../FloatingAssistantChat'

// Mock del contexto Web3
jest.mock('@/contexts/Web3Context', () => ({
  useWeb3: jest.fn(() => ({
    account: '0x123',
    signer: {},
    contract: {},
  })),
}))

// Mock de fetch para las llamadas a la API
global.fetch = jest.fn()

describe('FloatingAssistantChat', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  it('debe renderizar el botón flotante cuando está cerrado', () => {
    render(<FloatingAssistantChat />)
    const button = screen.getByRole('button', { name: /asistente/i })
    expect(button).toBeInTheDocument()
  })

  it('debe abrir el chat cuando se hace clic en el botón', () => {
    render(<FloatingAssistantChat />)
    const button = screen.getByRole('button', { name: /asistente/i })
    fireEvent.click(button)

    expect(screen.getByPlaceholderText(/escribe tu mensaje/i)).toBeInTheDocument()
  })

  it('debe mostrar mensaje de error cuando falla la solicitud', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    render(<FloatingAssistantChat />)
    const button = screen.getByRole('button', { name: /asistente/i })
    fireEvent.click(button)

    const input = screen.getByPlaceholderText(/escribe tu mensaje/i)
    fireEvent.change(input, { target: { value: 'test message' } })

    const sendButton = screen.getByRole('button', { name: /enviar/i })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })

  it('debe enviar mensaje y mostrar respuesta cuando la solicitud es exitosa', async () => {
    const mockResponse = {
      success: true,
      response: 'Respuesta del asistente',
      requiresConfirmation: false,
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    render(<FloatingAssistantChat />)
    const button = screen.getByRole('button', { name: /asistente/i })
    fireEvent.click(button)

    const input = screen.getByPlaceholderText(/escribe tu mensaje/i)
    fireEvent.change(input, { target: { value: 'test message' } })

    const sendButton = screen.getByRole('button', { name: /enviar/i })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText('test message')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('Respuesta del asistente')).toBeInTheDocument()
    })
  })

  it('debe mostrar modal de confirmación cuando se requiere confirmación', async () => {
    const mockResponse = {
      success: true,
      response: 'Se requiere confirmación',
      requiresConfirmation: true,
      action: 'change_user_status',
      params: { userAddress: '0x456', newStatus: 1 },
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    render(<FloatingAssistantChat />)
    const button = screen.getByRole('button', { name: /asistente/i })
    fireEvent.click(button)

    const input = screen.getByPlaceholderText(/escribe tu mensaje/i)
    fireEvent.change(input, { target: { value: 'aprueba usuario' } })

    const sendButton = screen.getByRole('button', { name: /enviar/i })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText(/confirmar/i)).toBeInTheDocument()
    })
  })
})



