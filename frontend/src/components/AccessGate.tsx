'use client'

import { useState, useEffect, ReactNode } from 'react'
import { useWeb3 } from '@/contexts/Web3Context'
import { useSupplyChain } from '@/hooks/useSupplyChain'
import { User, UserStatus, formatUserStatus, getUserStatusColor, ROLES, EXPECTED_CHAIN_ID } from '@/contracts/SupplyChain'

interface AccessGateProps {
  children: ReactNode
  requireApproval?: boolean // Si true, solo usuarios aprobados pueden ver el contenido
}

/**
 * Componente de control de acceso que verifica la conexión de wallet y el estado del usuario
 * 
 * @param children - Contenido a renderizar si el usuario tiene acceso
 * @param requireApproval - Si true, solo usuarios aprobados pueden ver el contenido (por defecto: true)
 * 
 * @example
 * ```tsx
 * <AccessGate>
 *   <ProtectedContent />
 * </AccessGate>
 * ```
 */
export function AccessGate({ children, requireApproval = true }: AccessGateProps) {
  const { isConnected, account, chainId, switchToAnvilNetwork } = useWeb3()
  const { getUserInfo, requestUserRole, isLoading, error, clearError } = useSupplyChain()
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false)
  
  const [user, setUser] = useState<User | null>(null)
  const [checkingUser, setCheckingUser] = useState(true)
  const [selectedRole, setSelectedRole] = useState<string>(ROLES.MANUFACTURER)
  const [registrationSuccess, setRegistrationSuccess] = useState(false)

  // Verificar el estado del usuario cuando se conecta
  useEffect(() => {
    const checkUserStatus = async () => {
      // #region agent log
      console.log('[DEBUG] AccessGate:checkUserStatus:start', {isConnected, account, chainId, expectedChainId: EXPECTED_CHAIN_ID});
      // #endregion
      if (!isConnected || !account) {
        setCheckingUser(false)
        setUser(null)
        return
      }

      // No verificar usuario si está en la red incorrecta
      if (chainId !== EXPECTED_CHAIN_ID) {
        // #region agent log
        console.log('[DEBUG] AccessGate: Red incorrecta, no verificando usuario', {chainId, expected: EXPECTED_CHAIN_ID});
        // #endregion
        setCheckingUser(false)
        setUser(null)
        return
      }

      setCheckingUser(true)
      try {
        // #region agent log
        console.log('[DEBUG] AccessGate:beforeGetUserInfo', {account, accountLower: account?.toLowerCase()});
        // #endregion
        const userData = await getUserInfo(account)
        // #region agent log
        console.log('[DEBUG] AccessGate:afterGetUserInfo', {userData, hasData: !!userData, idGreaterThanZero: userData ? userData.id > BigInt(0) : false});
        // #endregion
        if (userData && userData.id > BigInt(0)) {
          setUser(userData)
        } else {
          setUser(null)
        }
      } catch (err) {
        // #region agent log
        console.log('[DEBUG] AccessGate:error', {error: err instanceof Error ? err.message : String(err)});
        // #endregion
        console.error('Error verificando usuario:', err)
        setUser(null)
      } finally {
        setCheckingUser(false)
      }
    }

    checkUserStatus()
  }, [isConnected, account, chainId, getUserInfo])

  // Manejar registro de rol
  const handleRegisterRole = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setRegistrationSuccess(false)

    const result = await requestUserRole(selectedRole)
    
    if (result) {
      setRegistrationSuccess(true)
      // Recargar datos del usuario
      const userData = await getUserInfo(account!)
      if (userData && userData.id > BigInt(0)) {
        setUser(userData)
      }
    }
  }

  // #region agent log - render debug
  console.log('[DEBUG] AccessGate:RENDER', {isConnected, chainId, expectedChainId: EXPECTED_CHAIN_ID, checkingUser, hasUser: !!user});
  // #endregion

  // Si no está conectado, mostrar mensaje
  if (!isConnected) {
    console.log('[DEBUG] AccessGate:RENDER -> NOT_CONNECTED');
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="card text-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-surface-800 mb-3">Conecta tu Wallet</h2>
          <p className="text-surface-600 mb-6">
            Para acceder a la aplicación, necesitas conectar tu wallet de MetaMask.
          </p>
        </div>
      </div>
    )
  }

  // Función para cambiar de red
  const handleSwitchNetwork = async () => {
    setIsSwitchingNetwork(true)
    const success = await switchToAnvilNetwork()
    setIsSwitchingNetwork(false)
    if (success) {
      // La página se recargará automáticamente por el listener de chainChanged
    }
  }

  // Verificar que esté en la red correcta
  if (chainId !== EXPECTED_CHAIN_ID) {
    console.log('[DEBUG] AccessGate:RENDER -> WRONG_NETWORK', {chainId, expected: EXPECTED_CHAIN_ID});
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="card text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-surface-800 mb-3">Red Incorrecta</h2>
          <p className="text-surface-600 mb-4">
            Estás conectado a la red con chainId <strong className="text-red-600">{chainId}</strong>, 
            pero el contrato está desplegado en la red local de Anvil.
          </p>
          
          <button
            onClick={handleSwitchNetwork}
            disabled={isSwitchingNetwork}
            className="btn-primary w-full mb-4"
          >
            {isSwitchingNetwork ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Cambiando red...
              </span>
            ) : (
              '🔄 Cambiar a Red Local (Anvil)'
            )}
          </button>

          <div className="bg-surface-50 rounded-xl p-4 text-left">
            <p className="text-sm font-semibold text-surface-700 mb-2">Configuración de red:</p>
            <div className="p-3 bg-surface-100 rounded-lg font-mono text-xs">
              <p>Nombre: <span className="text-primary-600">Anvil Local</span></p>
              <p>RPC URL: <span className="text-primary-600">http://127.0.0.1:8545</span></p>
              <p>Chain ID: <span className="text-primary-600">{EXPECTED_CHAIN_ID}</span></p>
              <p>Símbolo: <span className="text-primary-600">ETH</span></p>
            </div>
            <p className="text-xs text-surface-500 mt-2">
              ⚠️ Asegúrate de que Anvil esté corriendo en tu terminal
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Cargando estado del usuario
  if (checkingUser) {
    console.log('[DEBUG] AccessGate:RENDER -> CHECKING_USER');
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-surface-600">Verificando tu cuenta...</p>
        </div>
      </div>
    )
  }

  // Usuario NO registrado - Mostrar formulario de registro
  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="card max-w-lg w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-surface-800 mb-2">¡Bienvenido!</h2>
            <p className="text-surface-600">
              Tu cuenta no está registrada en el sistema. Selecciona tu rol para solicitar acceso.
            </p>
          </div>

          {registrationSuccess && (
            <div className="mb-6 p-4 bg-green-100 border border-green-200 rounded-xl flex items-center gap-3">
              <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-green-800">¡Solicitud enviada correctamente!</p>
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

          <form onSubmit={handleRegisterRole} className="space-y-6">
            <div>
              <label htmlFor="role" className="label">
                Selecciona tu Rol en la Cadena de Suministros
              </label>
              <select
                id="role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="select-field text-lg"
              >
                <option value={ROLES.MANUFACTURER}>🏭 Fabricante (Producer)</option>
                <option value={ROLES.DISTRIBUTOR}>🚚 Distribuidor (Factory)</option>
                <option value={ROLES.RETAILER}>🏪 Minorista (Retailer)</option>
                <option value={ROLES.CONSUMER}>👤 Consumidor (Consumer)</option>
              </select>
              
              <div className="mt-3 p-3 bg-surface-50 rounded-lg">
                <p className="text-sm text-surface-600">
                  {selectedRole === ROLES.MANUFACTURER && (
                    <><strong>Fabricante:</strong> Puede crear nuevos tokens/productos en la cadena.</>
                  )}
                  {selectedRole === ROLES.DISTRIBUTOR && (
                    <><strong>Distribuidor:</strong> Recibe y transfiere productos entre ubicaciones.</>
                  )}
                  {selectedRole === ROLES.RETAILER && (
                    <><strong>Minorista:</strong> Vende productos al consumidor final.</>
                  )}
                  {selectedRole === ROLES.CONSUMER && (
                    <><strong>Consumidor:</strong> Recibe y verifica productos finales.</>
                  )}
                </p>
              </div>
            </div>

            <div className="bg-surface-50 rounded-xl p-4">
              <p className="text-sm text-surface-600">
                <strong>Tu Wallet:</strong>
                <span className="font-mono ml-2 text-primary-600 break-all">{account}</span>
              </p>
            </div>

            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-yellow-800">
                  Tu solicitud será revisada por el administrador. Una vez aprobada, 
                  podrás acceder a todas las funcionalidades según tu rol.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full text-lg py-4"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Enviando solicitud...
                </span>
              ) : (
                'Solicitar Acceso'
              )}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Usuario PENDIENTE de aprobación
  if (user.status === UserStatus.Pending) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="card text-center max-w-lg">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-surface-800 mb-3">Solicitud Pendiente</h2>
          <p className="text-surface-600 mb-6">
            Tu solicitud de acceso como <strong className="text-surface-800">{user.role}</strong> está 
            siendo revisada por el administrador.
          </p>
          
          <div className="bg-surface-50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-surface-600">Estado:</span>
              <span className={`status-badge ${getUserStatusColor(user.status)}`}>
                {formatUserStatus(user.status)}
              </span>
            </div>
          </div>

          <p className="text-sm text-surface-500">
            Recibirás acceso una vez que el administrador apruebe tu solicitud.
            Puedes refrescar la página para verificar el estado.
          </p>

          <button
            onClick={() => window.location.reload()}
            className="btn-secondary mt-6"
          >
            Verificar Estado
          </button>
        </div>
      </div>
    )
  }

  // Usuario RECHAZADO
  if (user.status === UserStatus.Rejected) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="card text-center max-w-lg">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-surface-800 mb-3">Acceso Rechazado</h2>
          <p className="text-surface-600 mb-6">
            Tu solicitud de acceso ha sido rechazada por el administrador.
          </p>
          
          <div className="bg-surface-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-surface-600">Estado:</span>
              <span className={`status-badge ${getUserStatusColor(user.status)}`}>
                {formatUserStatus(user.status)}
              </span>
            </div>
          </div>

          <p className="text-sm text-surface-500 mt-6">
            Contacta al administrador si crees que esto es un error.
          </p>
        </div>
      </div>
    )
  }

  // Usuario CANCELADO
  if (user.status === UserStatus.Canceled) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="card text-center max-w-lg">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-surface-800 mb-3">Cuenta Cancelada</h2>
          <p className="text-surface-600 mb-6">
            Tu cuenta ha sido cancelada y no tiene acceso al sistema.
          </p>
          
          <div className="bg-surface-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-surface-600">Estado:</span>
              <span className={`status-badge ${getUserStatusColor(user.status)}`}>
                {formatUserStatus(user.status)}
              </span>
            </div>
          </div>

          <p className="text-sm text-surface-500 mt-6">
            Contacta al administrador para más información.
          </p>
        </div>
      </div>
    )
  }

  // Usuario APROBADO - Mostrar contenido
  if (!requireApproval || user.status === UserStatus.Approved) {
    return <>{children}</>
  }

  // Fallback
  return <>{children}</>
}

// Componente para mostrar info del usuario actual en cualquier parte
export function UserStatusBadge() {
  const { isConnected, account } = useWeb3()
  const { getUserInfo } = useSupplyChain()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const loadUser = async () => {
      if (isConnected && account) {
        const userData = await getUserInfo(account)
        if (userData && userData.id > BigInt(0)) {
          setUser(userData)
        }
      }
    }
    loadUser()
  }, [isConnected, account, getUserInfo])

  if (!user) return null

  return (
    <span className={`status-badge ${getUserStatusColor(user.status)}`}>
      {user.role} - {formatUserStatus(user.status)}
    </span>
  )
}

