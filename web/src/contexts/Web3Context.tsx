'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { BrowserProvider, Contract, Signer, getAddress } from 'ethers'
import { SUPPLY_CHAIN_ABI, CONTRACT_ADDRESS, EXPECTED_CHAIN_ID, ANVIL_NETWORK_CONFIG } from '@/contracts/SupplyChain'
import { parseTransactionError } from '@/lib/errorHandler'

// Tipos para el contexto
interface Web3ContextType {
  provider: BrowserProvider | null
  signer: Signer | null
  contract: Contract | null
  account: string | null
  chainId: number | null
  isConnected: boolean
  isLoading: boolean
  error: string | null
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  switchToAnvilNetwork: () => Promise<boolean>
}

// Interfaz para errores de MetaMask
interface MetaMaskError {
  code: number
  message: string
}

// Crear el contexto
const Web3Context = createContext<Web3ContextType | undefined>(undefined)

// Provider del contexto
interface Web3ProviderProps {
  children: ReactNode
}

export function Web3Provider({ children }: Web3ProviderProps) {
  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [signer, setSigner] = useState<Signer | null>(null)
  const [contract, setContract] = useState<Contract | null>(null)
  const [account, setAccount] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Ref para prevenir múltiples solicitudes simultáneas
  const isConnectingRef = useRef(false)

  const isConnected = !!account

  // Función auxiliar para establecer la conexión con una cuenta específica
  const setupConnection = useCallback(async (selectedAccount: string) => {
    if (typeof window === 'undefined' || !window.ethereum) return

    try {
      const browserProvider = new BrowserProvider(window.ethereum)
      const userSigner = await browserProvider.getSigner()
      const network = await browserProvider.getNetwork()

      const supplyChainContract = new Contract(
        CONTRACT_ADDRESS,
        SUPPLY_CHAIN_ABI,
        userSigner
      )

      setProvider(browserProvider)
      setSigner(userSigner)
      setContract(supplyChainContract)
      // Normalizar la dirección usando getAddress para asegurar formato correcto
      setAccount(getAddress(selectedAccount))
      setChainId(Number(network.chainId))
      setError(null)

      console.log('✅ Wallet conectada:', selectedAccount)
      console.log('📡 Chain ID:', network.chainId)
      console.log('📄 Contrato:', CONTRACT_ADDRESS)
    } catch (err) {
      console.error('Error en setupConnection:', err)
      throw err
    }
  }, [])

  // Función para conectar la wallet - ABRE METAMASK para seleccionar cuenta
  const connectWallet = useCallback(async () => {
    // Prevenir múltiples solicitudes simultáneas
    if (isConnectingRef.current) {
      console.log('⚠️ Ya hay una solicitud de conexión en progreso...')
      return
    }

    if (typeof window === 'undefined' || !window.ethereum) {
      setError('MetaMask no está instalado. Por favor, instálalo para continuar.')
      return
    }

    isConnectingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      console.log('🔗 Solicitando conexión a MetaMask...')
      
      // wallet_requestPermissions SIEMPRE abre MetaMask para seleccionar cuenta
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      })

      // Obtener las cuentas después de que el usuario seleccione
      const accounts = await window.ethereum.request({
        method: 'eth_accounts',
      }) as string[]

      if (!accounts || accounts.length === 0) {
        throw new Error('No se seleccionó ninguna cuenta')
      }

      await setupConnection(accounts[0])

    } catch (err) {
      console.error('❌ Error conectando wallet:', err)
      setError(parseTransactionError(err))
    } finally {
      setIsLoading(false)
      isConnectingRef.current = false
    }
  }, [setupConnection])

  // Función para desconectar la wallet
  const disconnectWallet = useCallback(() => {
    setProvider(null)
    setSigner(null)
    setContract(null)
    setAccount(null)
    setChainId(null)
    setError(null)
    console.log('🔌 Wallet desconectada')
  }, [])

  // Función para cambiar a la red local de Anvil
  const switchToAnvilNetwork = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('MetaMask no está instalado')
      return false
    }

    try {
      console.log('🔄 Intentando cambiar a red Anvil (chainId:', EXPECTED_CHAIN_ID, ')...')
      
      // Primero intentar cambiar a la red si ya existe
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ANVIL_NETWORK_CONFIG.chainId }],
      })
      
      console.log('✅ Cambiado a red Anvil exitosamente')
      return true
    } catch (switchError) {
      const err = switchError as MetaMaskError
      
      // Error 4902 significa que la red no está añadida, intentar añadirla
      if (err.code === 4902) {
        try {
          console.log('📡 Red no encontrada, añadiendo Anvil Local...')
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [ANVIL_NETWORK_CONFIG],
          })
          console.log('✅ Red Anvil añadida y seleccionada')
          return true
        } catch (addError) {
          console.error('❌ Error añadiendo red Anvil:', addError)
          setError('Error al añadir la red local de Anvil')
          return false
        }
      }
      
      // Usuario canceló o error desconocido
      console.error('❌ Error cambiando de red:', switchError)
      setError(parseTransactionError(switchError))
      return false
    }
  }, [])

  // Configurar listeners de MetaMask
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return

    const ethereum = window.ethereum

    // Handler para cambio de cuentas
    const handleAccountsChanged = (accounts: unknown) => {
      const accs = accounts as string[]
      console.log('🔄 Cuentas cambiaron:', accs)
      
      if (accs.length === 0) {
        // Usuario desconectó todas las cuentas
        disconnectWallet()
      } else {
        // Usuario cambió a otra cuenta - actualizar sin abrir MetaMask
        const newAccount = accs[0].toLowerCase()
        if (newAccount !== account) {
          console.log('🔄 Actualizando a nueva cuenta:', newAccount)
          setupConnection(accs[0])
        }
      }
    }

    // Handler para cambio de red
    const handleChainChanged = (newChainId: unknown) => {
      console.log('🔗 Red cambiada:', newChainId)
      // Recargar para evitar problemas de estado con la nueva red
      window.location.reload()
    }

    // Handler para desconexión
    const handleDisconnect = (error: unknown) => {
      console.log('🔌 MetaMask desconectado:', error)
      disconnectWallet()
    }

    // Registrar listeners
    ethereum.on('accountsChanged', handleAccountsChanged)
    ethereum.on('chainChanged', handleChainChanged)
    ethereum.on('disconnect', handleDisconnect)

    // Cleanup
    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged)
      ethereum.removeListener('chainChanged', handleChainChanged)
      ethereum.removeListener('disconnect', handleDisconnect)
    }
  }, [account, setupConnection, disconnectWallet])

  // Restaurar conexión si ya hay permisos previos (NO abre MetaMask)
  useEffect(() => {
    const checkExistingConnection = async () => {
      if (typeof window === 'undefined' || !window.ethereum) return

      try {
        // eth_accounts NO abre MetaMask, solo verifica conexiones existentes
        const accounts = await window.ethereum.request({
          method: 'eth_accounts',
        }) as string[]

        if (accounts && accounts.length > 0) {
          console.log('♻️ Restaurando conexión existente:', accounts[0])
          await setupConnection(accounts[0])
        }
      } catch (err) {
        console.error('Error verificando conexión existente:', err)
      }
    }

    checkExistingConnection()
  }, [setupConnection])

  const value: Web3ContextType = {
    provider,
    signer,
    contract,
    account,
    chainId,
    isConnected,
    isLoading,
    error,
    connectWallet,
    disconnectWallet,
    switchToAnvilNetwork,
  }

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  )
}

// Hook para usar el contexto
export function useWeb3() {
  const context = useContext(Web3Context)
  if (context === undefined) {
    throw new Error('useWeb3 debe ser usado dentro de un Web3Provider')
  }
  return context
}

// Declaración de tipos para window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on: (event: string, callback: (arg: unknown) => void) => void
      removeListener: (event: string, callback: (arg: unknown) => void) => void
      isMetaMask?: boolean
    }
  }
}
