'use client'

import Link from 'next/link'
import { useWeb3 } from '@/contexts/Web3Context'
import { useSupplyChain } from '@/hooks/useSupplyChain'
import { useState, useEffect } from 'react'
import { User, UserStatus, formatRole, formatUserStatus, getUserStatusColor } from '@/contracts/SupplyChain'

export function Navbar() {
  const { isConnected, account, connectWallet, disconnectWallet, isLoading, chainId } = useWeb3()
  const { getUserInfo, isAdmin: checkIsAdmin } = useSupplyChain()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  // Cargar datos del usuario
  useEffect(() => {
    const loadUserData = async () => {
      if (isConnected && account) {
        try {
          const userData = await getUserInfo(account)
          if (userData && userData.id > BigInt(0)) {
            setUser(userData)
          } else {
            setUser(null)
          }
          
          const adminStatus = await checkIsAdmin(account)
          setIsAdmin(adminStatus)
        } catch (err) {
          console.error('Error cargando datos del usuario:', err)
          setUser(null)
          setIsAdmin(false)
        }
      } else {
        setUser(null)
        setIsAdmin(false)
      }
    }

    loadUserData()
  }, [isConnected, account, getUserInfo, checkIsAdmin])

  const getNetworkName = (chainId: number | null): string => {
    if (!chainId) return 'Desconocida'
    const networks: Record<number, string> = {
      1: 'Mainnet',
      5: 'Goerli',
      11155111: 'Sepolia',
      31337: 'Localhost',
      1337: 'Localhost',
    }
    return networks[chainId] || `Chain ${chainId}`
  }

  const isApproved = user?.status === UserStatus.Approved
  const isConsumer = user?.role.toLowerCase() === 'consumer' || user?.role.toLowerCase() === 'consumidor'
  const canCreateTokens = user && !isConsumer && (user.role.toLowerCase() === 'admin' || 
    user.role.toLowerCase() === 'administrador' ||
    user.role.toLowerCase() === 'manufacturer' || 
    user.role.toLowerCase() === 'fabricante' ||
    user.role.toLowerCase() === 'distributor' || 
    user.role.toLowerCase() === 'distribuidor' ||
    user.role.toLowerCase() === 'retailer' || 
    user.role.toLowerCase() === 'minorista')

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-surface-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="font-bold text-xl text-surface-800 hidden sm:block">SupplyChain</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-surface-600 hover:text-primary-600 transition-colors font-medium">
              Inicio
            </Link>
            {isConnected && isApproved && (
              <>
                <Link href="/dashboard" className="text-surface-600 hover:text-primary-600 transition-colors font-medium">
                  Dashboard
                </Link>
                {!isConsumer && (
                  <Link href="/products" className="text-surface-600 hover:text-primary-600 transition-colors font-medium">
                    Tokens
                  </Link>
                )}
                {canCreateTokens && (
                  <Link href="/tokens/create" className="text-accent-600 hover:text-accent-700 transition-colors font-medium">
                    + Crear
                  </Link>
                )}
                <Link href="/track" className="text-surface-600 hover:text-primary-600 transition-colors font-medium">
                  Buscar
                </Link>
                {isAdmin && (
                  <Link href="/admin" className="text-purple-600 hover:text-purple-700 transition-colors font-medium">
                    Admin
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center gap-4">
            {isConnected ? (
              <div className="flex items-center gap-3">
                {/* Estado del usuario */}
                {user && (
                  <div className="hidden lg:flex items-center gap-2">
                    <span className={`status-badge ${getUserStatusColor(user.status)}`}>
                      {formatRole(user.role)}
                    </span>
                  </div>
                )}
                
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs text-surface-500">{getNetworkName(chainId)}</span>
                  <span className="font-mono text-sm text-surface-700">
                    {account?.slice(0, 6)}...{account?.slice(-4)}
                  </span>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors font-medium text-sm"
                >
                  Desconectar
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isLoading}
                className="btn-primary text-sm"
              >
                {isLoading ? 'Conectando...' : 'Conectar Wallet'}
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-surface-100 transition-colors"
            >
              <svg className="w-6 h-6 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-surface-200">
            <div className="flex flex-col gap-2">
              {/* Estado del usuario en móvil */}
              {user && (
                <div className="px-4 py-2 mb-2">
                  <span className={`status-badge ${getUserStatusColor(user.status)}`}>
                    {formatRole(user.role)} - {formatUserStatus(user.status)}
                  </span>
                </div>
              )}
              
              <Link
                href="/"
                onClick={() => setIsMenuOpen(false)}
                className="px-4 py-2 text-surface-600 hover:bg-surface-100 rounded-lg transition-colors"
              >
                Inicio
              </Link>
              {isConnected && isApproved && (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setIsMenuOpen(false)}
                    className="px-4 py-2 text-surface-600 hover:bg-surface-100 rounded-lg transition-colors"
                  >
                    Dashboard
                  </Link>
                  {!isConsumer && (
                    <Link
                      href="/products"
                      onClick={() => setIsMenuOpen(false)}
                      className="px-4 py-2 text-surface-600 hover:bg-surface-100 rounded-lg transition-colors"
                    >
                      Tokens
                    </Link>
                  )}
                  {canCreateTokens && (
                    <Link
                      href="/tokens/create"
                      onClick={() => setIsMenuOpen(false)}
                      className="px-4 py-2 text-accent-600 hover:bg-accent-50 rounded-lg transition-colors font-medium"
                    >
                      + Crear Token
                    </Link>
                  )}
                  <Link
                    href="/track"
                    onClick={() => setIsMenuOpen(false)}
                    className="px-4 py-2 text-surface-600 hover:bg-surface-100 rounded-lg transition-colors"
                  >
                    Buscar
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setIsMenuOpen(false)}
                      className="px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors font-medium"
                    >
                      Panel Admin
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
