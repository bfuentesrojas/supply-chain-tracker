'use client'

import { useState, useEffect } from 'react'
import { useWeb3 } from '@/contexts/Web3Context'
import { useSupplyChain } from '@/hooks/useSupplyChain'
import { 
  Token, 
  User, 
  UserStatus,
  formatRole,
  TokenType,
  tokenTypeStringToNumber
} from '@/contracts/SupplyChain'
import { TokenType as PharmaTokenType } from '@/types/pharma'
import { formatTimestamp, isValidAddress, formatNumber } from '@/lib/web3Service'
import { validateFeaturesJson } from '@/lib/schemaValidator'
import Link from 'next/link'
import { AccessGate } from '@/components/AccessGate'

function ProductsContent() {
  const { isConnected, account } = useWeb3()
  const { 
    getUserInfo, 
    getUserTokens, 
    getToken,
    getTokenBalance,
    createToken, 
    transfer,
    getUsersByRole,
    getUserById,
    getTotalUsers,
    isLoading, 
    error, 
    clearError 
  } = useSupplyChain()
  
  const [user, setUser] = useState<User | null>(null)
  const [tokens, setTokens] = useState<(Token & { balance: bigint })[]>([])
  const [availableRecipients, setAvailableRecipients] = useState<User[]>([])
  const [loadingRecipients, setLoadingRecipients] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'transfer'>('list')
  const [success, setSuccess] = useState<string | null>(null)
  const [balanceError, setBalanceError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  
  // Determinar si el usuario es consumidor
  const isConsumer = user?.role.toLowerCase() === 'consumer' || user?.role.toLowerCase() === 'consumidor'

  // Form states
  const [newToken, setNewToken] = useState({
    name: '',
    totalSupply: '1',
    features: '',
    tokenType: '' as PharmaTokenType | '',
    parentIds: [] as { tokenId: bigint; amount: number | null; balance?: bigint; totalSupply?: bigint }[]
  })
  const [isRecall, setIsRecall] = useState(false)
  const [showRecallWarning, setShowRecallWarning] = useState(false)
  const [loadingBalances, setLoadingBalances] = useState(false)

  // ============ Funciones auxiliares para reglas de creación de tokens ============
  
  // Filtrar tokens por tipo
  const filterTokensByType = (type: PharmaTokenType): Token[] => {
    const contractType = tokenTypeStringToNumber(type)
    return tokens.filter(t => t.tokenType === contractType)
  }

  // Obtener tokens padres disponibles según el tipo de token
  const getAvailableParentTokens = (): Token[] => {
    if (!newToken.tokenType) return []
    
    let available: Token[] = []
    
    switch (newToken.tokenType) {
      case PharmaTokenType.BOM:
        // Receta: solo materias primas
        available = filterTokensByType(PharmaTokenType.API_MP)
        break
      case PharmaTokenType.PT_LOTE:
        // Lote: solo recetas
        available = filterTokensByType(PharmaTokenType.BOM)
        break
      case PharmaTokenType.SSCC:
        // Unidad lógica: solo lotes
        available = filterTokensByType(PharmaTokenType.PT_LOTE)
        break
      case PharmaTokenType.COMPLIANCE_LOG:
        // Compliance log: lotes y unidades lógicas
        available = [
          ...filterTokensByType(PharmaTokenType.PT_LOTE),
          ...filterTokensByType(PharmaTokenType.SSCC)
        ]
        break
      default:
        return []
    }
    
    // Filtrar tokens con recall=true (no se pueden usar como padres)
    return available.filter(token => !token.recall)
  }

  // Verificar si se pueden agregar padres según el tipo
  const canAddParents = (): boolean => {
    if (!newToken.tokenType) return false
    
    switch (newToken.tokenType) {
      case PharmaTokenType.API_MP:
        return false // Materia prima no tiene padres
      case PharmaTokenType.BOM:
        return true // Receta puede tener múltiples padres
      case PharmaTokenType.PT_LOTE:
        return newToken.parentIds.length === 0 // Lote solo un padre
      case PharmaTokenType.SSCC:
        return newToken.parentIds.length === 0 // Unidad lógica solo un padre
      case PharmaTokenType.COMPLIANCE_LOG:
        return newToken.parentIds.length === 0 // Compliance log solo un padre
      default:
        return false
    }
  }

  // Verificar si se pueden agregar múltiples padres
  const canAddMultipleParents = (): boolean => {
    return newToken.tokenType === PharmaTokenType.BOM
  }

  // Verificar si la cantidad total es editable
  const isTotalSupplyEditable = (): boolean => {
    if (!newToken.tokenType) return true
    return newToken.tokenType !== PharmaTokenType.BOM && newToken.tokenType !== PharmaTokenType.COMPLIANCE_LOG
  }

  // Verificar si el monto del padre es editable
  const isParentAmountEditable = (index: number): boolean => {
    if (!newToken.tokenType) return true
    
    switch (newToken.tokenType) {
      case PharmaTokenType.PT_LOTE:
        return true // Lote: monto editable
      case PharmaTokenType.COMPLIANCE_LOG:
        return false // Compliance log: monto = balance
      case PharmaTokenType.SSCC:
        return true // Unidad lógica: monto editable pero <= balance
      default:
        return true
    }
  }

  // Verificar si el amount del padre permite decimales
  const allowsDecimalAmounts = (): boolean => {
    if (!newToken.tokenType) return true
    
    switch (newToken.tokenType) {
      case PharmaTokenType.PT_LOTE:
        return false // Lote: solo enteros
      case PharmaTokenType.SSCC:
        return false // Unidad lógica: solo enteros
      case PharmaTokenType.BOM:
        return true // BOM: permite decimales
      default:
        return true
    }
  }

  // Cargar balance de un token padre
  const loadParentBalance = async (tokenId: bigint, index: number) => {
    if (!tokenId || tokenId === BigInt(0)) return
    
    setLoadingBalances(true)
    try {
      // Obtener el token completo para acceder a totalSupply
      const parentToken = await getToken(tokenId)
      if (!parentToken) {
        console.error('Token padre no encontrado')
        return
      }
      
      // SIEMPRE usar totalSupply del token padre, independientemente del dueño
      const totalSupply = parentToken.totalSupply
      
      // Cargar el balance del usuario solo para mostrarlo en la UI (opcional)
      let userBalance = BigInt(0)
      if (account) {
        try {
          userBalance = await getTokenBalance(tokenId, account)
        } catch (err) {
          // Si falla obtener el balance del usuario, continuar con totalSupply
          console.warn('No se pudo obtener balance del usuario:', err)
        }
      }
      
      setNewToken(prev => {
        const updated = [...prev.parentIds]
        // Asegurar que el tokenId se preserve correctamente
        const currentParent = updated[index]
        if (!currentParent || currentParent.tokenId !== tokenId) {
          // Si el tokenId no coincide, no actualizar (puede haber sido cambiado por el usuario)
          console.warn(`TokenId mismatch: expected ${tokenId}, got ${currentParent?.tokenId}`)
          return prev
        }
        
        // Guardar el balance del usuario y totalSupply para mostrarlos en la UI
        // Para PT_LOTE y SSCC: dejar amount en null (campo vacío) para que el usuario ingrese libremente
        // Para COMPLIANCE_LOG: establecer amount al totalSupply
        updated[index] = { 
          ...currentParent, 
          balance: userBalance,
          totalSupply: totalSupply
        }
        
        if (prev.tokenType === PharmaTokenType.COMPLIANCE_LOG) {
          // Solo para COMPLIANCE_LOG establecer un valor por defecto
          updated[index].amount = Number(totalSupply) / 1000
        } else {
          // Para PT_LOTE, SSCC y otros: dejar en null (campo vacío)
          updated[index].amount = null
        }
        
        return { ...prev, parentIds: updated }
      })
    } catch (err) {
      console.error('Error cargando información del token padre:', err)
    } finally {
      setLoadingBalances(false)
    }
  }

  // Manejar cambio de tipo de token
  const handleTokenTypeChange = (type: PharmaTokenType) => {
    // Establecer supply por defecto según tipo
    let defaultSupply = '1'
    if (type === PharmaTokenType.BOM || type === PharmaTokenType.COMPLIANCE_LOG) {
      defaultSupply = '1'
    }
    
    setNewToken({
      name: '',
      totalSupply: defaultSupply,
      features: '',
      tokenType: type as PharmaTokenType,
      parentIds: []
    })
    
    // Resetear isRecall cuando cambia el tipo
    setIsRecall(false)
  }

  const [transferData, setTransferData] = useState({
    tokenId: '',
    to: '',
    amount: ''
  })

  // Determinar rol de destinatario según cadena de suministro
  const getTargetRoleForTransfer = (userRole: string): string | null => {
    const roleLower = userRole.toLowerCase()
    if (roleLower === 'admin' || roleLower === 'administrador') {
      return null // Admin puede transferir a todos
    } else if (roleLower === 'manufacturer' || roleLower === 'fabricante') {
      return 'distributor' // Distribuidor
    } else if (roleLower === 'distributor' || roleLower === 'distribuidor') {
      return 'retailer' // Minorista
    } else if (roleLower === 'retailer' || roleLower === 'minorista') {
      return 'consumer' // Consumidor
    }
    return null
  }

  // Obtener todos los usuarios aprobados (para admin)
  const getAllApprovedUsers = async (excludeAddress?: string): Promise<User[]> => {
    if (!getTotalUsers) return []
    
    try {
      const total = await getTotalUsers()
      const totalNum = Number(total)
      
      console.log('[DEBUG] getAllApprovedUsers:', {
        totalUsers: totalNum,
        excludeAddress
      })
      
      if (totalNum === 0) return []

      const usersData: User[] = []
      
      for (let i = BigInt(1); i <= totalNum; i++) {
        try {
          const user = await getUserById(i)
          if (user && user.id > BigInt(0)) {
            console.log('[DEBUG] getAllApprovedUsers - checking user:', {
              id: user.id.toString(),
              address: user.userAddress,
              role: user.role,
              status: user.status,
              isApproved: user.status === UserStatus.Approved,
              shouldExclude: excludeAddress && user.userAddress.toLowerCase() === excludeAddress.toLowerCase()
            })
            
            if (user.status === UserStatus.Approved) {
              // Excluir la cuenta actual si se proporciona
              if (!excludeAddress || user.userAddress.toLowerCase() !== excludeAddress.toLowerCase()) {
                usersData.push(user)
              }
            }
          }
        } catch (err) {
          console.error(`[DEBUG] Error obteniendo usuario ${i}:`, err)
          // Continuar si hay error en un usuario
        }
      }

      console.log('[DEBUG] getAllApprovedUsers result:', {
        count: usersData.length,
        users: usersData.map(u => ({ id: u.id.toString(), address: u.userAddress, role: u.role, status: u.status }))
      })

      return usersData
    } catch (err) {
      console.error('Error obteniendo todos los usuarios:', err)
      return []
    }
  }

  // Función de depuración: obtener todos los usuarios sin filtrar
  const debugGetAllUsers = async () => {
    if (!getTotalUsers || !getUserById) return []
    
    try {
      const total = await getTotalUsers()
      const totalNum = Number(total)
      
      const allUsers: Array<{ id: string, address: string, role: string, status: number }> = []
      
      for (let i = BigInt(1); i <= totalNum; i++) {
        try {
          const user = await getUserById(i)
          if (user && user.id > BigInt(0)) {
            allUsers.push({
              id: user.id.toString(),
              address: user.userAddress,
              role: user.role,
              status: user.status
            })
          }
        } catch (err) {
          // Continuar si hay error
        }
      }
      
      return allUsers
    } catch (err) {
      console.error('Error en debugGetAllUsers:', err)
      return []
    }
  }

  // Cargar destinatarios disponibles según el rol del usuario
  const loadRecipients = async () => {
    if (!user || !isConnected) {
      setAvailableRecipients([])
      return
    }

    const roleLower = user.role.toLowerCase()
    
    setLoadingRecipients(true)
    try {
      // Debug: mostrar todos los usuarios
      const allUsers = await debugGetAllUsers()
      console.log('[DEBUG] ALL USERS IN SYSTEM:', allUsers)
      
      let recipients: User[] = []
      
      // Si es admin, obtener todos los usuarios aprobados (excluyendo la cuenta actual)
      if (roleLower === 'admin' || roleLower === 'administrador') {
        console.log('[DEBUG] loadRecipients: Admin user, loading all approved users')
        recipients = await getAllApprovedUsers(account || undefined)
        console.log('[DEBUG] loadRecipients: Admin recipients loaded', {
          count: recipients.length,
          recipients: recipients.map(r => ({ id: r.id.toString(), address: r.userAddress, role: r.role }))
        })
      } else {
        // Para otros roles, obtener solo el rol específico
        const targetRole = getTargetRoleForTransfer(user.role)
        console.log('[DEBUG] loadRecipients: Non-admin user', {
          userRole: user.role,
          roleLower,
          targetRole,
          account,
          userStatus: user.status,
          isApproved: user.status === UserStatus.Approved
        })
        if (targetRole) {
          console.log('[DEBUG] loadRecipients: Calling getUsersByRole with targetRole:', targetRole)
          recipients = await getUsersByRole(targetRole)
          console.log('[DEBUG] loadRecipients: getUsersByRole result:', {
            targetRole,
            recipientsCount: recipients.length,
            recipients: recipients.map(r => ({ 
              id: r.id.toString(), 
              address: r.userAddress, 
              role: r.role,
              status: r.status 
            }))
          })
        } else {
          console.log('[DEBUG] loadRecipients: No targetRole found for role:', user.role)
        }
      }
      
      setAvailableRecipients(recipients)
    } catch (err) {
      console.error('Error cargando destinatarios:', err)
      setAvailableRecipients([])
    } finally {
      setLoadingRecipients(false)
    }
  }

  // Load data
  const loadData = async () => {
    if (!isConnected || !account) {
      setLoadingData(false)
      return
    }

    setLoadingData(true)
    try {
      const userData = await getUserInfo(account)
      setUser(userData)

      const tokenIds = await getUserTokens(account)
      const tokensData: (Token & { balance: bigint })[] = []
      
      for (const id of tokenIds) {
        const token = await getToken(id)
        if (token) {
          const balance = await getTokenBalance(id, account)
          tokensData.push({ ...token, balance })
        }
      }
      
      setTokens(tokensData)
    } catch (err) {
      console.error('Error cargando datos:', err)
    } finally {
      setLoadingData(false)
    }
  }

  // Cargar destinatarios cuando cambia el usuario o se activa la pestaña de transferencia
  useEffect(() => {
    if (activeTab === 'transfer' && user) {
      loadRecipients()
    }
  }, [activeTab, user])

  useEffect(() => {
    loadData()
  }, [isConnected, account])
  
  // Si el usuario es consumidor y está en una pestaña no permitida, redirigir a 'list'
  useEffect(() => {
    if (isConsumer && (activeTab === 'create' || activeTab === 'transfer')) {
      setActiveTab('list')
    }
  }, [isConsumer, activeTab])

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setSuccess(null)
    setValidationError(null)

    // Si isRecall está marcado, mostrar popup de advertencia
    if (isRecall) {
      setShowRecallWarning(true)
      return
    }

    // Si no es recall, proceder directamente
    await executeCreateToken()
  }

  const executeCreateToken = async () => {
    clearError()
    setSuccess(null)
    setValidationError(null)
    setShowRecallWarning(false)

    // Validar que el JSON de features esté presente y sea válido
    if (!newToken.features || newToken.features.trim() === '') {
      setValidationError('El campo de características (JSON) es obligatorio. Por favor, ingresa un JSON válido.')
      return
    }

    // Validar que sea un JSON válido
    let parsedFeatures
    try {
      parsedFeatures = JSON.parse(newToken.features)
    } catch (err) {
      setValidationError(`El JSON de características no es válido: ${err instanceof Error ? err.message : String(err)}`)
      return
    }

    // Validar que tenga los campos mínimos requeridos
    if (!parsedFeatures.labels || !parsedFeatures.labels.display_name) {
      setValidationError('El JSON de características debe incluir: labels.display_name')
      return
    }

    // Validar con el validador de schema
    const validation = validateFeaturesJson(newToken.features)
    if (!validation.isValid) {
      setValidationError(`Errores de validación: ${validation.errors.join(', ')}`)
      return
    }

    // Validar según el tipo si permite decimales o solo enteros
    const allowsDecimals = allowsDecimalAmounts()
    
    // Filtrar y mapear parentIds y parentAmounts (filtrar los que tienen tokenId = 0 y amount válido)
    // Para tipos que no permiten decimales, validar que sea entero >= 2
    const validParents = newToken.parentIds.filter(p => {
      if (p.tokenId === BigInt(0)) return false
      if (p.amount === null || p.amount === undefined) return false
      if (allowsDecimals) {
        return p.amount > 0
      } else {
        // Para enteros, debe ser >= 1 y ser un número entero
        return p.amount >= 1 && Number.isInteger(p.amount)
      }
    })
    
    // Validar que todos los padres tengan un amount válido
    const hasInvalidParents = newToken.parentIds.some(p => {
      if (p.tokenId === BigInt(0)) return false
      if (p.amount === null || p.amount === undefined) return true
      if (allowsDecimals) {
        return p.amount <= 0
      } else {
        // Para enteros, debe ser >= 1 y ser un número entero
        return p.amount < 1 || !Number.isInteger(p.amount)
      }
    })
    
    if (hasInvalidParents) {
      const errorMessage = allowsDecimals 
        ? 'Todos los tokens padre deben tener una cantidad mayor a 0. Por favor, ingresa la cantidad manualmente.'
        : 'Todos los tokens padre deben tener una cantidad entera mayor o igual a 1. Por favor, ingresa una cantidad válida.'
      setValidationError(errorMessage)
      return
    }
    
    const parentIdsArray = validParents.map(p => p.tokenId)
    // Convertir amounts de number a bigint multiplicando por 1000 (para permitir 3 decimales)
    const parentAmountsArray = validParents.map(p => {
      const amountAsBigInt = BigInt(Math.round(p.amount! * 1000))
      return amountAsBigInt
    })

    // Asegurar que sean arrays válidos
    const safeParentIds = Array.isArray(parentIdsArray) ? parentIdsArray : []
    const safeParentAmounts = Array.isArray(parentAmountsArray) ? parentAmountsArray : []

    const contractTokenType = tokenTypeStringToNumber(newToken.tokenType)
    
    // Validación específica para Recall: debe ser COMPLIANCE_LOG con exactamente un padre
    if (isRecall) {
      if (newToken.tokenType !== PharmaTokenType.COMPLIANCE_LOG) {
        setValidationError('El recall solo es válido para tokens de tipo COMPLIANCE_LOG.')
        return
      }
      if (safeParentIds.length !== 1) {
        setValidationError('Un recall debe tener exactamente un padre. Por favor, selecciona un token padre.')
        return
      }
      // Validar que el amount del padre sea mayor a 0 para recall
      if (safeParentAmounts.length === 0 || safeParentAmounts[0] <= BigInt(0)) {
        setValidationError('El recall debe tener una cantidad válida para el token padre. Por favor, espera a que se cargue el balance.')
        return
      }
    }

    // Validación específica para PT_LOTE: debe tener exactamente un padre (receta/BOM)
    if (newToken.tokenType === PharmaTokenType.PT_LOTE) {
      if (safeParentIds.length !== 1) {
        setValidationError('Un lote (PT_LOTE) debe tener exactamente un padre que sea una receta (BOM). Por favor, selecciona una receta como padre del lote.')
        return
      }
      
      // Validar que el token padre existe y hay suficientes componentes para crear el lote
      try {
        const recipeId = safeParentIds[0]
        
        // Verificar que el token padre existe
        if (!recipeId || recipeId === BigInt(0)) {
          setValidationError('Debes seleccionar un token padre (receta BOM) para crear el lote.')
          return
        }
        
        const recipe = await getToken(recipeId)
        
        if (!recipe) {
          setValidationError(`El token padre #${recipeId.toString()} no existe. Por favor, selecciona un token válido.`)
          return
        }
        
        // Verificar que el padre sea una receta (BOM)
        if (recipe.tokenType !== 1) { // 1 = BOM
          setValidationError('El padre seleccionado no es una receta (BOM). Un lote solo puede tener como padre una receta.')
          return
        }
        
        // Obtener balances y verificar componentes
        // componentAmountPerUnit está en BigInt con 3 decimales (multiplicado por 1000)
        // lotAmount es el supply del lote (entero)
        // parentAmount está en BigInt con 3 decimales (multiplicado por 1000)
        // totalUnits = totalSupply * (parentAmount / 1000) = unidades totales de producto terminado
        // totalComponentNeeded = (componentAmountPerUnit * totalUnits) / 1000
        const lotAmount = BigInt(newToken.totalSupply)
        const parentAmountRaw = safeParentAmounts[0] // BigInt con 3 decimales (ej: 10000 = 10)
        const parentAmount = parentAmountRaw / BigInt(1000) // Convertir a entero (ej: 10000 / 1000 = 10)
        const totalUnits = lotAmount * parentAmount // totalSupply * parentAmount (ej: 1000 * 10 = 10000)
        const insufficientComponents: string[] = []
        
        for (let i = 0; i < recipe.parentIds.length; i++) {
          const componentId = recipe.parentIds[i]
          const componentAmountPerUnit = recipe.parentAmounts[i] // BigInt con 3 decimales (ej: 500 = 0.5)
          
          // Calcular: (componentAmountPerUnit * totalUnits) / 1000
          // Ejemplo: 0.5 unidades/componente * 10000 unidades totales = 5000 unidades
          // En BigInt: (500 * 10000) / 1000 = 5000000 / 1000 = 5000
          const totalComponentNeeded = (componentAmountPerUnit * totalUnits) / BigInt(1000)
          
          // Obtener balance del componente (en BigInt entero)
          const balance = await getTokenBalance(componentId, account!)
          
          if (balance < totalComponentNeeded) {
            // Obtener información del componente para el mensaje
            const componentToken = await getToken(componentId)
            const componentName = componentToken?.name || `Token #${componentId}`
            
            // Convertir a números para mostrar decimales en el mensaje
            const componentAmountDecimal = Number(componentAmountPerUnit) / 1000
            const parentAmountDecimal = Number(parentAmount)
            const totalNeededDecimal = componentAmountDecimal * Number(lotAmount) * parentAmountDecimal
            
            insufficientComponents.push(
              `${componentName}: necesitas ${totalNeededDecimal.toFixed(3)} unidades (${componentAmountDecimal.toFixed(3)} × ${newToken.totalSupply} × ${parentAmountDecimal}) pero solo tienes ${formatNumber(balance)} disponibles`
            )
          }
        }
        
        if (insufficientComponents.length > 0) {
          setValidationError(
            `No hay suficientes componentes para crear el lote de ${newToken.totalSupply} unidades. ` +
            `Los siguientes componentes son insuficientes:\n${insufficientComponents.join('\n')}`
          )
          return
        }
      } catch (err) {
        console.error('Error validando componentes:', err)
        setValidationError('Error al validar los componentes. Por favor, intenta de nuevo.')
        return
      }
    }
    
    // Validación específica para SSCC: debe tener exactamente un padre (lote/PT_LOTE)
    if (newToken.tokenType === PharmaTokenType.SSCC) {
      if (safeParentIds.length !== 1) {
        setValidationError('Una unidad lógica (SSCC) debe tener exactamente un padre que sea un lote (PT_LOTE). Por favor, selecciona un lote como padre de la unidad lógica.')
        return
      }
      
      // Validar que el token padre existe y hay suficiente balance
      try {
        const lotId = safeParentIds[0]
        
        // Verificar que el token padre existe
        if (!lotId || lotId === BigInt(0)) {
          setValidationError('Debes seleccionar un token padre (lote PT_LOTE) para crear la unidad lógica.')
          return
        }
        
        const lot = await getToken(lotId)
        
        if (!lot) {
          setValidationError(`El token padre #${lotId.toString()} no existe. Por favor, selecciona un token válido.`)
          return
        }
        
        // Verificar que el padre sea un lote (PT_LOTE)
        if (lot.tokenType !== 2) { // 2 = PT_LOTE
          setValidationError('El padre seleccionado no es un lote (PT_LOTE). Una unidad lógica solo puede tener como padre un lote.')
          return
        }
        
        // Obtener balance del lote padre
        const lotBalance = await getTokenBalance(lotId, account!)
        
        // Calcular cantidad total a consumir
        // parentAmount viene multiplicado por 1000, así que dividimos por 1000
        const parentAmountRaw = safeParentAmounts[0] // BigInt con 3 decimales (ej: 1000 = 1)
        const parentAmount = parentAmountRaw / BigInt(1000) // Convertir a entero (ej: 1000 / 1000 = 1)
        const totalAmountToConsume = BigInt(newToken.totalSupply) * parentAmount
        
        // Verificar que hay suficiente balance
        if (lotBalance < totalAmountToConsume) {
          setValidationError(
            `Balance insuficiente: necesitas ${totalAmountToConsume.toString()} unidades del lote ` +
            `(${newToken.totalSupply} × ${parentAmount.toString()}) pero solo tienes ${formatNumber(lotBalance)} disponibles.`
          )
          return
        }
      } catch (err) {
        console.error('Error validando balance del lote:', err)
        setValidationError('Error al validar el balance del lote padre. Por favor, intenta de nuevo.')
        return
      }
    }
    
    console.log('[DEBUG] Products page - createToken:', {
      name: newToken.name,
      totalSupply: newToken.totalSupply,
      tokenType: contractTokenType,
      parentIdsLength: safeParentIds.length,
      parentAmountsLength: safeParentAmounts.length,
      isRecall
    })
    
    const result = await createToken(
      newToken.name,
      BigInt(newToken.totalSupply),
      newToken.features,
      contractTokenType,
      safeParentIds,
      safeParentAmounts,
      isRecall // isRecall - solo se usa en Compliance Log tipo Recall
    )

    if (result) {
      setSuccess('Token creado exitosamente')
      setNewToken({ name: '', totalSupply: '', features: '', tokenType: PharmaTokenType.API_MP, parentIds: [] })
      setIsRecall(false)
      loadData()
      setActiveTab('list')
    }
  }

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setSuccess(null)
    setBalanceError(null)

    if (!transferData.to) {
      setValidationError('Debes seleccionar un destinatario')
      return
    }

    // Validar balance antes de transferir
    const selectedToken = tokens.find(t => t.id.toString() === transferData.tokenId)
    if (selectedToken) {
      // Verificar que el token no esté en recall
      if (selectedToken.recall) {
        setBalanceError('No se puede transferir un token retirado (recall)')
        return
      }
      
      const transferAmount = BigInt(transferData.amount)
      if (transferAmount > selectedToken.balance) {
        setBalanceError(`Balance insuficiente. Tienes ${formatNumber(selectedToken.balance)} unidades disponibles, pero intentas transferir ${formatNumber(transferData.amount)}.`)
        return
      }
    }

    const result = await transfer(
      transferData.to,
      BigInt(transferData.tokenId),
      BigInt(transferData.amount)
    )

    if (result) {
      setSuccess('Transferencia enviada exitosamente')
      setTransferData({ tokenId: '', to: '', amount: '' })
      loadData()
      setActiveTab('list')
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="card text-center max-w-md">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-surface-800 mb-2">Wallet No Conectada</h2>
          <p className="text-surface-600">Conecta tu wallet para gestionar tokens</p>
        </div>
      </div>
    )
  }

  if (loadingData) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const isApproved = user?.status === UserStatus.Approved

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-surface-800">Gestión de Tokens</h1>
        {user && (
          <span className="text-sm text-surface-500">
            Rol: <span className="font-medium text-surface-700">{formatRole(user.role)}</span>
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {['list', ...(isConsumer ? [] : ['create', 'transfer'])].map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab as typeof activeTab)
              clearError()
              setSuccess(null)
            }}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'bg-primary-600 text-white'
                : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
            }`}
          >
            {tab === 'list' && 'Mis Tokens'}
            {tab === 'create' && 'Crear Token'}
            {tab === 'transfer' && 'Transferir'}
          </button>
        ))}
      </div>

      {/* Alerts */}
      {success && (
        <div className="mb-6 p-4 bg-green-100 border border-green-200 rounded-xl flex items-center gap-3">
          <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-green-800">{success}</p>
        </div>
      )}
      {validationError && (
        <div className="mb-6 p-4 bg-red-100 border border-red-200 rounded-xl flex items-center gap-3">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-800">{validationError}</p>
          <button onClick={() => setValidationError(null)} className="ml-auto text-red-600 hover:text-red-800">×</button>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-200 rounded-xl flex items-center gap-3">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-800">{typeof error === 'string' ? error : JSON.stringify(error)}</p>
        </div>
      )}

      {!isApproved && (
        <div className="mb-6 p-4 bg-yellow-100 border border-yellow-200 rounded-xl flex items-center gap-3">
          <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-yellow-800">
            {!user ? 'Debes registrarte primero.' : 'Tu cuenta está pendiente de aprobación.'}
            {!user && <Link href="/register" className="ml-2 underline">Registrarse</Link>}
          </p>
        </div>
      )}

      {/* List Tab */}
      {activeTab === 'list' && (
        <div className="card">
          {tokens.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="text-surface-500 mb-4">No tienes tokens</p>
              {isApproved && (
                <button onClick={() => setActiveTab('create')} className="btn-primary">
                  Crear mi primer token
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-surface-600">ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-surface-600">Nombre</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-surface-600">Mi Balance</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-surface-600">Supply Total</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-surface-600">Creado</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-surface-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((token) => (
                    <tr key={token.id.toString()} className="border-b border-surface-100 hover:bg-surface-50">
                      <td className="py-3 px-4 text-sm text-surface-700">#{token.id.toString()}</td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-surface-700">{token.name}</p>
                            {token.recall && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                                Retirado
                              </span>
                            )}
                          </div>
                          {token.parentIds.length > 0 && (
                            <p className="text-xs text-surface-500">
                              Padres: {token.parentIds.map(id => `#${id.toString()}`).join(', ')}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-surface-700">{formatNumber(token.balance)}</td>
                      <td className="py-3 px-4 text-sm text-surface-700">{formatNumber(token.totalSupply)}</td>
                      <td className="py-3 px-4 text-sm text-surface-700">{formatTimestamp(token.dateCreated)}</td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/track?id=${token.id}`}
                          className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                        >
                          Ver detalles
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Tab */}
      {activeTab === 'create' && (
        <div className="card max-w-2xl">
          {!isApproved ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-surface-800 mb-2">Acceso Restringido</h3>
              <p className="text-surface-600">Debes estar aprobado para crear tokens</p>
            </div>
          ) : (
            <>
              {/* Popup de advertencia de Recall */}
              {showRecallWarning && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-2xl p-6 max-w-lg mx-4 shadow-2xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-surface-800">⚠️ Advertencia: Retiro de Cadena de Suministro</h3>
                    </div>
                    <div className="mb-6">
                      <p className="text-surface-700 mb-3 font-medium">
                        Estás a punto de crear un token de tipo RECALL que generará el retiro de toda la cadena de suministro relacionada.
                      </p>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-red-800 mb-2">
                          <strong>Esta acción:</strong>
                        </p>
                        <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                          <li>Marcará el token padre y toda su cadena de suministro como retirada (recall)</li>
                          <li>Bloqueará todas las transferencias de tokens relacionados</li>
                          <li>Impedirá la creación de nuevos tokens usando tokens retirados como padres</li>
                          <li>Esta acción es <strong>irreversible</strong></li>
                        </ul>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowRecallWarning(false)}
                        className="flex-1 px-4 py-2 border border-surface-300 rounded-lg text-surface-700 hover:bg-surface-50 font-medium transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={executeCreateToken}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                      >
                        Sí, Continuar
                      </button>
                    </div>
                  </div>
                </div>
              )}

            <form onSubmit={handleCreateToken} className="space-y-6">
              <h2 className="text-xl font-semibold text-surface-800 mb-4">Crear Nuevo Token</h2>
              
              {/* Selector de tipo de token (primero) */}
              <div>
                <label className="label">Tipo de Token *</label>
                <select
                  value={newToken.tokenType || ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleTokenTypeChange(e.target.value as PharmaTokenType)
                    }
                  }}
                  className="select-field"
                  required
                >
                  <option value="">Seleccione Tipo de Token</option>
                  <option value={PharmaTokenType.API_MP}>🧪 API_MP - Materia Prima</option>
                  <option value={PharmaTokenType.BOM}>📋 BOM - Receta</option>
                  <option value={PharmaTokenType.PT_LOTE}>💊 PT_LOTE - Producto Terminado</option>
                  <option value={PharmaTokenType.SSCC}>📦 SSCC - Unidad Logística</option>
                  <option value={PharmaTokenType.COMPLIANCE_LOG}>📝 COMPLIANCE_LOG - Registro</option>
                </select>
              </div>

              {!newToken.tokenType ? (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ Por favor, seleccione un tipo de token para continuar con el formulario.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="label">Nombre del Token</label>
                    <input
                      type="text"
                      value={newToken.name}
                      onChange={(e) => setNewToken({ ...newToken, name: e.target.value })}
                      className="input-field"
                      placeholder="Ej: Paracetamol 500mg - Lote L2025-001"
                      required
                    />
                    <p className="text-xs text-surface-400 mt-1">
                      Ejemplos: &quot;API: Ibuprofeno USP&quot;, &quot;BOM: Vacuna VCN-001&quot;, &quot;PT: Amoxicilina 500mg Lote-A1&quot;
                    </p>
                  </div>

                  <div>
                    <label className="label">Cantidad Total (Supply) *</label>
                    <input
                      type="number"
                      min="1"
                      value={newToken.totalSupply}
                      onChange={(e) => setNewToken({ ...newToken, totalSupply: e.target.value })}
                      className="input-field"
                      placeholder="Ej: 10000"
                      required
                      disabled={!isTotalSupplyEditable()}
                      readOnly={!isTotalSupplyEditable()}
                    />
                    {!isTotalSupplyEditable() && (
                      <p className="text-xs text-surface-500 mt-1">
                        La cantidad total para este tipo de token es fija: 1
                      </p>
                    )}
                  </div>

                  {/* Checkbox Recall - solo para COMPLIANCE_LOG */}
                  {newToken.tokenType === PharmaTokenType.COMPLIANCE_LOG && (
                    <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isRecall}
                          onChange={(e) => setIsRecall(e.target.checked)}
                          className="w-5 h-5 rounded border-yellow-300 text-primary-600 focus:ring-yellow-500"
                        />
                        <div>
                          <span className="font-semibold text-yellow-900">Marcar como Recall</span>
                          <p className="text-sm text-yellow-700 mt-1">
                            Al marcar esta opción, se retirará toda la cadena de suministro relacionada al token padre. 
                            Esto afectará a todos los tokens relacionados (padres e hijos) y no permitirá su transferencia 
                            ni la creación de nuevos tokens relacionados.
                          </p>
                        </div>
                      </label>
                    </div>
                  )}

                  {/* Padres */}
                  {newToken.tokenType !== PharmaTokenType.API_MP && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="label mb-0">
                      Token{canAddMultipleParents() ? 's' : ''} Padre{canAddMultipleParents() ? 's' : ''}
                    </label>
                    {canAddParents() && (
                      <button
                        type="button"
                        onClick={() => {
                          const newParent = { tokenId: BigInt(0), amount: null as number | null }
                          setNewToken({ 
                            ...newToken, 
                            parentIds: [...newToken.parentIds, newParent] 
                          })
                        }}
                        className="text-xs text-primary-600 hover:text-primary-800 font-semibold"
                        disabled={!canAddParents()}
                      >
                        + Agregar Padre
                      </button>
                    )}
                  </div>
                  {newToken.parentIds.length === 0 ? (
                    <p className="text-sm text-surface-500">Sin padres (opcional)</p>
                  ) : (
                    <div className="space-y-2">
                      {newToken.parentIds.map((parent, index) => {
                        const availableParents = getAvailableParentTokens()
                        return (
                          <div key={index} className="flex gap-2 items-end">
                            <div className="flex-1">
                              <label className="text-xs text-surface-400">Token Padre</label>
                              <select
                                value={parent.tokenId === BigInt(0) ? "0" : parent.tokenId.toString()}
                                onChange={(e) => {
                                  const selectedValue = e.target.value
                                  const tokenId = selectedValue === "0" ? BigInt(0) : BigInt(selectedValue)
                                  
                                  // Actualizar el estado primero
                                  setNewToken(prev => {
                                    const updated = [...prev.parentIds]
                                    updated[index] = { ...updated[index], tokenId }
                                    return { ...prev, parentIds: updated }
                                  })
                                  
                                  // Cargar balance si se seleccionó un token (sin await para no bloquear el render)
                                  if (tokenId > BigInt(0)) {
                                    loadParentBalance(tokenId, index).catch(err => {
                                      console.error('Error cargando balance:', err)
                                    })
                                  }
                                }}
                                className="select-field text-sm mt-1"
                              >
                                <option value="0">Seleccionar...</option>
                                {availableParents.map((token) => (
                                  <option key={token.id.toString()} value={token.id.toString()}>
                                    #{token.id.toString()} - {token.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="w-32">
                              <label className="text-xs text-surface-400">
                                Cantidad
                                {allowsDecimalAmounts() && parent.totalSupply !== undefined && (
                                  <span className="text-surface-400"> (max: {(Number(parent.totalSupply) / 1000).toFixed(3)})</span>
                                )}
                              </label>
                              <input
                                type="number"
                                value={parent.amount === null || parent.amount === undefined ? '' : parent.amount}
                                onChange={(e) => {
                                  const inputValue = e.target.value
                                  const allowsDecimals = allowsDecimalAmounts()
                                  
                                  // Permitir campo vacío
                                  if (inputValue === '' || inputValue === '-') {
                                    const updated = [...newToken.parentIds]
                                    updated[index] = { ...updated[index], amount: null }
                                    setNewToken({ ...newToken, parentIds: updated })
                                    return
                                  }
                                  
                                  // Para tipos que no permiten decimales, validar que sea entero
                                  if (!allowsDecimals) {
                                    // Permitir cualquier número entero mientras se escribe (la validación >= 2 se hace al crear el token)
                                    const intValue = parseInt(inputValue, 10)
                                    if (!isNaN(intValue) && intValue >= 1) {
                                      // Para PT_LOTE y SSCC: no hay límite máximo
                                      const updated = [...newToken.parentIds]
                                      updated[index] = { ...updated[index], amount: intValue }
                                      setNewToken({ ...newToken, parentIds: updated })
                                    } else if (inputValue === '' || inputValue === '0') {
                                      // Permitir campo vacío o 0 temporalmente
                                      const updated = [...newToken.parentIds]
                                      updated[index] = { ...updated[index], amount: inputValue === '' ? null : 0 }
                                      setNewToken({ ...newToken, parentIds: updated })
                                    }
                                  } else {
                                    // Para tipos que permiten decimales (BOM)
                                    const value = parseFloat(inputValue)
                                    if (!isNaN(value) && value >= 0) {
                                      // Usar totalSupply del token padre como máximo (solo para BOM)
                                      const maxValue = parent.totalSupply ? Number(parent.totalSupply) / 1000 : Number.MAX_SAFE_INTEGER
                                      if (value <= maxValue) {
                                        const updated = [...newToken.parentIds]
                                        updated[index] = { ...updated[index], amount: value }
                                        setNewToken({ ...newToken, parentIds: updated })
                                      }
                                    }
                                  }
                                }}
                                className="input-field text-sm mt-1"
                                min={allowsDecimalAmounts() ? "0" : "1"}
                                step={allowsDecimalAmounts() ? "0.001" : "1"}
                                max={allowsDecimalAmounts() && parent.totalSupply ? (Number(parent.totalSupply) / 1000).toString() : undefined}
                                disabled={!isParentAmountEditable(index)}
                                readOnly={!isParentAmountEditable(index)}
                                placeholder={allowsDecimalAmounts() ? "Ingrese cantidad" : "Ingrese cantidad (entero ≥ 2)"}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setNewToken({ 
                                ...newToken, 
                                parentIds: newToken.parentIds.filter((_, i) => i !== index) 
                              })}
                              className="text-red-600 hover:text-red-800 text-sm font-semibold px-2 py-1"
                            >
                              ×
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {loadingBalances && (
                    <p className="text-xs text-surface-500 mt-2">Cargando balances...</p>
                  )}
                </div>
                  )}

                  <div>
                    <label className="label">
                      Características (JSON) <span className="text-red-500">*</span>
                    </label>
                <textarea
                  value={newToken.features}
                  onChange={(e) => setNewToken({ ...newToken, features: e.target.value })}
                  className={`input-field min-h-[120px] font-mono text-sm ${
                    newToken.features.trim() && !validateFeaturesJson(newToken.features).isValid
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : ''
                  }`}
                  placeholder='{"schema_version": "1.0.0", "labels": {"display_name": "Ibuprofeno USP"}, ...}'
                  required
                />
                {newToken.features.trim() && (
                  <div className="mt-2">
                    {validateFeaturesJson(newToken.features).isValid ? (
                      <p className="text-sm text-green-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        JSON válido
                      </p>
                    ) : (
                      <div className="text-sm text-red-600">
                        <p className="font-medium">Errores de validación:</p>
                        <ul className="list-disc list-inside text-xs mt-1">
                          {validateFeaturesJson(newToken.features).errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                  </div>
                </>
              )}

              <button 
                type="submit" 
                disabled={
                  isLoading || 
                  !newToken.tokenType ||
                  !newToken.features.trim() || 
                  !validateFeaturesJson(newToken.features).isValid
                } 
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading 
                  ? 'Creando...' 
                  : !newToken.tokenType
                    ? '⚠️ Seleccione un tipo de token'
                    : !newToken.features.trim()
                      ? '⚠️ Ingresa el JSON de características'
                      : !validateFeaturesJson(newToken.features).isValid
                        ? '⚠️ Corrige los errores de validación'
                        : 'Crear Token'
                }
              </button>
            </form>
            </>
          )}
        </div>
      )}

      {/* Transfer Tab */}
      {activeTab === 'transfer' && (
        <div className="card max-w-2xl">
          {!isApproved ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-surface-800 mb-2">Acceso Restringido</h3>
              <p className="text-surface-600">Debes estar aprobado para transferir tokens</p>
            </div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-surface-600">No tienes tokens para transferir</p>
            </div>
          ) : (
            <>
              {/* Popup de error de balance */}
              {balanceError && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-surface-800">Balance Insuficiente</h3>
                    </div>
                    <p className="text-surface-600 mb-6">{balanceError}</p>
                    <button
                      onClick={() => setBalanceError(null)}
                      className="btn-primary w-full"
                    >
                      Corregir Cantidad
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleTransfer} className="space-y-6">
                <h2 className="text-xl font-semibold text-surface-800 mb-4">Transferir Token</h2>
                
                <div>
                  <label className="label">Token a Transferir</label>
                  <select
                    value={transferData.tokenId}
                    onChange={(e) => {
                      setTransferData({ ...transferData, tokenId: e.target.value })
                      setBalanceError(null)
                    }}
                    className="select-field"
                    required
                  >
                    <option value="">Selecciona un token</option>
                    {tokens
                      .filter(t => t.balance > BigInt(0) && !t.recall) // Filtrar tokens con recall y sin balance
                      .map((token) => (
                        <option key={token.id.toString()} value={token.id.toString()}>
                          #{token.id.toString()} - {token.name} (Balance: {formatNumber(token.balance)})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="label">Cuenta Destinataria</label>
                  {loadingRecipients ? (
                    <div className="input-field flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                      <span className="text-sm text-surface-500">Cargando destinatarios...</span>
                    </div>
                  ) : availableRecipients.length === 0 ? (
                    <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                      <p className="text-sm text-yellow-800">
                        {user?.role.toLowerCase() === 'admin' || user?.role.toLowerCase() === 'administrador' 
                          ? 'No hay usuarios aprobados disponibles en el sistema.'
                          : `No hay destinatarios disponibles para tu rol (${formatRole(user?.role || '')}).`
                        }
                        {getTargetRoleForTransfer(user?.role || '') && (
                          <span className="block mt-1">
                            Debes transferir a: <strong>{formatRole(getTargetRoleForTransfer(user?.role || '') || '')}</strong>
                          </span>
                        )}
                      </p>
                    </div>
                  ) : (
                    <>
                      <select
                        value={transferData.to}
                        onChange={(e) => {
                          setTransferData({ ...transferData, to: e.target.value })
                          setBalanceError(null)
                        }}
                        className="select-field"
                        required
                      >
                        <option value="">Selecciona un destinatario</option>
                        {availableRecipients.map((recipient) => (
                          <option key={recipient.userAddress} value={recipient.userAddress}>
                            #{recipient.id.toString()} ({formatRole(recipient.role)})
                          </option>
                        ))}
                      </select>
                      <p className="text-sm text-surface-500 mt-1">
                        {availableRecipients.length} destinatario{availableRecipients.length !== 1 ? 's' : ''} disponible{availableRecipients.length !== 1 ? 's' : ''}
                        {user?.role.toLowerCase() === 'admin' || user?.role.toLowerCase() === 'administrador' 
                          ? ' (todos los roles)' 
                          : getTargetRoleForTransfer(user?.role || '') 
                            ? ` como ${formatRole(getTargetRoleForTransfer(user?.role || '') || '')}`
                            : ''
                        }
                      </p>
                    </>
                  )}
                </div>

                <div>
                  <label className="label">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    max={tokens.find(t => t.id.toString() === transferData.tokenId)?.balance.toString() || undefined}
                    value={transferData.amount}
                    onChange={(e) => {
                      setTransferData({ ...transferData, amount: e.target.value })
                      setBalanceError(null)
                    }}
                    className={`input-field ${balanceError ? 'border-red-300' : ''}`}
                    placeholder="Cantidad a transferir"
                    required
                  />
                  {transferData.tokenId && (
                    <p className="text-sm text-surface-500 mt-1">
                      Balance disponible: {formatNumber(tokens.find(t => t.id.toString() === transferData.tokenId)?.balance || BigInt(0))}
                    </p>
                  )}
                </div>

                <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    <strong>Nota:</strong> La transferencia quedará pendiente hasta que el destinatario la acepte.
                  </p>
                </div>

                <button type="submit" disabled={isLoading} className="btn-primary w-full">
                  {isLoading ? 'Enviando...' : 'Enviar Transferencia'}
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function ProductsPage() {
  return (
    <AccessGate requireApproval={true}>
      <ProductsContent />
    </AccessGate>
  )
}
