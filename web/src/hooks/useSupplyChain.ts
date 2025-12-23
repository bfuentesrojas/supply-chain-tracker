'use client'

import { useState, useCallback } from 'react'
import { useWeb3 } from '@/contexts/Web3Context'
import { getAddress } from 'ethers'
import { 
  Token, 
  Transfer, 
  User, 
  UserStatus, 
  TransferStatus,
  TokenType
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
    // #endregion
    if (!contract) {
      setError('Contrato no disponible')
      return null
    }

    // Verificar que el contrato esté desplegado intentando leer una variable pública simple
    try {
      await contract.nextTokenId()
    } catch (err: any) {
      // Si falla, el contrato probablemente no está desplegado
      if (err.message && err.message.includes('could not decode result data')) {
        console.warn('⚠️ El contrato parece no estar desplegado en', contract.target)
        setError('El contrato no está desplegado en esta dirección. Por favor, despliega el contrato primero.')
        return null
      }
      // Si es otro error, continuar normalmente
    }

    try {
      // Normalizar la dirección usando getAddress para asegurar formato correcto
      const normalizedAddress = getAddress(address)
      
      // Verificar primero si el usuario existe antes de llamar a getUserInfo
      // Esto evita errores de decodificación cuando el usuario no está registrado
      let userId: bigint | null = null;
      try {
        userId = await contract.addressToUserId(normalizedAddress)
      } catch (err: any) {
        // Si hay error al obtener userId, el usuario no existe
        console.log('[DEBUG] useSupplyChain:getUserInfo:addressToUserIdError', {
          error: err.message,
          normalizedAddress
        })
        return null
      }
      
      // #region agent log
      // Verificar otras funciones del contrato para debugging
      let adminAddress = null;
      try { adminAddress = await contract.admin(); } catch(e) { adminAddress = 'ERROR: ' + (e instanceof Error ? e.message : String(e)); }
      console.log('[DEBUG] useSupplyChain:getUserInfo:beforeCall', {
        address, 
        normalizedAddress, 
        contractTarget: contract.target, 
        adminAddress,
        userId: userId?.toString() || '0',
        userExists: userId && userId !== BigInt(0)
      });
      // #endregion
      
      if (!userId || userId === BigInt(0)) {
        // Verificar si es el admin pero no está registrado como usuario
        let isAdminButNotRegistered = false
        if (adminAddress && typeof adminAddress === 'string') {
          isAdminButNotRegistered = normalizedAddress.toLowerCase() === adminAddress.toLowerCase()
        }
        
        console.log('[DEBUG] useSupplyChain:getUserInfo:userNotRegistered', {
          normalizedAddress,
          adminAddress,
          isPotentialAdmin: isAdminButNotRegistered
        })
        
        // Si es admin pero no está registrado, esto es un problema
        if (isAdminButNotRegistered) {
          console.warn('[WARNING] El admin no está registrado como usuario en el contrato. Esto puede indicar que el contrato no se desplegó correctamente o que el admin no se registró en el constructor.')
        }
        
        return null
      }
      
      const user = await contract.getUserInfo(normalizedAddress)
      // #region agent log
      console.log('[DEBUG] useSupplyChain:getUserInfo:afterCall', {userId: user.id?.toString(), userAddress: user.userAddress, role: user.role, status: Number(user.status)});
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
      // #endregion
      console.error('Error obteniendo usuario:', err)
      return null
    }
  }, [contract])

  // Verificar si es admin
  const isAdmin = useCallback(async (address: string): Promise<boolean> => {
    if (!contract) {
      console.log('[DEBUG] isAdmin: No hay contrato disponible')
      return false
    }

    try {
      // Normalizar la dirección usando getAddress para asegurar formato correcto
      const normalizedAddress = getAddress(address)
      console.log('[DEBUG] isAdmin: Verificando admin para dirección:', normalizedAddress)
      
      // Obtener la dirección del admin del contrato
      let adminAddress: string;
      try {
        adminAddress = await contract.admin()
        console.log('[DEBUG] isAdmin: Dirección del admin en el contrato:', adminAddress)
      } catch (err: any) {
        // Si no se puede obtener admin, el contrato puede no estar desplegado
        console.error('[DEBUG] isAdmin: Error obteniendo dirección del admin:', err)
        return false
      }
      
      // Comparar direcciones (case-insensitive)
      const isAdminResult = normalizedAddress.toLowerCase() === adminAddress.toLowerCase()
      console.log('[DEBUG] isAdmin: Resultado de verificación:', isAdminResult, {
        normalizedAddress: normalizedAddress.toLowerCase(),
        adminAddress: adminAddress.toLowerCase()
      })
      return isAdminResult
    } catch (err) {
      console.error('[DEBUG] isAdmin: Error verificando admin:', err)
      return false
    }
  }, [contract])

  // ============ Token Management Functions ============

  // Crear token
  const createToken = useCallback(async (
    name: string,
    totalSupply: bigint,
    features: string,
    tokenType: number, // TokenType enum como número (0-4)
    parentIds: bigint[],
    parentAmounts: bigint[],
    isRecall: boolean = false
  ): Promise<boolean> => {
    if (!contract) {
      setError('Contrato no disponible')
      return false
    }

    if (parentIds.length !== parentAmounts.length) {
      setError('parentIds y parentAmounts deben tener la misma longitud')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      // Asegurar que los arrays no sean undefined/null y sean del tipo correcto
      const safeParentIds: bigint[] = (parentIds || []).map(id => BigInt(id.toString()))
      const safeParentAmounts: bigint[] = (parentAmounts || []).map(amt => BigInt(amt.toString()))
      
      console.log('[DEBUG] createToken:', {
        name,
        totalSupply: totalSupply.toString(),
        tokenType,
        parentIdsLength: safeParentIds.length,
        parentAmountsLength: safeParentAmounts.length,
        parentIds: safeParentIds.map(id => id.toString()),
        parentAmounts: safeParentAmounts.map(amt => amt.toString()),
        parentIdsType: typeof safeParentIds[0],
        parentAmountsType: typeof safeParentAmounts[0]
      })

      // Asegurar que los arrays sean realmente arrays y no undefined
      if (!Array.isArray(safeParentIds) || !Array.isArray(safeParentAmounts)) {
        setError('Los arrays de parentIds y parentAmounts deben ser arrays válidos')
        return false
      }

      // Validar nombre no vacío
      if (!name || name.trim().length === 0) {
        setError('El nombre del token no puede estar vacío')
        return false
      }

      // Validar totalSupply mayor a 0
      if (totalSupply <= BigInt(0)) {
        setError('El supply debe ser mayor a 0')
        return false
      }

      console.log('[DEBUG] createToken: calling contract with:', {
        name: name.trim(),
        totalSupply: totalSupply.toString(),
        tokenType,
        parentIds: safeParentIds,
        parentAmounts: safeParentAmounts,
        featuresLength: features.length,
        parentIdsIsArray: Array.isArray(safeParentIds),
        parentAmountsIsArray: Array.isArray(safeParentAmounts)
      })

      // Intentar estimar el gas primero para obtener un error más descriptivo
      try {
        const gasEstimate = await contract.createToken.estimateGas(name.trim(), totalSupply, features, tokenType, safeParentIds, safeParentAmounts, isRecall)
        console.log('[DEBUG] Gas estimate:', gasEstimate.toString())
      } catch (estimateErr: any) {
        console.error('[DEBUG] Gas estimate failed:', estimateErr)
        // El error de estimación puede tener más información
        if (estimateErr.data) {
          console.error('[DEBUG] Estimate error data:', estimateErr.data)
        }
        if (estimateErr.reason) {
          console.error('[DEBUG] Estimate error reason:', estimateErr.reason)
        }
        // Intentar decodificar el error
        try {
          const decoded = contract.interface.parseError(estimateErr.data || '')
          console.error('[DEBUG] Decoded error:', decoded)
        } catch (decodeErr) {
          console.error('[DEBUG] Could not decode error')
        }
        throw estimateErr
      }

      const tx = await contract.createToken(name.trim(), totalSupply, features, tokenType, safeParentIds, safeParentAmounts, isRecall)
      await tx.wait()
      return true
    } catch (err) {
      const message = parseTransactionError(err)
      setError(message)
      console.error('Error creando token:', err)
      // Log detallado del error para debugging
      if (err && typeof err === 'object') {
        const errObj = err as any
        console.error('Error details:', {
          code: errObj.code,
          message: errObj.message,
          reason: errObj.reason,
          data: errObj.data,
          shortMessage: errObj.shortMessage,
          error: errObj.error,
          info: errObj.info
        })
        // El mensaje ya fue parseado por parseTransactionError, usarlo directamente
        // Solo intentar decodificar si el mensaje es muy genérico
        if (message === 'Error en la ejecución del contrato' && errObj.data && contract) {
          try {
            const decoded = contract.interface.parseError(errObj.data)
            console.error('[DEBUG] Decoded error from data:', decoded)
            // Si decodificamos algo útil, intentar parsearlo también
            if (decoded?.name) {
              const enhancedErr = { ...errObj, reason: decoded.name }
              const enhancedMessage = parseTransactionError(enhancedErr)
              if (enhancedMessage !== message) {
                setError(enhancedMessage)
                return false
              }
            }
          } catch (decodeErr) {
            console.error('[DEBUG] Could not decode error data')
          }
        }
      }
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
        tokenType: Number(token.tokenType) as TokenType,
        parentIds: token.parentIds.map((id: bigint) => id),
        parentAmounts: token.parentAmounts.map((amt: bigint) => amt),
        dateCreated: token.dateCreated,
        recall: token.recall || false
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
      const visited = new Set<string>() // Para evitar ciclos
      
      // Construir jerarquía nivel por nivel usando BFS
      // Esto asegura que todos los padres de un token se muestren en el mismo nivel
      let currentLevel: bigint[] = [tokenId]
      
      while (currentLevel.length > 0) {
        const nextLevel: bigint[] = []
        const currentLevelTokens: Token[] = []
        
        // Procesar todos los tokens del nivel actual
        for (const id of currentLevel) {
          if (!id || id === BigInt(0)) continue
          
          const idStr = id.toString()
          if (visited.has(idStr)) continue // Evitar ciclos
          visited.add(idStr)
          
          const token = await contract.getToken(id)
          if (!token || token.id === BigInt(0)) continue
          
          // Agregar el token al nivel actual
          currentLevelTokens.push({
            id: token.id,
            creator: token.creator,
            name: token.name,
            totalSupply: token.totalSupply,
            features: token.features,
            tokenType: Number(token.tokenType) as TokenType,
            parentIds: token.parentIds.map((id: bigint) => id),
            parentAmounts: token.parentAmounts.map((amt: bigint) => amt),
            dateCreated: token.dateCreated,
            recall: token.recall || false
          })
          
          // Agregar todos los padres al siguiente nivel
          // Esto permite que múltiples padres se muestren juntos en el mismo nivel
          for (const parentId of token.parentIds) {
            if (parentId > BigInt(0) && !visited.has(parentId.toString())) {
              nextLevel.push(parentId)
            }
          }
        }
        
        // Agregar todos los tokens del nivel actual a la jerarquía
        // Esto asegura que los tokens con múltiples padres se muestren juntos
        hierarchy.push(...currentLevelTokens)
        
        currentLevel = nextLevel
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
      
      console.log('[DEBUG] getUsersByRole:', {
        targetRole,
        totalUsers: totalNum
      })
      
      if (totalNum === 0) return []

      const usersData: User[] = []
      
      for (let i = BigInt(1); i <= totalNum; i++) {
        try {
          const user = await contract.users(i)
          const userRoleLower = user.role.toLowerCase()
          const targetRoleLower = targetRole.toLowerCase()
          const isMatch = userRoleLower === targetRoleLower
          
          const statusNum = Number(user.status)
          const isApprovedCheck = statusNum === UserStatus.Approved
          const idValidCheck = user.id > BigInt(0)
          const allConditionsMet = idValidCheck && isApprovedCheck && isMatch
          
          console.log('[DEBUG] getUsersByRole - checking user:', {
            id: user.id.toString(),
            address: user.userAddress,
            role: user.role,
            roleLower: userRoleLower,
            targetRoleLower,
            isMatch,
            status: statusNum,
            statusRaw: user.status,
            statusType: typeof user.status,
            UserStatusApproved: UserStatus.Approved,
            isApproved: isApprovedCheck,
            idValid: idValidCheck,
            allConditionsMet: allConditionsMet
          })
          
          if (allConditionsMet) {
            console.log('[DEBUG] getUsersByRole - ADDING USER:', {
              id: user.id.toString(),
              address: user.userAddress,
              role: user.role
            })
            usersData.push({
              id: user.id,
              userAddress: user.userAddress,
              role: user.role,
              status: Number(user.status) as UserStatus
            })
          } else {
            console.log('[DEBUG] getUsersByRole - USER NOT ADDED, reasons:', {
              idValid: idValidCheck,
              isApproved: isApprovedCheck,
              isMatch: isMatch,
              statusNum,
              UserStatusApproved: UserStatus.Approved
            })
          }
        } catch (err) {
          console.error(`[DEBUG] Error obteniendo usuario ${i}:`, err)
          // Continuar si hay error en un usuario
        }
      }

      console.log('[DEBUG] getUsersByRole result:', {
        targetRole,
        foundUsers: usersData.length,
        users: usersData.map(u => ({ id: u.id.toString(), address: u.userAddress, role: u.role }))
      })

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
