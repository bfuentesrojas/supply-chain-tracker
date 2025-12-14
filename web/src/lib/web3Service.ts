import { ethers } from 'ethers'

// Utilidades para formatear direcciones
export const formatAddress = (address: string, chars: number = 4): string => {
  if (!address) return ''
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

// Formatear timestamp a fecha legible
export const formatTimestamp = (timestamp: bigint): string => {
  const date = new Date(Number(timestamp) * 1000)
  return date.toLocaleString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Formatear precio (wei a ether)
export const formatPrice = (priceWei: bigint): string => {
  return ethers.formatEther(priceWei)
}

// Parsear precio (ether a wei)
export const parsePrice = (priceEther: string): bigint => {
  return ethers.parseEther(priceEther)
}

// Verificar si es una dirección válida
export const isValidAddress = (address: string): boolean => {
  return ethers.isAddress(address)
}

// Obtener el balance de una cuenta
export const getBalance = async (
  provider: ethers.BrowserProvider,
  address: string
): Promise<string> => {
  try {
    const balance = await provider.getBalance(address)
    return ethers.formatEther(balance)
  } catch (error) {
    console.error('Error obteniendo balance:', error)
    return '0'
  }
}

// Configuración de redes soportadas
export const SUPPORTED_NETWORKS: Record<number, {
  name: string
  currency: string
  rpcUrl: string
  explorerUrl?: string
}> = {
  1: {
    name: 'Ethereum Mainnet',
    currency: 'ETH',
    rpcUrl: 'https://mainnet.infura.io/v3/',
    explorerUrl: 'https://etherscan.io'
  },
  5: {
    name: 'Goerli Testnet',
    currency: 'ETH',
    rpcUrl: 'https://goerli.infura.io/v3/',
    explorerUrl: 'https://goerli.etherscan.io'
  },
  11155111: {
    name: 'Sepolia Testnet',
    currency: 'ETH',
    rpcUrl: 'https://sepolia.infura.io/v3/',
    explorerUrl: 'https://sepolia.etherscan.io'
  },
  31337: {
    name: 'Localhost (Anvil)',
    currency: 'ETH',
    rpcUrl: 'http://127.0.0.1:8545'
  },
  1337: {
    name: 'Localhost (Ganache)',
    currency: 'ETH',
    rpcUrl: 'http://127.0.0.1:8545'
  }
}

// Verificar si la red es soportada
export const isSupportedNetwork = (chainId: number): boolean => {
  return chainId in SUPPORTED_NETWORKS
}

// Obtener información de la red
export const getNetworkInfo = (chainId: number) => {
  return SUPPORTED_NETWORKS[chainId] || null
}

// Solicitar cambio de red en MetaMask
export const switchNetwork = async (chainId: number): Promise<boolean> => {
  if (typeof window === 'undefined' || !window.ethereum) {
    return false
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }]
    })
    return true
  } catch (error: unknown) {
    // Si la red no existe, intentar agregarla
    if ((error as { code?: number })?.code === 4902) {
      const networkInfo = SUPPORTED_NETWORKS[chainId]
      if (networkInfo) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${chainId.toString(16)}`,
              chainName: networkInfo.name,
              nativeCurrency: {
                name: networkInfo.currency,
                symbol: networkInfo.currency,
                decimals: 18
              },
              rpcUrls: [networkInfo.rpcUrl],
              blockExplorerUrls: networkInfo.explorerUrl ? [networkInfo.explorerUrl] : undefined
            }]
          })
          return true
        } catch (addError) {
          console.error('Error agregando red:', addError)
        }
      }
    }
    console.error('Error cambiando red:', error)
    return false
  }
}

// Generar URL del explorador para una transacción
export const getExplorerTxUrl = (chainId: number, txHash: string): string | null => {
  const network = SUPPORTED_NETWORKS[chainId]
  if (!network?.explorerUrl) return null
  return `${network.explorerUrl}/tx/${txHash}`
}

// Generar URL del explorador para una dirección
export const getExplorerAddressUrl = (chainId: number, address: string): string | null => {
  const network = SUPPORTED_NETWORKS[chainId]
  if (!network?.explorerUrl) return null
  return `${network.explorerUrl}/address/${address}`
}







