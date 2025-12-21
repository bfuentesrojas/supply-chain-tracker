'use client'

import { useState } from 'react'

// URL base de la API MCP (puerto 3002)
const MCP_API_BASE = 'http://localhost:3002'

interface ApiResponse {
  success: boolean
  error?: string
  details?: any[]
  [key: string]: any
}

export default function ToolsPage() {
  const [health, setHealth] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [results, setResults] = useState<Record<string, ApiResponse>>({})

  // Health check
  const checkHealth = async () => {
    setLoading(prev => ({ ...prev, health: true }))
    try {
      const res = await fetch(`${MCP_API_BASE}/health`)
      const data = await res.json()
      setHealth(data)
    } catch (error: any) {
      setHealth({ success: false, error: error.message })
    } finally {
      setLoading(prev => ({ ...prev, health: false }))
    }
  }

  // Forge Build
  const handleForgeBuild = async (skipTest: boolean = false) => {
    setLoading(prev => ({ ...prev, build: true }))
    try {
      const res = await fetch(`${MCP_API_BASE}/forge/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skipTest })
      })
      const data = await res.json()
      setResults(prev => ({ ...prev, build: data }))
    } catch (error: any) {
      setResults(prev => ({ ...prev, build: { success: false, error: error.message } }))
    } finally {
      setLoading(prev => ({ ...prev, build: false }))
    }
  }

  // Forge Test
  const handleForgeTest = async (verbosity: number = 2, matchTest?: string) => {
    setLoading(prev => ({ ...prev, test: true }))
    try {
      const res = await fetch(`${MCP_API_BASE}/forge/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verbosity, matchTest: matchTest || undefined })
      })
      const data = await res.json()
      setResults(prev => ({ ...prev, test: data }))
    } catch (error: any) {
      setResults(prev => ({ ...prev, test: { success: false, error: error.message } }))
    } finally {
      setLoading(prev => ({ ...prev, test: false }))
    }
  }

  // Anvil Restart - Detiene todos los procesos Anvil y reinicia con un nuevo PID
  const handleAnvilRestart = async (port: number = 8545, chainId?: number) => {
    setLoading(prev => ({ ...prev, anvilRestart: true }))
    // Limpiar resultado anterior
    setResults(prev => ({ ...prev, anvilRestart: undefined }))
    try {
      const res = await fetch(`${MCP_API_BASE}/anvil/restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port, chainId })
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Error desconocido' }))
        throw new Error(errorData.error || `Error ${res.status}: ${res.statusText}`)
      }
      
      const data = await res.json()
      setResults(prev => ({ ...prev, anvilRestart: data }))
      
      // Refrescar health después de reiniciar
      setTimeout(() => {
        checkHealth()
      }, 3000)
    } catch (error: any) {
      setResults(prev => ({ 
        ...prev, 
        anvilRestart: { 
          success: false, 
          error: error.message || 'Error al reiniciar Anvil. Verifica que el servidor API esté corriendo.' 
        } 
      }))
      console.error('Error reiniciando Anvil:', error)
    } finally {
      setLoading(prev => ({ ...prev, anvilRestart: false }))
    }
  }

  // Cast Call
  const handleCastCall = async (address: string, functionSig: string, rpcUrl: string = 'http://127.0.0.1:8545') => {
    setLoading(prev => ({ ...prev, castCall: true }))
    try {
      const res = await fetch(`${MCP_API_BASE}/cast/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, functionSignature: functionSig, rpcUrl })
      })
      const data = await res.json()
      setResults(prev => ({ ...prev, castCall: data }))
    } catch (error: any) {
      setResults(prev => ({ ...prev, castCall: { success: false, error: error.message } }))
    } finally {
      setLoading(prev => ({ ...prev, castCall: false }))
    }
  }

  // Cast Send
  const handleCastSend = async (
    address: string,
    privateKey: string,
    functionSig?: string,
    value?: string,
    rpcUrl: string = 'http://127.0.0.1:8545'
  ) => {
    setLoading(prev => ({ ...prev, castSend: true }))
    try {
      const res = await fetch(`${MCP_API_BASE}/cast/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          privateKey,
          functionSignature: functionSig,
          value,
          rpcUrl
        })
      })
      const data = await res.json()
      setResults(prev => ({ ...prev, castSend: data }))
    } catch (error: any) {
      setResults(prev => ({ ...prev, castSend: { success: false, error: error.message } }))
    } finally {
      setLoading(prev => ({ ...prev, castSend: false }))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-50 to-surface-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-surface-800 mb-2">🔧 MCP Foundry Tools</h1>
          <p className="text-surface-600">Interfaz para invocar herramientas Foundry de forma segura</p>
        </div>

        {/* Health Check */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-surface-800">Health Check</h2>
              <p className="text-sm text-surface-600 mt-1">Verifica el estado y versiones de las herramientas Foundry instaladas (forge, anvil, cast) y si Anvil está corriendo.</p>
            </div>
            <button
              onClick={checkHealth}
              disabled={loading.health}
              className="btn-primary"
            >
              {loading.health ? 'Verificando...' : 'Verificar Estado'}
            </button>
          </div>
          {health && (
            <div className={`p-4 rounded-lg ${health.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold">Estado de Anvil:</span>
                  {health.anvil?.running ? (
                    <span className="px-2 py-1 bg-green-200 text-green-800 rounded text-sm">✅ Corriendo</span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-sm">⏹️ Detenido</span>
                  )}
                </div>
                {health.anvil?.pid && (
                  <div className="text-sm text-gray-700 mb-1">
                    <strong>PID:</strong> {health.anvil.pid}
                  </div>
                )}
                {health.anvil?.port && (
                  <div className="text-sm text-gray-700 mb-1">
                    <strong>Puerto:</strong> {health.anvil.port}
                  </div>
                )}
                {health.anvil?.warning && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                    ⚠️ {health.anvil.warning}
                  </div>
                )}
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium mb-2">Ver detalles completos</summary>
                <pre className="text-xs overflow-auto max-h-96 bg-white p-3 rounded border mt-2">{JSON.stringify(health, null, 2)}</pre>
              </details>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Forge Build */}
          <div className="card">
            <h2 className="text-xl font-semibold text-surface-800 mb-2">Forge Build</h2>
            <p className="text-sm text-surface-600 mb-4">Compila los smart contracts del proyecto. Puedes elegir compilar con o sin ejecutar los tests.</p>
            <div className="space-y-3">
              <button
                onClick={() => handleForgeBuild(false)}
                disabled={loading.build}
                className="btn-primary w-full"
              >
                {loading.build ? 'Compilando...' : 'Compilar (con tests)'}
              </button>
              <button
                onClick={() => handleForgeBuild(true)}
                disabled={loading.build}
                className="btn-secondary w-full"
              >
                {loading.build ? 'Compilando...' : 'Compilar (sin tests)'}
              </button>
              {results.build && (
                <div className={`p-4 rounded-lg mt-4 ${results.build.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="mb-2">
                    <strong>Comando:</strong> {results.build.command}
                  </div>
                  {results.build.stdout && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium">Output</summary>
                      <pre className="text-xs mt-2 overflow-auto max-h-64 bg-white p-2 rounded">{results.build.stdout}</pre>
                    </details>
                  )}
                  {results.build.error && (
                    <div className="text-red-600 text-sm mt-2">{results.build.error}</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Forge Test */}
          <div className="card">
            <h2 className="text-xl font-semibold text-surface-800 mb-2">Forge Test</h2>
            <p className="text-sm text-surface-600 mb-4">Ejecuta los tests unitarios de los smart contracts. Puedes ajustar el nivel de detalle y filtrar por nombre de test.</p>
            <div className="space-y-3">
              <div>
                <label className="label">Verbosity (0-5)</label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  defaultValue="2"
                  id="testVerbosity"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Match Test (opcional)</label>
                <input
                  type="text"
                  id="matchTest"
                  placeholder="testCreateToken"
                  className="input-field"
                />
              </div>
              <button
                onClick={() => {
                  const verbosity = parseInt((document.getElementById('testVerbosity') as HTMLInputElement)?.value || '2')
                  const matchTest = (document.getElementById('matchTest') as HTMLInputElement)?.value || undefined
                  handleForgeTest(verbosity, matchTest)
                }}
                disabled={loading.test}
                className="btn-primary w-full"
              >
                {loading.test ? 'Ejecutando tests...' : 'Ejecutar Tests'}
              </button>
              {results.test && (
                <div className={`p-4 rounded-lg mt-4 ${results.test.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  {results.test.summary && (
                    <div className="mb-2">
                      <strong>Resumen:</strong> {results.test.summary.passed || 0} pasados, {results.test.summary.failed || 0} fallidos
                    </div>
                  )}
                  {results.test.stdout && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium">Output</summary>
                      <pre className="text-xs mt-2 overflow-auto max-h-64 bg-white p-2 rounded">{results.test.stdout}</pre>
                    </details>
                  )}
                  {results.test.error && (
                    <div className="text-red-600 text-sm mt-2">{results.test.error}</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Anvil Restart */}
          <div className="card">
            <h2 className="text-xl font-semibold text-surface-800 mb-2">Anvil Restart</h2>
            <p className="text-sm text-surface-600 mb-4">Detiene todos los procesos Anvil existentes y reinicia un nuevo nodo blockchain local. Útil para limpiar procesos zombies o iniciar desde cero.</p>
            <div className="space-y-3">
              <div>
                <label className="label">Puerto</label>
                <input
                  type="number"
                  min="1"
                  max="65535"
                  defaultValue="8545"
                  id="anvilPort"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Chain ID (opcional)</label>
                <input
                  type="number"
                  id="anvilChainId"
                  placeholder="31337"
                  className="input-field"
                />
              </div>
              <button
                onClick={() => {
                  const port = parseInt((document.getElementById('anvilPort') as HTMLInputElement)?.value || '8545')
                  const chainId = (document.getElementById('anvilChainId') as HTMLInputElement)?.value
                  handleAnvilRestart(port, chainId ? parseInt(chainId) : undefined)
                }}
                disabled={loading.anvilRestart}
                className="btn-primary w-full"
              >
                {loading.anvilRestart ? 'Reiniciando...' : 'Reiniciar Anvil'}
              </button>
              {results.anvilRestart && (
                <div className={`p-4 rounded-lg mt-4 ${results.anvilRestart.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="text-sm">
                    {results.anvilRestart.success ? (
                      <>
                        <div className="font-semibold text-green-800 mb-2">✅ {results.anvilRestart.message || 'Anvil reiniciado correctamente'}</div>
                        {results.anvilRestart.oldPids && results.anvilRestart.oldPids.length > 0 && (
                          <div className="mt-1 text-green-700"><strong>PIDs anteriores:</strong> {results.anvilRestart.oldPids.join(', ')}</div>
                        )}
                        {results.anvilRestart.newPid && (
                          <div className="mt-1 text-green-700"><strong>Nuevo PID:</strong> {results.anvilRestart.newPid}</div>
                        )}
                        {results.anvilRestart.port && (
                          <div className="mt-1 text-green-700"><strong>Puerto:</strong> {results.anvilRestart.port}</div>
                        )}
                        {results.anvilRestart.host && (
                          <div className="mt-1 text-green-700"><strong>Host:</strong> {results.anvilRestart.host}</div>
                        )}
                        {results.anvilRestart.stoppedPids && results.anvilRestart.stoppedPids.length > 0 && (
                          <div className="mt-1 text-green-700 text-xs"><strong>PIDs detenidos:</strong> {results.anvilRestart.stoppedPids.join(', ')}</div>
                        )}
                        {results.anvilRestart.warnings && results.anvilRestart.warnings.length > 0 && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                            <strong className="text-yellow-800">Advertencias:</strong>
                            <ul className="mt-1 text-yellow-700 list-disc list-inside">
                              {results.anvilRestart.warnings.map((warning: string, idx: number) => (
                                <li key={idx}>{warning}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="font-semibold text-red-800 mb-2">❌ Error: {results.anvilRestart.error || 'No se pudo reiniciar Anvil'}</div>
                        {results.anvilRestart.stoppedPids && results.anvilRestart.stoppedPids.length > 0 && (
                          <div className="mt-1 text-red-700 text-sm">
                            <strong>PIDs detenidos:</strong> {results.anvilRestart.stoppedPids.join(', ')}
                          </div>
                        )}
                        {results.anvilRestart.remainingPids && results.anvilRestart.remainingPids.length > 0 && (
                          <div className="mt-1 text-red-700 text-sm">
                            <strong>PIDs que no se pudieron detener:</strong> {results.anvilRestart.remainingPids.join(', ')}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cast Call */}
          <div className="card">
            <h2 className="text-xl font-semibold text-surface-800 mb-2">Cast Call</h2>
            <p className="text-sm text-surface-600 mb-4">Ejecuta una llamada de solo lectura a una función de un smart contract sin modificar el estado de la blockchain.</p>
            <div className="space-y-3">
              <div>
                <label className="label">Dirección del Contrato</label>
                <input
                  type="text"
                  id="callAddress"
                  placeholder="0x..."
                  className="input-field font-mono text-sm"
                />
              </div>
              <div>
                <label className="label">Firma de Función</label>
                <input
                  type="text"
                  id="callFunction"
                  placeholder="admin()"
                  className="input-field font-mono text-sm"
                />
              </div>
              <div>
                <label className="label">RPC URL</label>
                <input
                  type="text"
                  id="callRpc"
                  defaultValue="http://127.0.0.1:8545"
                  className="input-field font-mono text-sm"
                />
              </div>
              <button
                onClick={() => {
                  const address = (document.getElementById('callAddress') as HTMLInputElement)?.value
                  const func = (document.getElementById('callFunction') as HTMLInputElement)?.value
                  const rpc = (document.getElementById('callRpc') as HTMLInputElement)?.value || 'http://127.0.0.1:8545'
                  if (address && func) {
                    handleCastCall(address, func, rpc)
                  }
                }}
                disabled={loading.castCall}
                className="btn-primary w-full"
              >
                {loading.castCall ? 'Ejecutando...' : 'Ejecutar Call'}
              </button>
              {results.castCall && (
                <div className={`p-4 rounded-lg mt-4 ${results.castCall.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="text-sm">
                    {results.castCall.success ? (
                      <>
                        <div><strong>Resultado:</strong></div>
                        <div className="font-mono text-xs bg-white p-2 rounded mt-1">{results.castCall.result}</div>
                      </>
                    ) : (
                      <div className="text-red-600">{results.castCall.error}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cast Send */}
          <div className="card">
            <h2 className="text-xl font-semibold text-surface-800 mb-2">Cast Send</h2>
            <p className="text-sm text-surface-600 mb-4">Envía una transacción a un smart contract que modifica el estado. Requiere una clave privada para firmar la transacción.</p>
            <div className="space-y-3">
              <div>
                <label className="label">Dirección del Contrato</label>
                <input
                  type="text"
                  id="sendAddress"
                  placeholder="0x..."
                  className="input-field font-mono text-sm"
                />
              </div>
              <div>
                <label className="label">Clave Privada</label>
                <input
                  type="password"
                  id="sendPrivateKey"
                  placeholder="0x..."
                  className="input-field font-mono text-sm"
                />
              </div>
              <div>
                <label className="label">Firma de Función (opcional)</label>
                <input
                  type="text"
                  id="sendFunction"
                  placeholder="transfer(address,uint256)"
                  className="input-field font-mono text-sm"
                />
              </div>
              <div>
                <label className="label">Valor (opcional)</label>
                <input
                  type="text"
                  id="sendValue"
                  placeholder="1ether"
                  className="input-field font-mono text-sm"
                />
              </div>
              <div>
                <label className="label">RPC URL</label>
                <input
                  type="text"
                  id="sendRpc"
                  defaultValue="http://127.0.0.1:8545"
                  className="input-field font-mono text-sm"
                />
              </div>
              <button
                onClick={() => {
                  const address = (document.getElementById('sendAddress') as HTMLInputElement)?.value
                  const privateKey = (document.getElementById('sendPrivateKey') as HTMLInputElement)?.value
                  const func = (document.getElementById('sendFunction') as HTMLInputElement)?.value || undefined
                  const value = (document.getElementById('sendValue') as HTMLInputElement)?.value || undefined
                  const rpc = (document.getElementById('sendRpc') as HTMLInputElement)?.value || 'http://127.0.0.1:8545'
                  if (address && privateKey) {
                    handleCastSend(address, privateKey, func, value, rpc)
                  }
                }}
                disabled={loading.castSend}
                className="btn-primary w-full"
              >
                {loading.castSend ? 'Enviando...' : 'Enviar Transacción'}
              </button>
              {results.castSend && (
                <div className={`p-4 rounded-lg mt-4 ${results.castSend.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="text-sm">
                    {results.castSend.success ? (
                      <>
                        {results.castSend.transactionHash && (
                          <div>
                            <strong>Hash de Transacción:</strong>
                            <div className="font-mono text-xs bg-white p-2 rounded mt-1">{results.castSend.transactionHash}</div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-red-600">{results.castSend.error}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



