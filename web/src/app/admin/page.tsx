'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWeb3 } from '@/contexts/Web3Context'
import { useSupplyChain } from '@/hooks/useSupplyChain'
import { User, UserStatus, formatUserStatus, getUserStatusColor, formatRole, EXPECTED_CHAIN_ID } from '@/contracts/SupplyChain'
import { formatAddress, formatNumber } from '@/lib/web3Service'
import { AccessGate } from '@/components/AccessGate'

function AdminContent() {
  const { isConnected, account, chainId } = useWeb3()
  const { 
    isAdmin: checkIsAdmin, 
    getTotalUsers,
    getUserInfo,
    getAllUsers,
    changeStatusUser,
    isLoading,
    error,
    clearError
  } = useSupplyChain()
  
  const [isAdmin, setIsAdmin] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [loadingData, setLoadingData] = useState(true)
  const [success, setSuccess] = useState<string | null>(null)

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  
  // Filtros
  const [searchAddress, setSearchAddress] = useState('')
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all')
  
  // Usuario seleccionado para ver detalle
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const loadUsers = useCallback(async () => {
    if (!isConnected || !account || chainId !== EXPECTED_CHAIN_ID) {
      setLoadingData(false)
      return
    }

    setLoadingData(true)
    try {
      const adminStatus = await checkIsAdmin(account)
      setIsAdmin(adminStatus)

      if (adminStatus) {
        const { users: usersData, total } = await getAllUsers(currentPage, pageSize)
        setUsers(usersData)
        setTotalUsers(total)
      }
    } catch (err) {
      console.error('Error cargando usuarios:', err)
    } finally {
      setLoadingData(false)
    }
  }, [isConnected, account, chainId, checkIsAdmin, getAllUsers, currentPage, pageSize])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  // Filtrar usuarios localmente
  const filteredUsers = users.filter(user => {
    // Filtro por búsqueda de dirección
    if (searchAddress) {
      const searchLower = searchAddress.toLowerCase()
      if (!user.userAddress.toLowerCase().includes(searchLower)) {
        return false
      }
    }
    
    // Filtro por estado
    if (statusFilter !== 'all' && user.status !== statusFilter) {
      return false
    }
    
    return true
  })

  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchAddress) {
      loadUsers()
      return
    }

    setLoadingData(true)
    clearError()

    try {
      const user = await getUserInfo(searchAddress)
      if (user && user.id > BigInt(0)) {
        setUsers([user])
        setTotalUsers(1)
      } else {
        setUsers([])
        setTotalUsers(0)
      }
    } catch (err) {
      console.error('Error buscando usuario:', err)
      setUsers([])
      setTotalUsers(0)
    } finally {
      setLoadingData(false)
    }
  }

  const handleClearSearch = () => {
    setSearchAddress('')
    setStatusFilter('all')
    setCurrentPage(1)
    loadUsers()
  }

  const handleChangeStatus = async (userAddress: string, newStatus: UserStatus) => {
    clearError()
    setSuccess(null)

    const result = await changeStatusUser(userAddress, newStatus)
    
    if (result) {
      setSuccess(`Estado del usuario actualizado a ${formatUserStatus(newStatus)}`)
      
      // Actualizar usuario en la lista
      setUsers(prev => prev.map(u => 
        u.userAddress.toLowerCase() === userAddress.toLowerCase()
          ? { ...u, status: newStatus }
          : u
      ))
      
      // Actualizar usuario seleccionado si está abierto
      if (selectedUser && selectedUser.userAddress.toLowerCase() === userAddress.toLowerCase()) {
        setSelectedUser({ ...selectedUser, status: newStatus })
      }
    }
  }

  const handleViewDetail = (user: User) => {
    setSelectedUser(user)
    setShowDetailModal(true)
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(totalUsers / pageSize)

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
          <p className="text-surface-600">Conecta tu wallet para acceder al panel de administración</p>
        </div>
      </div>
    )
  }

  if (loadingData && users.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="card text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-surface-800 mb-2">Acceso Denegado</h2>
          <p className="text-surface-600">Solo el administrador puede acceder a esta página</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-surface-800">Panel de Administración</h1>
        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
          Admin
        </span>
      </div>

      {/* Alerts */}
      {success && (
        <div className="mb-6 p-4 bg-green-100 border border-green-200 rounded-xl flex items-center gap-3">
          <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-green-800">{success}</p>
          <button onClick={() => setSuccess(null)} className="ml-auto text-green-600 hover:text-green-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
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

      {/* Filtros y búsqueda */}
      <div className="card mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Búsqueda por dirección */}
          <form onSubmit={handleSearchUser} className="flex-1 flex gap-2">
            <input
              type="text"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              className="input-field flex-1 font-mono text-sm"
              placeholder="Buscar por dirección (0x...)"
            />
            <button type="submit" className="btn-primary px-4">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>

          {/* Filtro por estado */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-surface-600 whitespace-nowrap">Estado:</label>
            <select
              value={statusFilter === 'all' ? 'all' : statusFilter.toString()}
              onChange={(e) => setStatusFilter(e.target.value === 'all' ? 'all' : Number(e.target.value) as UserStatus)}
              className="select-field w-40"
            >
              <option value="all">Todos</option>
              <option value={UserStatus.Pending}>Pendiente</option>
              <option value={UserStatus.Approved}>Aprobado</option>
              <option value={UserStatus.Rejected}>Rechazado</option>
              <option value={UserStatus.Canceled}>Cancelado</option>
            </select>
          </div>

          {/* Limpiar filtros */}
          {(searchAddress || statusFilter !== 'all') && (
            <button onClick={handleClearSearch} className="btn-secondary px-4">
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Lista de usuarios */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-surface-800">
            Usuarios ({formatNumber(filteredUsers.length)} de {formatNumber(totalUsers)})
          </h2>
          
          {/* Selector de página */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-surface-600">Mostrar:</label>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="select-field w-20 py-2 text-sm"
            >
              <option value={10}>10</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {loadingData ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-surface-500">No se encontraron usuarios</p>
          </div>
        ) : (
          <>
            {/* Tabla de usuarios */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-surface-600">ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-surface-600">Dirección</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-surface-600">Rol</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-surface-600">Estado</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-surface-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id.toString()} className="border-b border-surface-100 hover:bg-surface-50">
                      <td className="py-3 px-4 font-mono text-sm text-surface-700">#{user.id.toString()}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm text-surface-700">{formatAddress(user.userAddress, 6)}</span>
                      </td>
                      <td className="py-3 px-4 text-surface-700">{formatRole(user.role)}</td>
                      <td className="py-3 px-4">
                        <span className={`status-badge ${getUserStatusColor(user.status)}`}>
                          {formatUserStatus(user.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleViewDetail(user)}
                            className="px-3 py-1 text-sm bg-surface-100 text-surface-700 rounded-lg hover:bg-surface-200 transition-colors"
                          >
                            Ver
                          </button>
                          {user.status !== UserStatus.Approved && (
                            <button
                              onClick={() => handleChangeStatus(user.userAddress, UserStatus.Approved)}
                              disabled={isLoading}
                              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                            >
                              Aprobar
                            </button>
                          )}
                          {user.status !== UserStatus.Rejected && user.status !== UserStatus.Approved && (
                            <button
                              onClick={() => handleChangeStatus(user.userAddress, UserStatus.Rejected)}
                              disabled={isLoading}
                              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                            >
                              Rechazar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-6 pt-6 border-t border-surface-200">
                <p className="text-sm text-surface-600">
                  Página {currentPage} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm bg-surface-100 text-surface-700 rounded-lg hover:bg-surface-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm bg-surface-100 text-surface-700 rounded-lg hover:bg-surface-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de detalle */}
      {showDetailModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-surface-800">
                    Usuario #{selectedUser.id.toString()}
                  </h3>
                  <p className="text-sm text-surface-500 mt-1">Detalle del usuario</p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-surface-400 hover:text-surface-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-surface-50 rounded-xl">
                  <p className="text-sm text-surface-500 mb-1">Dirección</p>
                  <p className="font-mono text-sm text-surface-800 break-all">{selectedUser.userAddress}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-surface-50 rounded-xl">
                    <p className="text-sm text-surface-500 mb-1">Rol</p>
                    <p className="font-medium text-surface-800">{formatRole(selectedUser.role)}</p>
                  </div>
                  <div className="p-4 bg-surface-50 rounded-xl">
                    <p className="text-sm text-surface-500 mb-1">Estado</p>
                    <span className={`status-badge ${getUserStatusColor(selectedUser.status)}`}>
                      {formatUserStatus(selectedUser.status)}
                    </span>
                  </div>
                </div>

                {/* Acciones de cambio de estado */}
                <div className="pt-4 border-t border-surface-200">
                  <p className="text-sm text-surface-500 mb-3">Cambiar estado:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.status !== UserStatus.Approved && (
                      <button
                        onClick={() => handleChangeStatus(selectedUser.userAddress, UserStatus.Approved)}
                        disabled={isLoading}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        ✓ Aprobar
                      </button>
                    )}
                    {selectedUser.status !== UserStatus.Pending && (
                      <button
                        onClick={() => handleChangeStatus(selectedUser.userAddress, UserStatus.Pending)}
                        disabled={isLoading}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                      >
                        ⏳ Pendiente
                      </button>
                    )}
                    {selectedUser.status !== UserStatus.Rejected && (
                      <button
                        onClick={() => handleChangeStatus(selectedUser.userAddress, UserStatus.Rejected)}
                        disabled={isLoading}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        ✗ Rechazar
                      </button>
                    )}
                    {selectedUser.status !== UserStatus.Canceled && (
                      <button
                        onClick={() => handleChangeStatus(selectedUser.userAddress, UserStatus.Canceled)}
                        disabled={isLoading}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                      >
                        ⊘ Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-surface-200">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="btn-secondary w-full"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminPage() {
  return (
    <AccessGate requireApproval={true}>
      <AdminContent />
    </AccessGate>
  )
}
