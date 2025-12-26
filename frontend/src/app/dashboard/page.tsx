'use client'

import { useEffect, useState } from 'react'
import { useWeb3 } from '@/contexts/Web3Context'
import { useSupplyChain } from '@/hooks/useSupplyChain'
import { Token, Transfer, User, formatUserStatus, formatTransferStatus, getUserStatusColor, getTransferStatusColor, formatRole, TransferStatus, EXPECTED_CHAIN_ID } from '@/contracts/SupplyChain'
import { formatAddress, formatTimestamp, formatNumber } from '@/lib/web3Service'
import Link from 'next/link'
import { AccessGate } from '@/components/AccessGate'

// Roles que pueden crear tokens
const PRODUCER_ROLES = ['admin', 'manufacturer', 'distributor', 'retailer']
// Rol de consumidor (solo puede ver y aprobar transferencias)
const CONSUMER_ROLE = 'consumer'

// Interfaz para transferencias con info de usuario
interface TransferWithUserInfo extends Transfer {
  fromUserRole?: string
  toUserRole?: string
}

function DashboardContent() {
  const { isConnected, account, chainId } = useWeb3()
  const { 
    getUserInfo, 
    getUserTokens, 
    getUserTransfers, 
    getToken, 
    getTokenBalance,
    getTransfer,
    getTotalTokens, 
    getTotalUsers,
    getTotalTransfers,
    isAdmin: checkIsAdmin,
    acceptTransfer,
    rejectTransfer,
    isLoading: actionLoading,
    error: actionError,
    clearError
  } = useSupplyChain()
  
  const [user, setUser] = useState<User | null>(null)
  const [tokens, setTokens] = useState<(Token & { balance: bigint })[]>([])
  const [transfers, setTransfers] = useState<TransferWithUserInfo[]>([])
  const [stats, setStats] = useState({ totalTokens: 0, totalUsers: 0, totalTransfers: 0 })
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeProfileTab, setActiveProfileTab] = useState<'tokens' | 'received' | 'sent' | 'status'>('tokens')
  const [showRecallInfo, setShowRecallInfo] = useState(false)
  
  // Determinar el tipo de perfil
  const isConsumer = user?.role.toLowerCase() === CONSUMER_ROLE
  const canCreateTokens = user && PRODUCER_ROLES.includes(user.role.toLowerCase())
  
  // Calcular estadísticas según el rol
  const sentTransfers = transfers.filter(t => t.from.toLowerCase() === account?.toLowerCase())
  const receivedTransfers = transfers.filter(t => t.to.toLowerCase() === account?.toLowerCase())
  
  // Determinar qué totalizadores mostrar según el rol
  const userRole = user?.role.toLowerCase() || ''
  const isProducer = userRole === 'manufacturer' || userRole === 'fabricante' || 
                     userRole === 'distributor' || userRole === 'distribuidor' ||
                     userRole === 'retailer' || userRole === 'minorista'

  const loadData = async () => {
    // Verificar red antes de cargar datos
    if (!isConnected || !account || chainId !== EXPECTED_CHAIN_ID) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      // Verificar si es admin
      const adminStatus = await checkIsAdmin(account)
      setIsAdmin(adminStatus)

      // Cargar datos del usuario
      const userData = await getUserInfo(account)
      setUser(userData)

      // Cargar estadísticas
      const [totalTokens, totalUsers, totalTransfers] = await Promise.all([
        getTotalTokens(),
        getTotalUsers(),
        getTotalTransfers()
      ])
      setStats({
        totalTokens: Number(totalTokens),
        totalUsers: Number(totalUsers),
        totalTransfers: Number(totalTransfers)
      })

      // Cargar tokens del usuario con balance
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

      // Cargar transferencias del usuario con info de roles
      const transferIds = await getUserTransfers(account)
      const transfersData: TransferWithUserInfo[] = []
      for (const id of transferIds) {
        const transfer = await getTransfer(id)
        if (transfer) {
          // Obtener roles de from y to
          let fromUserRole = ''
          let toUserRole = ''
          try {
            const fromUser = await getUserInfo(transfer.from)
            if (fromUser) fromUserRole = fromUser.role
          } catch { /* Usuario no encontrado */ }
          try {
            const toUser = await getUserInfo(transfer.to)
            if (toUser) toUserRole = toUser.role
          } catch { /* Usuario no encontrado */ }
          
          transfersData.push({ ...transfer, fromUserRole, toUserRole })
        }
      }
      setTransfers(transfersData)

    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [isConnected, account, chainId])

  const handleAcceptTransfer = async (transferId: bigint) => {
    clearError()
    const result = await acceptTransfer(transferId)
    if (result) {
      loadData()
    }
  }

  const handleRejectTransfer = async (transferId: bigint) => {
    clearError()
    const result = await rejectTransfer(transferId)
    if (result) {
      loadData()
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const pendingTransfers = transfers.filter(t => t.status === TransferStatus.Pending && t.to.toLowerCase() === account?.toLowerCase())

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-surface-800">
          {isAdmin ? 'Panel de Administración' : 'Mi Perfil'}
        </h1>
        <div className="flex items-center gap-2">
          {user && (
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              isAdmin ? 'bg-purple-100 text-purple-800' : 
              isConsumer ? 'bg-blue-100 text-blue-800' : 
              'bg-green-100 text-green-800'
            }`}>
              {formatRole(user.role)}
            </span>
          )}
        </div>
      </div>

      {actionError && (
        <div className="mb-6 p-4 bg-red-100 border border-red-200 rounded-xl flex items-center gap-3">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-800">{actionError}</p>
        </div>
      )}

      {/* Stats Grid - Diferentes según el rol */}
      {isAdmin ? (
        // Admin: Totalizadores globales (sin cambios)
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-surface-500">Total Tokens</p>
                <p className="text-2xl font-bold text-surface-800">{formatNumber(stats.totalTokens)}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-surface-500">Total Usuarios</p>
                <p className="text-2xl font-bold text-surface-800">{formatNumber(stats.totalUsers)}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-surface-500">Total Transferencias</p>
                <p className="text-2xl font-bold text-surface-800">{formatNumber(stats.totalTransfers)}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-surface-500">Mi Estado</p>
                <p className="text-2xl font-bold text-surface-800">
                  {user ? formatUserStatus(user.status) : 'Sin registrar'}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : isProducer ? (
        // Fabricante, Distribuidor, Retailer: Mis Tokens, Transferencias Enviadas, Transferencias Recibidas, Mi Estado
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-surface-500">Mis Tokens</p>
                <p className="text-2xl font-bold text-surface-800">{formatNumber(tokens.length)}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-surface-500">Transferencias Enviadas</p>
                <p className="text-2xl font-bold text-surface-800">{formatNumber(sentTransfers.length)}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-surface-500">Transferencias Recibidas</p>
                <p className="text-2xl font-bold text-surface-800">{formatNumber(receivedTransfers.length)}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-surface-500">Mi Estado</p>
                <p className="text-2xl font-bold text-surface-800">
                  {user ? formatUserStatus(user.status) : 'Sin registrar'}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : isConsumer ? (
        // Consumidor: Mis Tokens, Transferencias Recibidas, Mi Estado
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-surface-500">Mis Tokens</p>
                <p className="text-2xl font-bold text-surface-800">{formatNumber(tokens.length)}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-surface-500">Transferencias Recibidas</p>
                <p className="text-2xl font-bold text-surface-800">{formatNumber(receivedTransfers.length)}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-surface-500">Mi Estado</p>
                <p className="text-2xl font-bold text-surface-800">
                  {user ? formatUserStatus(user.status) : 'Sin registrar'}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* User Info */}
      {user && (
        <div className="card mb-8">
          <h2 className="text-xl font-semibold text-surface-800 mb-4">Mi Información</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-surface-500">Rol</p>
              <p className="font-medium text-surface-800">{formatRole(user.role)}</p>
            </div>
            <div>
              <p className="text-sm text-surface-500">Estado</p>
              <span className={`status-badge ${getUserStatusColor(user.status)}`}>
                {formatUserStatus(user.status)}
              </span>
            </div>
            <div>
              <p className="text-sm text-surface-500">Dirección</p>
              <p className="font-mono text-surface-800">{formatAddress(user.userAddress, 8)}</p>
            </div>
            <div>
              <p className="text-sm text-surface-500">Mis Tokens</p>
              <p className="font-medium text-surface-800">{formatNumber(tokens.length)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Pending Transfers */}
      {pendingTransfers.length > 0 && (
        <div className="card mb-8 border-2 border-yellow-200">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-semibold text-surface-800">Transferencias Pendientes</h2>
          </div>
          <div className="space-y-4">
            {pendingTransfers.map((t) => (
              <div key={t.id.toString()} className="flex items-center justify-between p-4 bg-yellow-50 rounded-xl">
                <div>
                  <p className="font-medium text-surface-800">
                    Transfer #{t.id.toString()} - Token #{t.tokenId.toString()}
                  </p>
                  <p className="text-sm text-surface-500">
                    De: {formatAddress(t.from, 6)} | Cantidad: {formatNumber(t.amount)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptTransfer(t.id)}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    Aceptar
                  </button>
                  <button
                    onClick={() => handleRejectTransfer(t.id)}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Link href="/products" className="card hover:-translate-y-1 transition-transform cursor-pointer group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center group-hover:bg-accent-200 transition-colors">
              <svg className="w-6 h-6 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-surface-800">Gestionar Tokens</h3>
              <p className="text-sm text-surface-500">Crear y transferir tokens</p>
            </div>
          </div>
        </Link>

        <Link href="/track" className="card hover:-translate-y-1 transition-transform cursor-pointer group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-surface-800">Buscar Token</h3>
              <p className="text-sm text-surface-500">Ver información de tokens</p>
            </div>
          </div>
        </Link>

        {isAdmin && (
          <Link href="/admin" className="card hover:-translate-y-1 transition-transform cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-surface-800">Panel Admin</h3>
                <p className="text-sm text-surface-500">Gestionar usuarios</p>
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* My Tokens Table */}
      <div className="card mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-surface-800">Mis Tokens</h2>
          <Link href="/products" className="text-primary-600 hover:text-primary-700 font-medium text-sm">
            Ver todos →
          </Link>
        </div>

        {tokens.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-surface-500">No tienes tokens</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-surface-600">ID</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-surface-600">Nombre</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-surface-600">Mi Balance</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-surface-600">Supply</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-surface-600">Creado</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-surface-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tokens.slice(0, 5).map((token) => (
                  <tr key={token.id.toString()} className="border-b border-surface-100 hover:bg-surface-50">
                    <td className="py-3 px-4 text-sm text-surface-700">#{token.id.toString()}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-surface-700">{token.name}</span>
                        {token.recall && (
                          <div className="flex items-center gap-1">
                            <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                              Retirado
                            </span>
                            {isConsumer && (
                              <button
                                onClick={() => setShowRecallInfo(true)}
                                className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 flex items-center justify-center transition-colors"
                                title="Información sobre producto retirado"
                              >
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                              </button>
                            )}
                          </div>
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

      {/* Recent Transfers Table */}
      <div className="card">
        <h2 className="text-xl font-semibold text-surface-800 mb-6">Mis Transferencias</h2>

        {transfers.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <p className="text-surface-500">No tienes transferencias</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-surface-600">ID</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-surface-600">Token</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-surface-600">De/Para</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-surface-600">Cantidad</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-surface-600">Estado</th>
                </tr>
              </thead>
              <tbody>
                {transfers.slice(0, 10).map((t) => (
                  <tr key={t.id.toString()} className="border-b border-surface-100 hover:bg-surface-50">
                    <td className="py-3 px-4 font-mono text-sm text-surface-700">#{t.id.toString()}</td>
                    <td className="py-3 px-4 font-mono text-sm text-surface-700">#{t.tokenId.toString()}</td>
                    <td className="py-3 px-4 text-surface-700">
                      {t.from.toLowerCase() === account?.toLowerCase() ? (
                        <span>
                          → {formatAddress(t.to, 4)}
                          {t.toUserRole && <span className="text-xs text-surface-400 ml-1">({formatRole(t.toUserRole)})</span>}
                        </span>
                      ) : (
                        <span>
                          ← {formatAddress(t.from, 4)}
                          {t.fromUserRole && <span className="text-xs text-surface-400 ml-1">({formatRole(t.fromUserRole)})</span>}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-surface-700">{formatNumber(t.amount)}</td>
                    <td className="py-3 px-4">
                      <span className={`status-badge ${getTransferStatusColor(t.status)}`}>
                        {formatTransferStatus(t.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Popup de información sobre Recall para consumidores */}
      {showRecallInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowRecallInfo(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-surface-800">Producto Retirado del Mercado</h3>
            </div>
            <div className="mb-6">
              <p className="text-surface-700 mb-4">
                Este producto ha sido retirado del mercado (recall) por el fabricante o las autoridades sanitarias. 
                Por su seguridad, <strong>no debe utilizar este producto</strong>.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 mb-2 font-semibold">Pasos a seguir:</p>
                <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
                  <li>No consuma ni utilice este producto</li>
                  <li>Conserve el producto en un lugar seguro hasta recibir instrucciones</li>
                  <li>Contacte al punto de venta donde adquirió el producto</li>
                  <li>Siga las instrucciones del fabricante o las autoridades sanitarias</li>
                  <li>Si tiene dudas, consulte con su médico o farmacéutico</li>
                </ol>
              </div>
            </div>
            <button
              onClick={() => setShowRecallInfo(false)}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <AccessGate requireApproval={true}>
      <DashboardContent />
    </AccessGate>
  )
}
