'use client'

import { useState } from 'react'

// URL base de la API MCP (puerto 3001)
const MCP_API_BASE = 'http://localhost:3001'

// Cuentas utilizadas en el dapp de track
const DAPP_ACCOUNTS = [
  { value: '0xeD252BAc2D88971cb5B393B0760f05AF27413b91', label: 'Admin (0xeD25...13b91)' },
  { value: '0xBc52603F93d9df628b2dAd74e588fE74FF2f6056', label: 'Cuenta 1 (0xBc52...f6056)' },
  { value: '0x871fD3E66cCC4c21E3AC437D39266e72e6fD32A0', label: 'Cuenta 2 (0x871f...f32A0)' },
  { value: '0x8816F96a8759Ff0410F5A67457DDe003950360a6', label: 'Cuenta 3 (0x8816...360a6)' },
  { value: '0x44ECBB8c87991Bbee768ef0C9e2731753a4B714b', label: 'Cuenta 4 (0x44EC...B714b)' },
  { value: 'other', label: 'Otra cuenta' }
] as const

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
  const [selectedAccount, setSelectedAccount] = useState<string>('')

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

  // Fund Accounts Script
  const handleFundAccountsScript = async (rpcUrl: string = 'http://127.0.0.1:8545', privateKey?: string) => {
    setLoading(prev => ({ ...prev, fundAccounts: true }))
    try {
      const body: any = { rpcUrl }
      if (privateKey) {
        body.privateKey = privateKey
      }
      
      const res = await fetch(`${MCP_API_BASE}/forge/script/fund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      setResults(prev => ({ ...prev, fundAccounts: data }))
      
      // Si hay un error, mostrar sugerencia
      if (!data.success && data.error && data.error.includes('no está corriendo')) {
        // Mostrar mensaje adicional en la UI
        console.warn('Anvil no está corriendo. Por favor inicia Anvil primero.')
      }
    } catch (error: any) {
      setResults(prev => ({ ...prev, fundAccounts: { success: false, error: error.message || 'Error de conexión con el servidor MCP API' } }))
    } finally {
      setLoading(prev => ({ ...prev, fundAccounts: false }))
    }
  }

  // Fund Account (dirección específica)
  const handleFundAccount = async (
    address: string,
    amount: string,
    privateKey: string = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    rpcUrl: string = 'http://127.0.0.1:8545'
  ) => {
    setLoading(prev => ({ ...prev, fundAccount: true }))
    try {
      const res = await fetch(`${MCP_API_BASE}/anvil/fund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, amount, privateKey, rpcUrl })
      })
      const data = await res.json()
      setResults(prev => ({ ...prev, fundAccount: data }))
      
      // Si hay un error, mostrar sugerencia
      if (!data.success && data.error && data.error.includes('no está corriendo')) {
        // Mostrar mensaje adicional en la UI
        console.warn('Anvil no está corriendo. Por favor inicia Anvil primero.')
      }
    } catch (error: any) {
      setResults(prev => ({ ...prev, fundAccount: { success: false, error: error.message || 'Error de conexión con el servidor MCP API' } }))
    } finally {
      setLoading(prev => ({ ...prev, fundAccount: false }))
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

          {/* Fund Accounts Script */}
          <div className="card">
            <h2 className="text-xl font-semibold text-surface-800 mb-2">Fondear Cuentas (Script)</h2>
            <p className="text-sm text-surface-600 mb-4">Ejecuta el script FundAccounts.s.sol para fondear las cuentas predefinidas del proyecto con 10 ETH cada una.</p>
            <div className="space-y-3">
              <div>
                <label className="label">RPC URL</label>
                <input
                  type="text"
                  id="fundScriptRpc"
                  defaultValue="http://127.0.0.1:8545"
                  className="input-field font-mono text-sm"
                />
              </div>
              <div>
                <label className="label">Clave Privada (opcional)</label>
                <input
                  type="password"
                  id="fundScriptPrivateKey"
                  placeholder="Dejar vacío para usar la cuenta 0 de Anvil"
                  className="input-field font-mono text-sm"
                />
                <p className="text-xs text-surface-500 mt-1">Por defecto usa: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80</p>
              </div>
              <button
                onClick={() => {
                  const rpc = (document.getElementById('fundScriptRpc') as HTMLInputElement)?.value || 'http://127.0.0.1:8545'
                  const privateKey = (document.getElementById('fundScriptPrivateKey') as HTMLInputElement)?.value || undefined
                  handleFundAccountsScript(rpc, privateKey)
                }}
                disabled={loading.fundAccounts}
                className="btn-primary w-full"
              >
                {loading.fundAccounts ? 'Fondeando...' : 'Fondear Cuentas Predefinidas'}
              </button>
              {results.fundAccounts && (
                <div className={`p-4 rounded-lg mt-4 ${results.fundAccounts.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="text-sm">
                    {results.fundAccounts.success ? (
                      <>
                        <div className="font-semibold text-green-800 mb-2">✅ Cuentas fondeadas correctamente</div>
                        {results.fundAccounts.transactionHashes && results.fundAccounts.transactionHashes.length > 0 && (
                          <div className="mt-2">
                            <strong>Hashes de transacciones:</strong>
                            <ul className="mt-1 space-y-1">
                              {results.fundAccounts.transactionHashes.map((hash: string, idx: number) => (
                                <li key={idx} className="font-mono text-xs">{hash}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {results.fundAccounts.stdout && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-sm font-medium">Ver output completo</summary>
                            <pre className="text-xs mt-2 overflow-auto max-h-64 bg-white p-2 rounded">{results.fundAccounts.stdout}</pre>
                          </details>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="text-red-600 mb-2">{results.fundAccounts.error}</div>
                        {results.fundAccounts.details && results.fundAccounts.details.suggestion && (
                          <div className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded mt-2">
                            💡 <strong>Sugerencia:</strong> {results.fundAccounts.details.suggestion}
                          </div>
                        )}
                        {results.fundAccounts.error && results.fundAccounts.error.includes('no está corriendo') && (
                          <div className="text-xs text-blue-700 bg-blue-50 p-2 rounded mt-2">
                            💡 Puedes iniciar Anvil usando la sección <strong>"Anvil Restart"</strong> arriba
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fund Account (dirección específica) */}
          <div className="card">
            <h2 className="text-xl font-semibold text-surface-800 mb-2">Fondear Cuenta</h2>
            <p className="text-sm text-surface-600 mb-4">Envía ETH a una cuenta del dapp o a una dirección personalizada usando cast send.</p>
            <div className="space-y-3">
              <div>
                <label className="label">Seleccionar Cuenta</label>
                <select
                  id="fundAccountSelect"
                  value={selectedAccount}
                  onChange={(e) => {
                    setSelectedAccount(e.target.value)
                    // Limpiar el input de dirección personalizada si no es "otra cuenta"
                    if (e.target.value !== 'other') {
                      const customAddressInput = document.getElementById('fundCustomAddress') as HTMLInputElement
                      if (customAddressInput) {
                        customAddressInput.value = ''
                      }
                    }
                  }}
                  className="input-field font-mono text-sm"
                >
                  <option value="">-- Seleccionar cuenta --</option>
                  {DAPP_ACCOUNTS.map((account) => (
                    <option key={account.value} value={account.value}>
                      {account.label}
                    </option>
                  ))}
                </select>
              </div>
              {selectedAccount === 'other' && (
                <div>
                  <label className="label">Dirección Personalizada</label>
                  <input
                    type="text"
                    id="fundCustomAddress"
                    placeholder="0x..."
                    className="input-field font-mono text-sm"
                  />
                  <p className="text-xs text-surface-500 mt-1">Ingresa la dirección de la cuenta a fondear</p>
                </div>
              )}
              <div>
                <label className="label">Cantidad</label>
                <input
                  type="text"
                  id="fundAmount"
                  placeholder="10ether"
                  defaultValue="10ether"
                  className="input-field font-mono text-sm"
                />
                <p className="text-xs text-surface-500 mt-1">Ejemplos: "10ether", "1000gwei", "10000000000000000000wei"</p>
              </div>
              <div>
                <label className="label">Clave Privada (opcional)</label>
                <input
                  type="password"
                  id="fundPrivateKey"
                  placeholder="Dejar vacío para usar cuenta 0 de Anvil"
                  className="input-field font-mono text-sm"
                />
                <p className="text-xs text-surface-500 mt-1">Por defecto: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80</p>
              </div>
              <div>
                <label className="label">RPC URL</label>
                <input
                  type="text"
                  id="fundRpc"
                  defaultValue="http://127.0.0.1:8545"
                  className="input-field font-mono text-sm"
                />
              </div>
              <button
                onClick={() => {
                  let address: string = ''
                  
                  if (selectedAccount === 'other') {
                    // Si es "otra cuenta", tomar la dirección del input personalizado
                    const customAddress = (document.getElementById('fundCustomAddress') as HTMLInputElement)?.value.trim() || ''
                    if (!customAddress) {
                      alert('Por favor, ingresa una dirección personalizada')
                      return
                    }
                    // Validar formato de dirección
                    if (!/^0x[a-fA-F0-9]{40}$/.test(customAddress)) {
                      alert('Dirección inválida. Debe tener formato 0x seguido de 40 caracteres hexadecimales')
                      return
                    }
                    address = customAddress
                  } else if (selectedAccount) {
                    // Si es una cuenta del dapp, usar la seleccionada
                    address = selectedAccount
                  } else {
                    alert('Por favor, selecciona una cuenta')
                    return
                  }
                  
                  const amount = (document.getElementById('fundAmount') as HTMLInputElement)?.value || '10ether'
                  const privateKey = (document.getElementById('fundPrivateKey') as HTMLInputElement)?.value || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
                  const rpc = (document.getElementById('fundRpc') as HTMLInputElement)?.value || 'http://127.0.0.1:8545'
                  
                  handleFundAccount(address, amount, privateKey, rpc)
                }}
                disabled={loading.fundAccount}
                className="btn-primary w-full"
              >
                {loading.fundAccount ? 'Fondeando...' : 'Fondear Cuenta'}
              </button>
              {results.fundAccount && (
                <div className={`p-4 rounded-lg mt-4 ${results.fundAccount.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="text-sm">
                    {results.fundAccount.success ? (
                      <>
                        <div className="font-semibold text-green-800 mb-2">✅ Cuenta fondeada correctamente</div>
                        <div className="mt-1 text-green-700"><strong>Dirección:</strong> {results.fundAccount.address}</div>
                        <div className="mt-1 text-green-700"><strong>Cantidad:</strong> {results.fundAccount.amount}</div>
                        {results.fundAccount.transactionHash && (
                          <div className="mt-1 text-green-700"><strong>Hash de transacción:</strong> <span className="font-mono text-xs">{results.fundAccount.transactionHash}</span></div>
                        )}
                        {results.fundAccount.stdout && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-sm font-medium">Ver output completo</summary>
                            <pre className="text-xs mt-2 overflow-auto max-h-64 bg-white p-2 rounded">{results.fundAccount.stdout}</pre>
                          </details>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="text-red-600 mb-2">{results.fundAccount.error}</div>
                        {results.fundAccount.details && results.fundAccount.details.suggestion && (
                          <div className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded mt-2">
                            💡 <strong>Sugerencia:</strong> {results.fundAccount.details.suggestion}
                          </div>
                        )}
                        {results.fundAccount.error && results.fundAccount.error.includes('no está corriendo') && (
                          <div className="text-xs text-blue-700 bg-blue-50 p-2 rounded mt-2">
                            💡 Puedes iniciar Anvil usando la sección <strong>"Anvil Restart"</strong> arriba
                          </div>
                        )}
                      </>
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





