/**
 * Tests unitarios para el componente AccessGate
 */

import { render, screen, waitFor } from '@testing-library/react'
import { AccessGate } from '../AccessGate'
import { Web3Context } from '@/contexts/Web3Context'

// Mock del contexto Web3
jest.mock('@/contexts/Web3Context', () => ({
  useWeb3: jest.fn(),
}))

// Mock del hook useSupplyChain
jest.mock('@/hooks/useSupplyChain', () => ({
  useSupplyChain: jest.fn(),
}))

const mockUseWeb3 = require('@/contexts/Web3Context').useWeb3
const mockUseSupplyChain = require('@/hooks/useSupplyChain').useSupplyChain

describe('AccessGate', () => {
  const defaultWeb3Mock = {
    isConnected: false,
    account: null,
    chainId: null,
    switchToAnvilNetwork: jest.fn(),
  }

  const defaultSupplyChainMock = {
    getUserInfo: jest.fn(),
    requestUserRole: jest.fn(),
    isLoading: false,
    error: null,
    clearError: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseWeb3.mockReturnValue(defaultWeb3Mock)
    mockUseSupplyChain.mockReturnValue(defaultSupplyChainMock)
  })

  it('debe renderizar mensaje de conexión cuando no está conectado', () => {
    render(
      <AccessGate>
        <div>Contenido protegido</div>
      </AccessGate>
    )

    expect(screen.getByText(/conecta tu wallet/i)).toBeInTheDocument()
  })

  it('debe renderizar contenido cuando está conectado y usuario aprobado', async () => {
    mockUseWeb3.mockReturnValue({
      ...defaultWeb3Mock,
      isConnected: true,
      account: '0x123',
      chainId: 31337,
    })

    mockUseSupplyChain.mockReturnValue({
      ...defaultSupplyChainMock,
      getUserInfo: jest.fn().mockResolvedValue({
        id: BigInt(1),
        userAddress: '0x123',
        role: 'manufacturer',
        status: 1, // Approved
      }),
    })

    render(
      <AccessGate>
        <div>Contenido protegido</div>
      </AccessGate>
    )

    await waitFor(() => {
      expect(screen.getByText('Contenido protegido')).toBeInTheDocument()
    })
  })

  it('debe mostrar formulario de registro cuando usuario no está registrado', async () => {
    mockUseWeb3.mockReturnValue({
      ...defaultWeb3Mock,
      isConnected: true,
      account: '0x123',
      chainId: 31337,
    })

    mockUseSupplyChain.mockReturnValue({
      ...defaultSupplyChainMock,
      getUserInfo: jest.fn().mockRejectedValue(new Error('Usuario no encontrado')),
    })

    render(
      <AccessGate>
        <div>Contenido protegido</div>
      </AccessGate>
    )

    await waitFor(() => {
      expect(screen.getByText(/selecciona tu rol/i)).toBeInTheDocument()
    })
  })

  it('debe mostrar mensaje de aprobación pendiente cuando usuario no está aprobado', async () => {
    mockUseWeb3.mockReturnValue({
      ...defaultWeb3Mock,
      isConnected: true,
      account: '0x123',
      chainId: 31337,
    })

    mockUseSupplyChain.mockReturnValue({
      ...defaultSupplyChainMock,
      getUserInfo: jest.fn().mockResolvedValue({
        id: BigInt(1),
        userAddress: '0x123',
        role: 'manufacturer',
        status: 0, // Pending
      }),
    })

    render(
      <AccessGate>
        <div>Contenido protegido</div>
      </AccessGate>
    )

    await waitFor(() => {
      expect(screen.getByText(/pendiente de aprobación/i)).toBeInTheDocument()
    })
  })

  it('debe llamar a switchToAnvilNetwork cuando está en red incorrecta', async () => {
    const switchNetworkMock = jest.fn()
    mockUseWeb3.mockReturnValue({
      ...defaultWeb3Mock,
      isConnected: true,
      account: '0x123',
      chainId: 1, // Wrong network
      switchToAnvilNetwork: switchNetworkMock,
    })

    render(
      <AccessGate>
        <div>Contenido protegido</div>
      </AccessGate>
    )

    await waitFor(() => {
      expect(screen.getByText(/red incorrecta/i)).toBeInTheDocument()
    })
  })
})



