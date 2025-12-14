'use client'

import { useState, useEffect } from 'react'
import { useWeb3 } from '@/contexts/Web3Context'
import { useSupplyChain } from '@/hooks/useSupplyChain'
import { 
  Token, 
  User, 
  UserStatus,
  formatRole 
} from '@/contracts/SupplyChain'
import { formatTimestamp, isValidAddress } from '@/lib/web3Service'
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
    isLoading, 
    error, 
    clearError 
  } = useSupplyChain()
  
  const [user, setUser] = useState<User | null>(null)
  const [tokens, setTokens] = useState<(Token & { balance: bigint })[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'transfer'>('list')
  const [success, setSuccess] = useState<string | null>(null)

  // Form states
  const [newToken, setNewToken] = useState({
    name: '',
    totalSupply: '',
    features: '',
    parentId: '0'
  })

  const [transferData, setTransferData] = useState({
    tokenId: '',
    to: '',
    amount: ''
  })

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

  useEffect(() => {
    loadData()
  }, [isConnected, account])

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setSuccess(null)

    const result = await createToken(
      newToken.name,
      BigInt(newToken.totalSupply),
      newToken.features,
      BigInt(newToken.parentId || '0')
    )

    if (result) {
      setSuccess('Token creado exitosamente')
      setNewToken({ name: '', totalSupply: '', features: '', parentId: '0' })
      loadData()
      setActiveTab('list')
    }
  }

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setSuccess(null)

    if (!isValidAddress(transferData.to)) {
      return
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
        {['list', 'create', 'transfer'].map((tab) => (
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
                      <td className="py-3 px-4 font-mono text-sm">#{token.id.toString()}</td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-surface-800">{token.name}</p>
                          {token.parentId > BigInt(0) && (
                            <p className="text-xs text-surface-500">Parent: #{token.parentId.toString()}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-surface-800">{token.balance.toString()}</td>
                      <td className="py-3 px-4 text-surface-600">{token.totalSupply.toString()}</td>
                      <td className="py-3 px-4 text-surface-600 text-sm">{formatTimestamp(token.dateCreated)}</td>
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
                  placeholder="Ej: Laptop HP ProBook"
                  required
                />
              </div>

              <div>
                <label className="label">Cantidad Total (Supply)</label>
                <input
                  type="number"
                  min="1"
                  value={newToken.totalSupply}
                  onChange={(e) => setNewToken({ ...newToken, totalSupply: e.target.value })}
                  className="input-field"
                  placeholder="Ej: 1000"
                  required
                />
              </div>

              <div>
                <label className="label">Características (JSON)</label>
                <textarea
                  value={newToken.features}
                  onChange={(e) => setNewToken({ ...newToken, features: e.target.value })}
                  className="input-field min-h-[100px]"
                  placeholder='{"color": "negro", "peso": "1.5kg", "origen": "China"}'
                />
              </div>

              <div>
                <label className="label">Token Padre (opcional)</label>
                <input
                  type="number"
                  min="0"
                  value={newToken.parentId}
                  onChange={(e) => setNewToken({ ...newToken, parentId: e.target.value })}
                  className="input-field"
                  placeholder="0 = Sin padre"
                />
                <p className="text-sm text-surface-500 mt-1">
                  Deja en 0 si este token no deriva de otro
                </p>
              </div>

              <button type="submit" disabled={isLoading} className="btn-primary w-full">
                {isLoading ? 'Creando...' : 'Crear Token'}
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
            <form onSubmit={handleTransfer} className="space-y-6">
              <h2 className="text-xl font-semibold text-surface-800 mb-4">Transferir Token</h2>
              
              <div>
                <label className="label">Token a Transferir</label>
                <select
                  value={transferData.tokenId}
                  onChange={(e) => setTransferData({ ...transferData, tokenId: e.target.value })}
                  className="select-field"
                  required
                >
                  <option value="">Selecciona un token</option>
                  {tokens.filter(t => t.balance > BigInt(0)).map((token) => (
                    <option key={token.id.toString()} value={token.id.toString()}>
                      #{token.id.toString()} - {token.name} (Balance: {token.balance.toString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Dirección del Destinatario</label>
                <input
                  type="text"
                  value={transferData.to}
                  onChange={(e) => setTransferData({ ...transferData, to: e.target.value })}
                  className="input-field font-mono"
                  placeholder="0x..."
                  required
                />
                <p className="text-sm text-surface-500 mt-1">
                  El destinatario debe estar registrado y aprobado
                </p>
              </div>

              <div>
                <label className="label">Cantidad</label>
                <input
                  type="number"
                  min="1"
                  value={transferData.amount}
                  onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                  className="input-field"
                  placeholder="Cantidad a transferir"
                  required
                />
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
