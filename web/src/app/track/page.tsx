'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSupplyChain } from '@/hooks/useSupplyChain'
import { Token, Transfer, TransferStatus, formatTransferStatus, getTransferStatusColor } from '@/contracts/SupplyChain'
import { formatAddress, formatTimestamp } from '@/lib/web3Service'
import { formatTypeWithDescription, extractBomComponentIds, isComplianceToken } from '@/lib/schemaValidator'
import { AccessGate } from '@/components/AccessGate'

// Tipo extendido para tokens con tokens hijos compliance y componentes BOM
interface TokenWithCompliance extends Token {
  complianceTokens?: Token[]
  bomComponents?: Token[] // Componentes del BOM si este token es un BOM
}

function TrackContentInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { getToken, getTokenBalance, getTokenTransfers, getTokenHierarchy, getTotalTokens, error } = useSupplyChain()
  
  const [tokenId, setTokenId] = useState('')
  const [token, setToken] = useState<Token | null>(null)
  const [creatorBalance, setCreatorBalance] = useState<bigint>(BigInt(0))
  const [hierarchy, setHierarchy] = useState<TokenWithCompliance[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingTrace, setIsLoadingTrace] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'hierarchy' | 'transfers'>('info')
  
  // Historial de navegación para el botón volver
  const [navigationHistory, setNavigationHistory] = useState<string[]>([])
  const [cameFromLink, setCameFromLink] = useState(false)

  // Check URL params on mount
  useEffect(() => {
    const id = searchParams.get('id')
    const from = searchParams.get('from') // Parámetro para saber de dónde viene
    if (id) {
      setTokenId(id)
      if (from) {
        setCameFromLink(true)
      }
      handleSearchToken(id)
    }
  }, [searchParams])

  const handleSearchToken = useCallback(async (id?: string, addToHistory = true) => {
    const searchId = id || tokenId
    if (!searchId) return

    // Agregar al historial si no es la primera carga
    if (addToHistory && tokenId && tokenId !== searchId) {
      setNavigationHistory(prev => [...prev, tokenId])
      setCameFromLink(true)
    }

    setIsSearching(true)
    setSearchError(null)
    setToken(null)
    setHierarchy([])
    setTransfers([])

    try {
      const tokenData = await getToken(BigInt(searchId))
      
      if (!tokenData || tokenData.id === BigInt(0)) {
        setSearchError('Token no encontrado')
        return
      }

      setToken(tokenData)

      // Obtener balance del creador
      const balance = await getTokenBalance(BigInt(searchId), tokenData.creator)
      setCreatorBalance(balance)

      // Cargar traza completa
      setIsLoadingTrace(true)
      
      // Obtener jerarquía base
      const hierarchyData = await getTokenHierarchy(BigInt(searchId))
      
      // Para cada token en la jerarquía, buscar tokens compliance asociados y componentes BOM
      const hierarchyWithCompliance: TokenWithCompliance[] = []
      const totalTokens = await getTotalTokens()
      
      for (const hierToken of hierarchyData) {
        const tokenWithCompliance: TokenWithCompliance = { 
          ...hierToken, 
          complianceTokens: [],
          bomComponents: []
        }
        
        // Buscar tokens que tengan este token como padre y sean tipo COMPLIANCE_LOG
        for (let i = BigInt(1); i <= totalTokens; i++) {
          try {
            const potentialCompliance = await getToken(i)
            if (potentialCompliance && potentialCompliance.parentId === hierToken.id) {
              const features = parseFeatures(potentialCompliance.features)
              if (features && isComplianceToken(features)) {
                tokenWithCompliance.complianceTokens?.push(potentialCompliance)
              }
            }
          } catch {
            // Ignorar errores al buscar tokens
          }
        }
        
        // Si este token es un BOM, cargar y validar sus componentes
        const hierFeatures = parseFeatures(hierToken.features)
        if (hierFeatures) {
          const hierTokenType = getTokenType(hierToken.features)
          if (hierTokenType === 'BOM') {
            const componentIds = extractBomComponentIds(hierFeatures)
            console.log('[DEBUG] BOM encontrado:', {
              tokenId: hierToken.id.toString(),
              features: hierFeatures,
              componentIds,
              parents: hierFeatures.parents
            })
            const components: Token[] = []
            // Validar que los componentes existan
            for (const compId of componentIds) {
              try {
                const compToken = await getToken(BigInt(compId))
                if (compToken && compToken.id > BigInt(0)) {
                  components.push(compToken)
                } else {
                  console.warn('[DEBUG] Componente no encontrado:', compId)
                }
              } catch (err) {
                console.warn('[DEBUG] Error al cargar componente:', compId, err)
                // Ignorar componentes que no existen
              }
            }
            console.log('[DEBUG] Componentes cargados para BOM:', {
              tokenId: hierToken.id.toString(),
              componentIds,
              componentsCount: components.length,
              components: components.map(c => ({ id: c.id.toString(), name: c.name }))
            })
            tokenWithCompliance.bomComponents = components
          }
        }
        
        hierarchyWithCompliance.push(tokenWithCompliance)
      }
      
      setHierarchy(hierarchyWithCompliance)
      
      // Obtener transferencias
      const transfersData = await getTokenTransfers(BigInt(searchId))
      setTransfers(transfersData)

    } catch (err) {
      console.error('Error buscando token:', err)
      setSearchError('Error al buscar el token. Verifica que el ID sea válido.')
    } finally {
      setIsSearching(false)
      setIsLoadingTrace(false)
    }
  }, [tokenId, getToken, getTokenBalance, getTokenHierarchy, getTokenTransfers, getTotalTokens])
  
  // Función para volver al token anterior
  const handleGoBack = () => {
    if (navigationHistory.length > 0) {
      const previousTokenId = navigationHistory[navigationHistory.length - 1]
      setNavigationHistory(prev => prev.slice(0, -1))
      setTokenId(previousTokenId)
      handleSearchToken(previousTokenId, false)
    } else {
      router.back()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearchToken()
  }

  // Parse features JSON
  const parseFeatures = (features: string): Record<string, unknown> | null => {
    if (!features) return null
    try {
      return JSON.parse(features)
    } catch {
      return null
    }
  }

  // Obtener tipo de token desde features
  const getTokenType = (features: string): string | null => {
    const parsed = parseFeatures(features)
    if (parsed && typeof parsed.type === 'string') {
      return parsed.type
    }
    return null
  }

  // Obtener icono según tipo
  const getTokenIcon = (type: string | null): string => {
    switch (type) {
      case 'API_MP': return '🧪'
      case 'BOM': return '📋'
      case 'PT_LOTE': return '💊'
      case 'SSCC': return '📦'
      case 'COMPLIANCE_LOG': return '📝'
      default: return '🏷️'
    }
  }

  // Detectar si un campo es referencia a un token ID
  const isTokenIdField = (key: string): boolean => {
    const tokenIdPatterns = [
      /tokenId$/i,
      /^tokenId$/i,
      /ssccTokenId/i,
      /ptLoteTokenId/i,
      /bomTokenId/i,
      /parentId/i,
    ]
    return tokenIdPatterns.some(pattern => pattern.test(key))
  }

  // Renderizar valor de feature con detección de token IDs
  const renderFeatureValue = (key: string, value: unknown): React.ReactNode => {
    // Si es el campo type, agregar descripción
    if (key === 'type' && typeof value === 'string') {
      return (
        <span className="font-semibold">
          {formatTypeWithDescription(value)}
        </span>
      )
    }

    // Si es un objeto, renderizar recursivamente
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        // Si es un array de objetos (como contents en SSCC)
        return (
          <div className="space-y-2">
            {value.map((item, idx) => (
              <div key={idx} className="p-2 bg-white rounded border border-surface-200 text-xs">
                {typeof item === 'object' && item !== null ? (
                  Object.entries(item).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2">
                      <span className="text-surface-500 capitalize">{k}:</span>
                      <span className="text-surface-800">{renderFeatureValue(k, v)}</span>
                    </div>
                  ))
                ) : (
                  String(item)
                )}
              </div>
            ))}
          </div>
        )
      }
      // Objeto simple - mostrar propiedades
      return (
        <div className="space-y-1 text-xs">
          {Object.entries(value).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2">
              <span className="text-surface-500 capitalize">{k}:</span>
              <span className="text-surface-800">{renderFeatureValue(k, v)}</span>
            </div>
          ))}
        </div>
      )
    }

    // Si es un campo de token ID con valor numérico válido
    if (isTokenIdField(key) && value !== null && value !== undefined) {
      const numValue = Number(value)
      if (!isNaN(numValue) && numValue > 0) {
        return (
          <button
            onClick={() => {
              setTokenId(numValue.toString())
              handleSearchToken(numValue.toString())
            }}
            className="text-primary-600 hover:text-primary-700 font-mono underline"
          >
            #{numValue} →
          </button>
        )
      }
    }

    return String(value)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-surface-800 mb-2">Trazabilidad de Token</h1>
        <p className="text-surface-600">Visualiza la traza completa: jerarquía e historial de transferencias</p>
      </div>

      {/* Search Form */}
      <div className="card mb-8">
        <form onSubmit={handleSubmit} className="flex gap-4">
          <input
            type="number"
            min="1"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            className="input-field flex-1"
            placeholder="ID del token (ej: 1, 2, 3...)"
          />
          <button
            type="submit"
            disabled={isSearching || !tokenId}
            className="btn-primary"
          >
            {isSearching ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Buscando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Buscar
              </span>
            )}
          </button>
        </form>
      </div>

      {/* Error Messages */}
      {(searchError || error) && (
        <div className="mb-6 p-4 bg-red-100 border border-red-200 rounded-xl flex items-center gap-3">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-800">{typeof (searchError || error) === 'string' ? (searchError || error) : JSON.stringify(searchError || error)}</p>
        </div>
      )}

      {/* Token Info */}
      {token && (
        <div className="space-y-6 animate-fade-in">
          {/* Botón Volver */}
          {(cameFromLink || navigationHistory.length > 0) && (
            <button
              onClick={handleGoBack}
              className="flex items-center gap-2 text-surface-600 hover:text-surface-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al token anterior
            </button>
          )}

          {/* Token Header */}
          <div className="card">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="text-4xl">{getTokenIcon(getTokenType(token.features))}</div>
                <div>
                  <h2 className="text-2xl font-bold text-surface-800">{token.name}</h2>
                  <p className="text-surface-500 font-mono">Token ID: #{token.id.toString()}</p>
                  {getTokenType(token.features) && (
                    <span className="inline-block mt-1 px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs font-semibold">
                      {formatTypeWithDescription(getTokenType(token.features) || '')}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="px-4 py-2 bg-primary-100 text-primary-700 rounded-lg font-semibold">
                  Supply: {token.totalSupply.toString()}
                </div>
                <p className="text-sm text-surface-500 mt-2">
                  Creado: {formatTimestamp(token.dateCreated)}
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-surface-200 -mx-6 px-6">
              {[
                { id: 'info', label: 'Información', icon: 'ℹ️' },
                { id: 'hierarchy', label: 'Jerarquía', icon: '🌳', count: hierarchy.length },
                { id: 'transfers', label: 'Transferencias', icon: '↔️', count: transfers.length }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-surface-500 hover:text-surface-700'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="ml-2 px-2 py-0.5 bg-surface-100 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'info' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-surface-800 mb-4">Detalles del Token</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-surface-500">Creador</p>
                    <p className="text-surface-800 font-mono">{formatAddress(token.creator, 8)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-surface-500">Balance del Creador</p>
                    <p className="text-surface-800 font-mono">{creatorBalance.toString()} / {token.totalSupply.toString()}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {token.parentId > BigInt(0) && (
                    <div>
                      <p className="text-sm text-surface-500">Token Padre</p>
                      <button
                        onClick={() => {
                          setTokenId(token.parentId.toString())
                          handleSearchToken(token.parentId.toString())
                        }}
                        className="text-primary-600 hover:text-primary-700 font-mono"
                      >
                        #{token.parentId.toString()} →
                      </button>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-surface-500">Fecha de Creación</p>
                    <p className="text-surface-800">{formatTimestamp(token.dateCreated)}</p>
                  </div>
                </div>
              </div>

              {/* Features */}
              {token.features && (
                <div className="mt-6 pt-6 border-t border-surface-200">
                  <h4 className="text-md font-semibold text-surface-800 mb-4">Características</h4>
                  {parseFeatures(token.features) ? (
                    <div className="grid md:grid-cols-2 gap-3">
                      {Object.entries(parseFeatures(token.features)!).map(([key, value]) => (
                        <div key={key} className="p-3 bg-surface-50 rounded-lg">
                          <p className="text-xs text-surface-500 capitalize mb-1">{key}</p>
                          <div className="text-sm text-surface-800 font-medium break-all">
                            {renderFeatureValue(key, value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-surface-50 rounded-lg">
                      <code className="text-sm text-surface-700 break-all">{token.features}</code>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Hierarchy Tab */}
          {activeTab === 'hierarchy' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-surface-800 mb-4">
                🌳 Árbol de Jerarquía
              </h3>
              
              {isLoadingTrace ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : hierarchy.length === 0 ? (
                <div className="text-center py-8 text-surface-500">
                  No hay jerarquía para este token
                </div>
              ) : (
                <div className="relative">
                  {/* Visual Tree - Jerarquía principal */}
                  <div className="space-y-0">
                    {hierarchy.map((item, index) => {
                      const isFirst = index === 0
                      const isLast = index === hierarchy.length - 1
                      const tokenType = getTokenType(item.features)
                      const hasCompliance = item.complianceTokens && item.complianceTokens.length > 0
                      const hasBomComponents = item.bomComponents && item.bomComponents.length > 0
                      const isBom = tokenType === 'BOM'
                      
                      return (
                        <div key={item.id.toString()} className="relative">
                          {/* Connector line */}
                          {!isFirst && (
                            <div className="absolute left-6 -top-4 w-0.5 h-4 bg-surface-300"></div>
                          )}
                          
                          <div 
                            className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all ${
                              isFirst 
                                ? 'border-primary-500 bg-primary-50' 
                                : 'border-surface-200 bg-white hover:border-surface-300'
                            }`}
                          >
                            {/* Icon */}
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                              isFirst ? 'bg-primary-100' : 'bg-surface-100'
                            }`}>
                              {getTokenIcon(tokenType)}
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-sm text-surface-500">#{item.id.toString()}</span>
                                {isFirst && (
                                  <span className="px-2 py-0.5 bg-primary-600 text-white text-xs rounded-full">
                                    Token Actual
                                  </span>
                                )}
                                {isLast && !isFirst && (
                                  <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">
                                    Root
                                  </span>
                                )}
                              </div>
                              <h4 className="font-semibold text-surface-800 truncate">{item.name}</h4>
                              <div className="flex flex-wrap gap-3 mt-2 text-sm text-surface-500">
                                {tokenType && (
                                  <span className="px-2 py-0.5 bg-surface-100 rounded text-xs">
                                    {formatTypeWithDescription(tokenType)}
                                  </span>
                                )}
                                <span>Supply: {item.totalSupply.toString()}</span>
                                <span>{formatTimestamp(item.dateCreated)}</span>
                              </div>
                            </div>
                            
                            {/* Action */}
                            {!isFirst && (
                              <button
                                onClick={() => {
                                  setTokenId(item.id.toString())
                                  handleSearchToken(item.id.toString())
                                }}
                                className="px-3 py-1 text-sm bg-surface-100 hover:bg-surface-200 rounded-lg transition-colors"
                              >
                                Ver
                              </button>
                            )}
                          </div>
                          
                          {/* Componentes del BOM (sub-nivel debajo del BOM) */}
                          {isBom && hasBomComponents && (
                            <div className="ml-12 mt-2 space-y-2">
                              <p className="text-xs text-surface-500 flex items-center gap-1">
                                <span>🧪</span> Componentes de la Receta (Materias Primas):
                              </p>
                              {item.bomComponents?.map((comp) => {
                                const compType = getTokenType(comp.features)
                                return (
                                  <div 
                                    key={comp.id.toString()}
                                    className="flex items-center gap-3 p-2 bg-green-50 rounded-lg border border-green-200 ml-4"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-lg">
                                      {getTokenIcon(compType)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-mono text-xs text-green-600">#{comp.id.toString()}</p>
                                      <p className="font-medium text-surface-800 truncate text-sm">{comp.name}</p>
                                      {compType && (
                                        <span className="text-xs text-green-700">{formatTypeWithDescription(compType)}</span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => {
                                        setTokenId(comp.id.toString())
                                        handleSearchToken(comp.id.toString())
                                      }}
                                      className="px-2 py-1 text-xs bg-green-200 hover:bg-green-300 rounded transition-colors"
                                    >
                                      Ver
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                          
                          {/* Tokens Compliance asociados (sub-nivel) */}
                          {hasCompliance && (
                            <div className="ml-12 mt-2 space-y-2">
                              <p className="text-xs text-surface-500 flex items-center gap-1">
                                <span>📝</span> Registros de Cumplimiento:
                              </p>
                              {item.complianceTokens?.map((comp) => {
                                const compFeatures = parseFeatures(comp.features) as Record<string, unknown> | null
                                const custom = compFeatures?.custom as Record<string, unknown> | undefined
                                const compKind = (custom?.kind as string) || 'Log'
                                return (
                                  <div 
                                    key={comp.id.toString()}
                                    className="flex items-center gap-3 p-2 bg-purple-50 rounded-lg border border-purple-200 ml-4"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-lg">
                                      📝
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-mono text-xs text-purple-600">#{comp.id.toString()}</p>
                                      <p className="font-medium text-surface-800 truncate text-sm">{comp.name}</p>
                                      <span className="text-xs text-purple-600">{compKind}</span>
                                    </div>
                                    <button
                                      onClick={() => {
                                        setTokenId(comp.id.toString())
                                        handleSearchToken(comp.id.toString())
                                      }}
                                      className="px-2 py-1 text-xs bg-purple-200 hover:bg-purple-300 rounded transition-colors"
                                    >
                                      Ver
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                          
                          {/* Arrow down */}
                          {!isLast && (
                            <div className="flex justify-center py-2">
                              <svg className="w-6 h-6 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                              </svg>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* Summary */}
                  <div className="mt-6 p-4 bg-surface-50 rounded-xl">
                    <p className="text-sm text-surface-600">
                      <strong>Profundidad:</strong> {hierarchy.length} nivel{hierarchy.length !== 1 ? 'es' : ''}
                      {hierarchy.length > 1 && (
                        <span className="ml-4">
                          <strong>Root:</strong> #{hierarchy[hierarchy.length - 1].id.toString()} - {hierarchy[hierarchy.length - 1].name}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Transfers Tab */}
          {activeTab === 'transfers' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-surface-800 mb-4">
                ↔️ Historial de Transferencias
              </h3>
              
              {isLoadingTrace ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : transfers.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <p className="text-surface-500">No hay transferencias para este token</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {/* Timeline */}
                  {transfers.map((transfer, index) => {
                    const isFirst = index === 0
                    const isLast = index === transfers.length - 1
                    
                    return (
                      <div key={transfer.id.toString()} className="relative flex gap-4">
                        {/* Timeline line */}
                        <div className="flex flex-col items-center">
                          <div className={`w-4 h-4 rounded-full border-2 z-10 ${
                            transfer.status === TransferStatus.Accepted 
                              ? 'bg-green-500 border-green-500' 
                              : transfer.status === TransferStatus.Rejected
                                ? 'bg-red-500 border-red-500'
                                : 'bg-yellow-500 border-yellow-500'
                          }`}></div>
                          {!isLast && (
                            <div className="w-0.5 flex-1 bg-surface-200 -my-1"></div>
                          )}
                        </div>
                        
                        {/* Content */}
                        <div className={`flex-1 pb-6 ${isLast ? 'pb-0' : ''}`}>
                          <div className="p-4 bg-surface-50 rounded-xl">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <span className="font-mono text-sm text-surface-500">
                                  Transferencia #{transfer.id.toString()}
                                </span>
                                <p className="text-sm text-surface-600 mt-1">
                                  {formatTimestamp(transfer.dateCreated)}
                                </p>
                              </div>
                              <span className={`status-badge ${getTransferStatusColor(transfer.status)}`}>
                                {formatTransferStatus(transfer.status)}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-3 text-sm">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-surface-500 mb-1">De</p>
                                <p className="font-mono text-surface-800 truncate">
                                  {formatAddress(transfer.from, 6)}
                                </p>
                              </div>
                              
                              <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-white rounded-lg">
                                <span className="font-semibold text-primary-600">
                                  {transfer.amount.toString()}
                                </span>
                                <svg className="w-4 h-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                              </div>
                              
                              <div className="flex-1 min-w-0 text-right">
                                <p className="text-xs text-surface-500 mb-1">A</p>
                                <p className="font-mono text-surface-800 truncate">
                                  {formatAddress(transfer.to, 6)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* Summary */}
                  <div className="mt-6 p-4 bg-surface-50 rounded-xl">
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="text-surface-500">Total:</span>
                        <span className="ml-2 font-semibold text-surface-800">{transfers.length}</span>
                      </div>
                      <div>
                        <span className="text-surface-500">Aceptadas:</span>
                        <span className="ml-2 font-semibold text-green-600">
                          {transfers.filter(t => t.status === TransferStatus.Accepted).length}
                        </span>
                      </div>
                      <div>
                        <span className="text-surface-500">Pendientes:</span>
                        <span className="ml-2 font-semibold text-yellow-600">
                          {transfers.filter(t => t.status === TransferStatus.Pending).length}
                        </span>
                      </div>
                      <div>
                        <span className="text-surface-500">Rechazadas:</span>
                        <span className="ml-2 font-semibold text-red-600">
                          {transfers.filter(t => t.status === TransferStatus.Rejected).length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!token && !isSearching && !searchError && (
        <div className="card text-center py-12">
          <div className="w-20 h-20 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-surface-800 mb-2">Busca un Token</h3>
          <p className="text-surface-500 max-w-md mx-auto">
            Ingresa el ID del token para ver su información completa, 
            jerarquía de tokens padre e historial de transferencias.
          </p>
        </div>
      )}
    </div>
  )
}

function TrackContent() {
  return (
    <AccessGate requireApproval={true}>
      <TrackContentInner />
    </AccessGate>
  )
}

export default function TrackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    }>
      <TrackContent />
    </Suspense>
  )
}
