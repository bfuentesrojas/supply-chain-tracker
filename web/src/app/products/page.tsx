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
    totalSupply: '',
    features: '',
    tokenType: PharmaTokenType.API_MP,
    parentIds: [] as { tokenId: bigint; amount: bigint }[]
  })

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

    // Filtrar y mapear parentIds y parentAmounts
    const validParents = newToken.parentIds.filter(p => p.tokenId > BigInt(0))
    const parentIdsArray = validParents.map(p => p.tokenId)
    const parentAmountsArray = validParents.map(p => p.amount)

    // Asegurar que sean arrays válidos
    const safeParentIds = Array.isArray(parentIdsArray) ? parentIdsArray : []
    const safeParentAmounts = Array.isArray(parentAmountsArray) ? parentAmountsArray : []

    const contractTokenType = tokenTypeStringToNumber(newToken.tokenType)
    
    // Validación específica para PT_LOTE: debe tener exactamente un padre (receta/BOM)
    if (newToken.tokenType === PharmaTokenType.PT_LOTE) {
      if (safeParentIds.length !== 1) {
        setValidationError('Un lote (PT_LOTE) debe tener exactamente un padre que sea una receta (BOM). Por favor, selecciona una receta como padre del lote.')
        return
      }
      
      // Validar que hay suficientes componentes para crear el lote
      try {
        const recipeId = safeParentIds[0]
        const recipe = await getToken(recipeId)
        
        if (!recipe) {
          setValidationError('No se pudo obtener la información de la receta. Verifica que la receta exista.')
          return
        }
        
        // Verificar que el padre sea una receta (BOM)
        if (recipe.tokenType !== 1) { // 1 = BOM
          setValidationError('El padre seleccionado no es una receta (BOM). Un lote solo puede tener como padre una receta.')
          return
        }
        
        // Obtener balances y verificar componentes
        const lotAmount = BigInt(newToken.totalSupply)
        const insufficientComponents: string[] = []
        
        for (let i = 0; i < recipe.parentIds.length; i++) {
          const componentId = recipe.parentIds[i]
          const componentAmountPerUnit = recipe.parentAmounts[i]
          const totalComponentNeeded = componentAmountPerUnit * lotAmount
          
          // Obtener balance del componente
          const balance = await getTokenBalance(componentId, account!)
          
          if (balance < totalComponentNeeded) {
            // Obtener información del componente para el mensaje
            const componentToken = await getToken(componentId)
            const componentName = componentToken?.name || `Token #${componentId}`
            
            insufficientComponents.push(
              `${componentName}: necesitas ${totalComponentNeeded.toString()} unidades pero solo tienes ${balance.toString()} disponibles`
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
    
    console.log('[DEBUG] Products page - createToken:', {
      name: newToken.name,
      totalSupply: newToken.totalSupply,
      tokenType: contractTokenType,
      parentIdsLength: safeParentIds.length,
      parentAmountsLength: safeParentAmounts.length
    })
    
    const result = await createToken(
      newToken.name,
      BigInt(newToken.totalSupply),
      newToken.features,
      contractTokenType,
      safeParentIds,
      safeParentAmounts
    )

    if (result) {
      setSuccess('Token creado exitosamente')
      setNewToken({ name: '', totalSupply: '', features: '', tokenType: PharmaTokenType.API_MP, parentIds: [] })
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
                          <p className="text-sm text-surface-700">{token.name}</p>
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
            <form onSubmit={handleCreateToken} className="space-y-6">
              <h2 className="text-xl font-semibold text-surface-800 mb-4">Crear Nuevo Token</h2>
              
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
                <label className="label">Cantidad Total (Supply)</label>
                <input
                  type="number"
                  min="1"
                  value={newToken.totalSupply}
                  onChange={(e) => setNewToken({ ...newToken, totalSupply: e.target.value })}
                  className="input-field"
                  placeholder="Ej: 10000"
                  required
                />
              </div>

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

              <div>
                <label className="label">Tipo de Token</label>
                <select
                  value={newToken.tokenType}
                  onChange={(e) => setNewToken({ ...newToken, tokenType: e.target.value as PharmaTokenType })}
                  className="select-field"
                >
                  <option value={PharmaTokenType.API_MP}>API_MP - Materia Prima</option>
                  <option value={PharmaTokenType.BOM}>BOM - Receta</option>
                  <option value={PharmaTokenType.PT_LOTE}>PT_LOTE - Producto Terminado</option>
                  <option value={PharmaTokenType.SSCC}>SSCC - Unidad Logística</option>
                  <option value={PharmaTokenType.COMPLIANCE_LOG}>COMPLIANCE_LOG - Registro</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Padres (opcional)</label>
                  <button
                    type="button"
                    onClick={() => setNewToken({ 
                      ...newToken, 
                      parentIds: [...newToken.parentIds, { tokenId: BigInt(0), amount: BigInt(0) }] 
                    })}
                    className="text-xs text-primary-600 hover:text-primary-800 font-semibold"
                  >
                    + Agregar Padre
                  </button>
                </div>
                {newToken.parentIds.length === 0 ? (
                  <p className="text-sm text-surface-500">Sin padres (token raíz)</p>
                ) : (
                  <div className="space-y-2">
                    {newToken.parentIds.map((parent, index) => (
                      <div key={index} className="flex gap-2 items-end">
                        <div className="flex-1">
                          <select
                            value={parent.tokenId.toString()}
                            onChange={(e) => {
                              const updated = [...newToken.parentIds]
                              updated[index] = { ...updated[index], tokenId: BigInt(e.target.value) }
                              setNewToken({ ...newToken, parentIds: updated })
                            }}
                            className="select-field text-sm"
                          >
                            <option value="0">Seleccionar token...</option>
                            {tokens.map((token) => (
                              <option key={token.id.toString()} value={token.id.toString()}>
                                #{token.id.toString()} - {token.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-24">
                          <input
                            type="number"
                            value={parent.amount.toString()}
                            onChange={(e) => {
                              const updated = [...newToken.parentIds]
                              updated[index] = { ...updated[index], amount: BigInt(e.target.value || '0') }
                              setNewToken({ ...newToken, parentIds: updated })
                            }}
                            className="input-field text-sm"
                            min="1"
                            placeholder="Cantidad"
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
                    ))}
                  </div>
                )}
                <p className="text-sm text-surface-500 mt-1">
                  Selecciona tokens padre y cantidades si este deriva de otros (ej: PT deriva de BOM)
                </p>
              </div>

              <button 
                type="submit" 
                disabled={
                  isLoading || 
                  !newToken.features.trim() || 
                  !validateFeaturesJson(newToken.features).isValid
                } 
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading 
                  ? 'Creando...' 
                  : !newToken.features.trim()
                    ? '⚠️ Ingresa el JSON de características'
                    : !validateFeaturesJson(newToken.features).isValid
                      ? '⚠️ Corrige los errores de validación'
                      : 'Crear Token'
                }
              </button>
            </form>
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
                    {tokens.filter(t => t.balance > BigInt(0)).map((token) => (
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
