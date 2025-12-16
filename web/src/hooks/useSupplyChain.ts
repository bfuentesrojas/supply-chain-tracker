'use client'

import { useState, useCallback } from 'react'
import { useWeb3 } from '@/contexts/Web3Context'
import { 
  Token, 
  Transfer, 
  User, 
  UserStatus, 
  TransferStatus 
} from '@/contracts/SupplyChain'
import { parseTransactionError } from '@/lib/errorHandler'

// Hook para operaciones del contrato SupplyChain
export function useSupplyChain() {
  const { contract, account } = useWeb3()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Limpiar error
  const clearError = useCallback(() => setError(null), [])

  // ============ User Management Functions ============

  // Solicitar rol de usuario
  const requestUserRole = useCallback(async (role: string): Promise<boolean> => {
    if (!contract) {
      setError('Contrato no disponible')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      const tx = await contract.requestUserRole(role)
      await tx.wait()
      return true
    } catch (err) {
      const message = parseTransactionError(err)
      setError(message)
      console.error('Error solicitando rol:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [contract])

  // Cambiar estado de usuario (solo admin)
  const changeStatusUser = useCallback(async (
    userAddress: string, 
    newStatus: UserStatus
  ): Promise<boolean> => {
    if (!contract) {
      setError('Contrato no disponible')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      const tx = await contract.changeStatusUser(userAddress, newStatus)
      await tx.wait()
      return true
    } catch (err) {
      const message = parseTransactionError(err)
      setError(message)
      console.error('Error cambiando estado:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [contract])

  // Obtener información de usuario
  const getUserInfo = useCallback(async (address: string): Promise<User | null> => {
    // #region agent log
    let providerNetwork = null;
    try { providerNetwork = await contract?.runner?.provider?.getNetwork(); } catch(e) {}
    console.log('[DEBUG] useSupplyChain:getUserInfo:entry', {address, hasContract: !!contract, contractAddress: contract?.target, chainId: providerNetwork?.chainId?.toString()});
    fetch('http://127.0.0.1:7242/ingest/c2977f82-4850-45da-ba1a-7bfcf18fe60a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSupplyChain.ts:getUserInfo:entry',message:'Entrada a getUserInfo',data:{address,hasContract:!!contract,contractAddress:contract?.target,chainId:providerNetwork?.chainId?.toString()},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,D'})}).catch(()=>{});
    // #endregion
    if (!contract) {
      setError('Contrato no disponible')
      return null
    }

    try {
      // #region agent log
      // Verificar otras funciones del contrato primero
      let adminAddress = null, isAdminResult = null, addressUserId = null;
      try { adminAddress = await contract.admin(); } catch(e) { adminAddress = 'ERROR: ' + (e instanceof Error ? e.message : String(e)); }
      try { isAdminResult = await contract.isAdmin(address); } catch(e) { isAdminResult = 'ERROR: ' + (e instanceof Error ? e.message : String(e)); }
      try { addressUserId = await contract.addressToUserId(address); } catch(e) { addressUserId = 'ERROR: ' + (e instanceof Error ? e.message : String(e)); }
      console.log('[DEBUG] useSupplyChain:getUserInfo:beforeCall', {address, contractTarget: contract.target, adminAddress, isAdminResult, addressUserId: addressUserId?.toString?.() || addressUserId});
      fetch('http://127.0.0.1:7242/ingest/c2977f82-4850-45da-ba1a-7bfcf18fe60a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSupplyChain.ts:getUserInfo:beforeCall',message:'Llamando contract.getUserInfo',data:{address,contractTarget:contract.target,adminAddress,isAdminResult,addressUserId:addressUserId?.toString?.() || addressUserId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,E'})}).catch(()=>{});
      // #endregion
      const user = await contract.getUserInfo(address)
      // #region agent log
      console.log('[DEBUG] useSupplyChain:getUserInfo:afterCall', {userId: user.id?.toString(), userAddress: user.userAddress, role: user.role, status: Number(user.status)});
      fetch('http://127.0.0.1:7242/ingest/c2977f82-4850-45da-ba1a-7bfcf18fe60a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSupplyChain.ts:getUserInfo:afterCall',message:'Resultado del contrato',data:{userId:user.id?.toString(),userAddress:user.userAddress,role:user.role,status:Number(user.status)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C,E'})}).catch(()=>{});
      // #endregion
      return {
        id: user.id,
        userAddress: user.userAddress,
        role: user.role,
        status: Number(user.status) as UserStatus
      }
    } catch (err) {
      // #region agent log
      console.log('[DEBUG] useSupplyChain:getUserInfo:error', {error: err instanceof Error ? err.message : String(err), address});
      fetch('http://127.0.0.1:7242/ingest/c2977f82-4850-45da-ba1a-7bfcf18fe60a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSupplyChain.ts:getUserInfo:error',message:'Error en contract.getUserInfo',data:{error:err instanceof Error ? err.message : String(err),address},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C,E'})}).catch(()=>{});
      // #endregion
      console.error('Error obteniendo usuario:', err)
      return null
    }
  }, [contract])

  // Verificar si es admin
  const isAdmin = useCallback(async (address: string): Promise<boolean> => {
    if (!contract) return false

    try {
      return await contract.isAdmin(address)
    } catch (err) {
      console.error('Error verificando admin:', err)
      return false
    }
  }, [contract])

  // ============ Token Management Functions ============

  // Crear token
  const createToken = useCallback(async (
    name: string,
    totalSupply: bigint,
    features: string,
    parentId: bigint
  ): Promise<boolean> => {
    if (!contract) {
      setError('Contrato no disponible')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      const tx = await contract.createToken(name, totalSupply, features, parentId)
      await tx.wait()
      return true
    } catch (err) {
      const message = parseTransactionError(err)
      setError(message)
      console.error('Error creando token:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [contract])

  // Obtener token
  const getToken = useCallback(async (tokenId: bigint): Promise<Token | null> => {
    if (!contract) {
      setError('Contrato no disponible')
      return null
    }

    try {
      const token = await contract.getToken(tokenId)
      return {
        id: token.id,
        creator: token.creator,
        name: token.name,
        totalSupply: token.totalSupply,
        features: token.features,
        parentId: token.parentId,
        dateCreated: token.dateCreated
      }
    } catch (err) {
      console.error('Error obteniendo token:', err)
      return null
    }
  }, [contract])

  // Obtener balance de token
  const getTokenBalance = useCallback(async (
    tokenId: bigint, 
    userAddress: string
  ): Promise<bigint> => {
    if (!contract) return BigInt(0)

    try {
      return await contract.getTokenBalance(tokenId, userAddress)
    } catch (err) {
      console.error('Error obteniendo balance:', err)
      return BigInt(0)
    }
  }, [contract])

  // ============ Transfer Management Functions ============

  // Crear transferencia
  const transfer = useCallback(async (
    to: string,
    tokenId: bigint,
    amount: bigint
  ): Promise<boolean> => {
    if (!contract) {
      setError('Contrato no disponible')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      const tx = await contract.transfer(to, tokenId, amount)
      await tx.wait()
      return true
    } catch (err) {
      const message = parseTransactionError(err)
      setError(message)
      console.error('Error transfiriendo:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [contract])

  // Aceptar transferencia
  const acceptTransfer = useCallback(async (transferId: bigint): Promise<boolean> => {
    if (!contract) {
      setError('Contrato no disponible')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      const tx = await contract.acceptTransfer(transferId)
      await tx.wait()
      return true
    } catch (err) {
      const message = parseTransactionError(err)
      setError(message)
      console.error('Error aceptando transferencia:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [contract])

  // Rechazar transferencia
  const rejectTransfer = useCallback(async (transferId: bigint): Promise<boolean> => {
    if (!contract) {
      setError('Contrato no disponible')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      const tx = await contract.rejectTransfer(transferId)
      await tx.wait()
      return true
    } catch (err) {
      const message = parseTransactionError(err)
      setError(message)
      console.error('Error rechazando transferencia:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [contract])

  // Obtener transferencia
  const getTransfer = useCallback(async (transferId: bigint): Promise<Transfer | null> => {
    if (!contract) {
      setError('Contrato no disponible')
      return null
    }

    try {
      const t = await contract.getTransfer(transferId)
      return {
        id: t.id,
        from: t.from,
        to: t.to,
        tokenId: t.tokenId,
        dateCreated: t.dateCreated,
        amount: t.amount,
        status: Number(t.status) as TransferStatus
      }
    } catch (err) {
      console.error('Error obteniendo transferencia:', err)
      return null
    }
  }, [contract])

  // ============ Auxiliary Functions ============

  // Obtener tokens del usuario
  const getUserTokens = useCallback(async (address?: string): Promise<bigint[]> => {
    if (!contract) return []

    try {
      const targetAddress = address || account
      if (!targetAddress) return []
      
      return await contract.getUserTokens(targetAddress)
    } catch (err) {
      console.error('Error obteniendo tokens del usuario:', err)
      return []
    }
  }, [contract, account])

  // Obtener transferencias del usuario
  const getUserTransfers = useCallback(async (address?: string): Promise<bigint[]> => {
    if (!contract) return []

    try {
      const targetAddress = address || account
      if (!targetAddress) return []
      
      return await contract.getUserTransfers(targetAddress)
    } catch (err) {
      console.error('Error obteniendo transferencias del usuario:', err)
      return []
    }
  }, [contract, account])

  // Obtener total de tokens
  const getTotalTokens = useCallback(async (): Promise<bigint> => {
    if (!contract) return BigInt(0)

    try {
      return await contract.getTotalTokens()
    } catch (err) {
      console.error('Error obteniendo total de tokens:', err)
      return BigInt(0)
    }
  }, [contract])

  // Obtener total de transferencias
  const getTotalTransfers = useCallback(async (): Promise<bigint> => {
    if (!contract) return BigInt(0)

    try {
      return await contract.getTotalTransfers()
    } catch (err) {
      console.error('Error obteniendo total de transferencias:', err)
      return BigInt(0)
    }
  }, [contract])

  // Obtener transferencias de un token específico
  const getTokenTransfers = useCallback(async (tokenId: bigint): Promise<Transfer[]> => {
    if (!contract) return []

    try {
      const totalTransfers = await contract.getTotalTransfers()
      const transfers: Transfer[] = []
      
      for (let i = BigInt(1); i <= totalTransfers; i++) {
        try {
          const t = await contract.getTransfer(i)
          if (t.tokenId === tokenId) {
            transfers.push({
              id: t.id,
              from: t.from,
              to: t.to,
              tokenId: t.tokenId,
              dateCreated: t.dateCreated,
              amount: t.amount,
              status: Number(t.status) as TransferStatus
            })
          }
        } catch (err) {
          // Continuar si hay error en una transferencia
        }
      }
      
      // Ordenar por fecha de creación
      return transfers.sort((a, b) => Number(a.dateCreated - b.dateCreated))
    } catch (err) {
      console.error('Error obteniendo transferencias del token:', err)
      return []
    }
  }, [contract])

  // Obtener jerarquía completa de un token (hasta el root)
  const getTokenHierarchy = useCallback(async (tokenId: bigint): Promise<Token[]> => {
    if (!contract) return []

    try {
      const hierarchy: Token[] = []
      let currentId = tokenId
      
      while (currentId > BigInt(0)) {
        const token = await contract.getToken(currentId)
        if (!token || token.id === BigInt(0)) break
        
        hierarchy.push({
          id: token.id,
          creator: token.creator,
          name: token.name,
          totalSupply: token.totalSupply,
          features: token.features,
          parentId: token.parentId,
          dateCreated: token.dateCreated
        })
        
        currentId = token.parentId
      }
      
      return hierarchy
    } catch (err) {
      console.error('Error obteniendo jerarquía del token:', err)
      return []
    }
  }, [contract])

  // Obtener total de usuarios
  const getTotalUsers = useCallback(async (): Promise<bigint> => {
    if (!contract) return BigInt(0)

    try {
      return await contract.getTotalUsers()
    } catch (err) {
      console.error('Error obteniendo total de usuarios:', err)
      return BigInt(0)
    }
  }, [contract])

  // Obtener dirección del admin
  const getAdmin = useCallback(async (): Promise<string | null> => {
    if (!contract) return null

    try {
      return await contract.admin()
    } catch (err) {
      console.error('Error obteniendo admin:', err)
      return null
    }
  }, [contract])

  // Obtener usuario por ID
  const getUserById = useCallback(async (userId: bigint): Promise<User | null> => {
    if (!contract) return null

    try {
      const user = await contract.users(userId)
      if (user.id === BigInt(0)) return null
      return {
        id: user.id,
        userAddress: user.userAddress,
        role: user.role,
        status: Number(user.status) as UserStatus
      }
    } catch (err) {
      console.error('Error obteniendo usuario por ID:', err)
      return null
    }
  }, [contract])

  // Obtener todos los usuarios (paginado)
  const getAllUsers = useCallback(async (page: number = 1, pageSize: number = 10): Promise<{ users: User[], total: number }> => {
    if (!contract) return { users: [], total: 0 }

    try {
      const total = await contract.getTotalUsers()
      const totalNum = Number(total)
      
      if (totalNum === 0) return { users: [], total: 0 }

      const startId = (page - 1) * pageSize + 1
      const endId = Math.min(startId + pageSize - 1, totalNum)
      
      const usersData: User[] = []
      
      for (let i = startId; i <= endId; i++) {
        try {
          const user = await contract.users(BigInt(i))
          if (user.id > BigInt(0)) {
            usersData.push({
              id: user.id,
              userAddress: user.userAddress,
              role: user.role,
              status: Number(user.status) as UserStatus
            })
          }
        } catch (err) {
          console.error(`Error obteniendo usuario ${i}:`, err)
        }
      }

      return { users: usersData, total: totalNum }
    } catch (err) {
      console.error('Error obteniendo todos los usuarios:', err)
      return { users: [], total: 0 }
    }
  }, [contract])

  // Obtener usuarios aprobados por rol (para transferencias)
  const getUsersByRole = useCallback(async (targetRole: string): Promise<User[]> => {
    if (!contract) return []

    try {
      const total = await contract.getTotalUsers()
      const totalNum = Number(total)
      
      if (totalNum === 0) return []

      const usersData: User[] = []
      
      for (let i = BigInt(1); i <= totalNum; i++) {
        try {
          const user = await contract.users(i)
          if (
            user.id > BigInt(0) && 
            user.status === UserStatus.Approved &&
            user.role.toLowerCase() === targetRole.toLowerCase()
          ) {
            usersData.push({
              id: user.id,
              userAddress: user.userAddress,
              role: user.role,
              status: Number(user.status) as UserStatus
            })
          }
        } catch (err) {
          // Continuar si hay error en un usuario
        }
      }

      return usersData
    } catch (err) {
      console.error('Error obteniendo usuarios por rol:', err)
      return []
    }
  }, [contract])

  return {
    // Estado
    isLoading,
    error,
    clearError,
    
    // Funciones de usuarios
    requestUserRole,
    changeStatusUser,
    getUserInfo,
    getUserById,
    getAllUsers,
    getUsersByRole,
    isAdmin,
    getAdmin,
    
    // Funciones de tokens
    createToken,
    getToken,
    getTokenBalance,
    
    // Funciones de transferencias
    transfer,
    acceptTransfer,
    rejectTransfer,
    getTransfer,
    
    // Funciones auxiliares
    getUserTokens,
    getUserTransfers,
    getTotalTokens,
    getTotalTransfers,
    getTotalUsers,
    
    // Funciones de traza
    getTokenTransfers,
    getTokenHierarchy
  }
}
