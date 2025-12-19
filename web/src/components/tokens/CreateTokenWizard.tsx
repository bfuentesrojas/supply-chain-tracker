'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWeb3 } from '@/contexts/Web3Context'
import { useSupplyChain } from '@/hooks/useSupplyChain'
import { 
  TokenType as PharmaTokenType, 
  ComplianceLogType,
  TOKEN_TYPE_OPTIONS
} from '@/types/pharma'
import { Token, TokenType as ContractTokenType, tokenTypeStringToNumber } from '@/contracts/SupplyChain'
import {
  buildApiMpFeatures,
  buildBomFeatures,
  buildPtLoteFeatures,
  buildSsccFeatures,
  buildTempLogFeatures,
  buildCapaFeatures,
  buildRecallFeatures,
  ApiMpBuilderInput,
  BomBuilderInput,
  PtLoteBuilderInput,
  SsccBuilderInput,
  TempLogBuilderInput,
  CapaBuilderInput,
  RecallBuilderInput
} from '@/builders/pharma'
import { ApiMpForm } from './forms/ApiMpForm'
import { BomForm } from './forms/BomForm'
import { PtLoteForm } from './forms/PtLoteForm'
import { SsccForm } from './forms/SsccForm'
import { ComplianceLogForm } from './forms/ComplianceLogForm'

type WizardStep = 'select-type' | 'fill-form' | 'review' | 'confirm'

interface CreateTokenWizardProps {
  onSuccess?: (tokenId: bigint) => void
  onCancel?: () => void
}

export function CreateTokenWizard({ onSuccess, onCancel }: CreateTokenWizardProps) {
  const { account } = useWeb3()
  const { createToken, getUserTokens, getToken, getTokenBalance, isLoading, error, clearError } = useSupplyChain()

  const [step, setStep] = useState<WizardStep>('select-type')
  const [selectedType, setSelectedType] = useState<PharmaTokenType | null>(null)
  const [featuresJson, setFeaturesJson] = useState<string>('')
  const [tokenName, setTokenName] = useState('')
  const [totalSupply, setTotalSupply] = useState(1)
  const [parentIds, setParentIds] = useState<{ tokenId: bigint; amount: bigint; balance?: bigint }[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [success, setSuccess] = useState(false)
  const [isRecall, setIsRecall] = useState(false)
  const [showRecallWarning, setShowRecallWarning] = useState(false)

  // Tokens disponibles para referencias
  const [userTokens, setUserTokens] = useState<Token[]>([])
  const [loadingTokens, setLoadingTokens] = useState(false)
  const [loadingBalances, setLoadingBalances] = useState(false)

  // Cargar tokens del usuario para referencias
  const loadUserTokens = useCallback(async () => {
    if (!account) return
    setLoadingTokens(true)
    try {
      const tokenIds = await getUserTokens()
      const tokens: Token[] = []
      for (const id of tokenIds) {
        const token = await getToken(id)
        if (token) tokens.push(token)
      }
      setUserTokens(tokens)
    } catch (err) {
      console.error('Error cargando tokens:', err)
    } finally {
      setLoadingTokens(false)
    }
  }, [account, getUserTokens, getToken])

  useEffect(() => {
    loadUserTokens()
  }, [loadUserTokens])

  // Filtrar tokens por tipo (basado en tokenType del contrato)
  const filterTokensByType = (type: PharmaTokenType): Token[] => {
    const contractType = tokenTypeStringToNumber(type)
    return userTokens.filter(t => t.tokenType === contractType)
  }

  // Obtener tokens padres disponibles según el tipo de token
  const getAvailableParentTokens = (): Token[] => {
    if (!selectedType) return []
    
    let available: Token[] = []
    
    switch (selectedType) {
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
    if (!selectedType) return false
    
    switch (selectedType) {
      case PharmaTokenType.API_MP:
        return false // Materia prima no tiene padres
      case PharmaTokenType.BOM:
        return true // Receta puede tener múltiples padres
      case PharmaTokenType.PT_LOTE:
        return parentIds.length === 0 // Lote solo un padre
      case PharmaTokenType.SSCC:
        return parentIds.length === 0 // Unidad lógica solo un padre
      case PharmaTokenType.COMPLIANCE_LOG:
        return parentIds.length === 0 // Compliance log solo un padre
      default:
        return false
    }
  }

  // Verificar si se pueden agregar múltiples padres
  const canAddMultipleParents = (): boolean => {
    return selectedType === PharmaTokenType.BOM
  }

  // Verificar si la cantidad total es editable
  const isTotalSupplyEditable = (): boolean => {
    if (!selectedType) return true
    return selectedType !== PharmaTokenType.BOM && selectedType !== PharmaTokenType.COMPLIANCE_LOG
  }

  // Verificar si el monto del padre es editable
  const isParentAmountEditable = (index: number): boolean => {
    if (!selectedType) return true
    
    switch (selectedType) {
      case PharmaTokenType.PT_LOTE:
        return false // Lote: monto siempre 1
      case PharmaTokenType.COMPLIANCE_LOG:
        return false // Compliance log: monto = balance
      case PharmaTokenType.SSCC:
        return true // Unidad lógica: monto editable pero <= balance
      default:
        return true
    }
  }

  // Cargar balance de un token padre
  const loadParentBalance = useCallback(async (tokenId: bigint, index: number) => {
    if (!account || !tokenId || tokenId === BigInt(0)) return
    
    setLoadingBalances(true)
    try {
      const balance = await getTokenBalance(tokenId, account)
      setParentIds(prev => {
        const updated = [...prev]
        updated[index] = { ...updated[index], balance }
        
        // Si es COMPLIANCE_LOG, establecer el monto automáticamente al balance
        if (selectedType === PharmaTokenType.COMPLIANCE_LOG) {
          updated[index].amount = balance
        } else if (selectedType === PharmaTokenType.PT_LOTE) {
          updated[index].amount = BigInt(1)
        }
        
        return updated
      })
    } catch (err) {
      console.error('Error cargando balance:', err)
    } finally {
      setLoadingBalances(false)
    }
  }, [account, getTokenBalance, selectedType])

  // Agregar un padre a la lista
  const addParent = () => {
    if (!canAddParents()) return
    
    const newParent = { tokenId: BigInt(0), amount: BigInt(0) }
    
    // Si es PT_LOTE, establecer monto en 1
    if (selectedType === PharmaTokenType.PT_LOTE) {
      newParent.amount = BigInt(1)
    }
    
    setParentIds([...parentIds, newParent])
  }

  // Remover un padre de la lista
  const removeParent = (index: number) => {
    setParentIds(parentIds.filter((_, i) => i !== index))
  }

  // Actualizar un padre en la lista
  const updateParent = async (index: number, field: 'tokenId' | 'amount', value: bigint) => {
    // Si se cambió el tokenId, cargar balance primero
    if (field === 'tokenId' && value > BigInt(0)) {
      await loadParentBalance(value, index)
    } else {
      // Actualizar directamente
      setParentIds(prev => {
        const updated = [...prev]
        updated[index] = { ...updated[index], [field]: value }
        
        // Si es PT_LOTE, forzar monto a 1
        if (selectedType === PharmaTokenType.PT_LOTE && field === 'tokenId') {
          updated[index].amount = BigInt(1)
        }
        
        return updated
      })
    }
  }

  const handleSelectType = (type: PharmaTokenType) => {
    setSelectedType(type)
    setStep('fill-form')
    clearError()
    setValidationErrors([])
    setParentIds([]) // Resetear padres al cambiar tipo
    setFeaturesJson('') // Limpiar features JSON
    setTokenName('') // Limpiar nombre del token
    setIsRecall(false) // Resetear recall
    setShowRecallWarning(false) // Resetear warning
    
    // Establecer supply por defecto según tipo
    // BOM y COMPLIANCE_LOG siempre tienen supply = 1
    if (type === PharmaTokenType.BOM || type === PharmaTokenType.COMPLIANCE_LOG) {
      setTotalSupply(1)
    } else {
      const option = TOKEN_TYPE_OPTIONS.find(o => o.value === type)
      setTotalSupply(option?.supplyDefault || 1)
    }
  }

  const handleFormSubmit = (data: unknown, type: PharmaTokenType, logType?: ComplianceLogType, recallFlag?: boolean) => {
    let result: { success: boolean; json?: string; errors: string[] }

    switch (type) {
      case PharmaTokenType.API_MP:
        result = buildApiMpFeatures(data as ApiMpBuilderInput)
        if (result.success) setTokenName(`API: ${(data as ApiMpBuilderInput).substanceName}`)
        break
      case PharmaTokenType.BOM:
        result = buildBomFeatures(data as BomBuilderInput)
        if (result.success) setTokenName(`BOM: ${(data as BomBuilderInput).productName}`)
        // No sobrescribir padres, ya se configuraron en el formulario principal
        break
      case PharmaTokenType.PT_LOTE:
        result = buildPtLoteFeatures(data as PtLoteBuilderInput)
        if (result.success) {
          setTokenName(`PT: ${(data as PtLoteBuilderInput).productName} - ${(data as PtLoteBuilderInput).batchNumber}`)
          // Si no hay padre configurado y tiene BOM asociado, agregar como padre con cantidad 1
          const ptData = data as PtLoteBuilderInput
          if (parentIds.length === 0 && ptData.bomTokenId) {
            setParentIds([{ tokenId: BigInt(ptData.bomTokenId), amount: BigInt(1) }])
          }
        }
        break
      case PharmaTokenType.SSCC:
        result = buildSsccFeatures(data as SsccBuilderInput)
        if (result.success) setTokenName(`SSCC: ${(data as SsccBuilderInput).sscc}`)
        break
      case PharmaTokenType.COMPLIANCE_LOG:
        if (logType === ComplianceLogType.TEMP_LOG) {
          result = buildTempLogFeatures(data as TempLogBuilderInput)
          if (result.success) {
            setTokenName(`TempLog: SSCC#${(data as TempLogBuilderInput).ssccTokenId}`)
            // Si no hay padre configurado, usar el del formulario
            if (parentIds.length === 0) {
              const tempData = data as TempLogBuilderInput
              setParentIds([{ tokenId: BigInt(tempData.ssccTokenId), amount: BigInt(1) }])
            }
          }
        } else if (logType === ComplianceLogType.CAPA) {
          result = buildCapaFeatures(data as CapaBuilderInput)
          if (result.success) {
            setTokenName(`CAPA: ${(data as CapaBuilderInput).capaId}`)
            // Si no hay padre configurado, usar el del formulario
            if (parentIds.length === 0) {
              const capaData = data as CapaBuilderInput
              setParentIds([{ tokenId: BigInt(capaData.ssccTokenId), amount: BigInt(1) }])
            }
          }
        } else if (logType === ComplianceLogType.RECALL) {
          result = buildRecallFeatures(data as RecallBuilderInput)
          if (result.success) {
            setTokenName(`Recall: ${(data as RecallBuilderInput).recallId}`)
            // Si no hay padre configurado, usar el del formulario
            if (parentIds.length === 0) {
              const recallData = data as RecallBuilderInput
              setParentIds([{ tokenId: BigInt(recallData.ptLoteTokenId), amount: BigInt(1) }])
            }
            // Guardar el flag de recall
            setIsRecall(recallFlag || false)
          }
        } else {
          result = { success: false, errors: ['Tipo de log no soportado'] }
        }
        break
      default:
        result = { success: false, errors: ['Tipo de token no soportado'] }
    }

    if (result.success && result.json) {
      setFeaturesJson(result.json)
      setValidationErrors([])
      // Si es recall, mostrar warning antes de continuar
      if (recallFlag && logType === ComplianceLogType.RECALL) {
        setShowRecallWarning(true)
      } else {
        setStep('review')
      }
    } else {
      setValidationErrors(result.errors)
    }
  }

  const handleConfirmRecall = () => {
    setShowRecallWarning(false)
    setStep('review')
  }

  const handleCancelRecall = () => {
    setShowRecallWarning(false)
    setIsRecall(false)
  }

  const handleCreateToken = async () => {
    clearError()
    
    // Validar que el JSON de features esté presente y sea válido
    if (!featuresJson || featuresJson.trim() === '') {
      setValidationErrors(['El JSON de features es obligatorio. Por favor, completa el formulario para generar el JSON.'])
      return
    }
    
    // Validar que sea un JSON válido
    try {
      JSON.parse(featuresJson)
    } catch (err) {
      setValidationErrors(['El JSON de features no es válido. Por favor, revisa el formato.'])
      return
    }
    
    // Validar que tenga los campos mínimos requeridos
    const parsed = JSON.parse(featuresJson)
    if (!parsed.labels || !parsed.labels.display_name) {
      setValidationErrors(['El JSON de features debe incluir: labels.display_name'])
      return
    }

    if (!selectedType) {
      setValidationErrors(['Debes seleccionar un tipo de token'])
      return
    }
    
    // Convertir parentIds y parentAmounts a arrays (filtrar los que tienen tokenId = 0)
    const validParents = parentIds.filter(p => p.tokenId > BigInt(0))
    const parentIdsArray = validParents.map(p => p.tokenId)
    const parentAmountsArray = validParents.map(p => p.amount)

    // Asegurar que sean arrays (no undefined/null)
    const safeParentIds = Array.isArray(parentIdsArray) ? parentIdsArray : []
    const safeParentAmounts = Array.isArray(parentAmountsArray) ? parentAmountsArray : []

    const contractTokenType = tokenTypeStringToNumber(selectedType)
    
    console.log('[DEBUG] CreateTokenWizard - createToken:', {
      tokenName,
      totalSupply,
      tokenType: contractTokenType,
      parentIdsLength: safeParentIds.length,
      parentAmountsLength: safeParentAmounts.length
    })
    
    const success = await createToken(
      tokenName,
      BigInt(totalSupply),
      featuresJson,
      contractTokenType,
      safeParentIds,
      safeParentAmounts,
      isRecall
    )

    if (success) {
      setSuccess(true)
      setStep('confirm')
      // Recargar tokens
      await loadUserTokens()
      onSuccess?.(BigInt(userTokens.length + 1))
    }
  }

  const handleReset = () => {
    setStep('select-type')
    setSelectedType(null)
    setFeaturesJson('')
    setTokenName('')
    setTotalSupply(1)
    setParentIds([])
    setValidationErrors([])
    setSuccess(false)
    setIsRecall(false)
    setShowRecallWarning(false)
    clearError()
  }

  const renderForm = () => {
    switch (selectedType) {
      case PharmaTokenType.API_MP:
        return (
          <ApiMpForm 
            onSubmit={(data) => handleFormSubmit(data, PharmaTokenType.API_MP)}
            isLoading={isLoading}
          />
        )
      case PharmaTokenType.BOM:
        return (
          <BomForm 
            onSubmit={(data) => handleFormSubmit(data, PharmaTokenType.BOM)}
            isLoading={isLoading}
            availableTokens={filterTokensByType(PharmaTokenType.API_MP).filter(t => !t.recall)}
          />
        )
      case PharmaTokenType.PT_LOTE:
        return (
          <PtLoteForm 
            onSubmit={(data) => handleFormSubmit(data, PharmaTokenType.PT_LOTE)}
            isLoading={isLoading}
            availableBoms={filterTokensByType(PharmaTokenType.BOM).filter(t => !t.recall)}
          />
        )
      case PharmaTokenType.SSCC:
        return (
          <SsccForm 
            onSubmit={(data) => handleFormSubmit(data, PharmaTokenType.SSCC)}
            isLoading={isLoading}
            availablePtLotes={filterTokensByType(PharmaTokenType.PT_LOTE).filter(t => !t.recall)}
          />
        )
      case PharmaTokenType.COMPLIANCE_LOG:
        return (
          <ComplianceLogForm 
            onSubmit={(data, logType, recallFlag) => handleFormSubmit(data, PharmaTokenType.COMPLIANCE_LOG, logType, recallFlag)}
            isLoading={isLoading}
            availableSsccs={filterTokensByType(PharmaTokenType.SSCC).filter(t => !t.recall)}
            availablePtLotes={filterTokensByType(PharmaTokenType.PT_LOTE).filter(t => !t.recall)}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {['select-type', 'fill-form', 'review', 'confirm'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step === s 
                  ? 'bg-primary-600 text-white' 
                  : ['select-type', 'fill-form', 'review', 'confirm'].indexOf(step) > i
                    ? 'bg-green-500 text-white'
                    : 'bg-surface-200 text-surface-600'
              }`}>
                {['select-type', 'fill-form', 'review', 'confirm'].indexOf(step) > i ? '✓' : i + 1}
              </div>
              {i < 3 && (
                <div className={`w-16 md:w-24 h-1 mx-2 ${
                  ['select-type', 'fill-form', 'review', 'confirm'].indexOf(step) > i 
                    ? 'bg-green-500' 
                    : 'bg-surface-200'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-surface-500">
          <span>Tipo</span>
          <span>Datos</span>
          <span>Revisar</span>
          <span>Confirmar</span>
        </div>
      </div>

      {/* Step 1: Select Type */}
      {step === 'select-type' && (
        <div className="card">
          <h2 className="text-2xl font-bold text-surface-800 mb-6">Selecciona el Tipo de Token</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TOKEN_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelectType(option.value)}
                className="p-6 rounded-xl border-2 border-surface-200 hover:border-primary-500 hover:bg-primary-50 transition-all text-left group"
              >
                <div className="text-4xl mb-3">{option.icon}</div>
                <h3 className="font-semibold text-surface-800 group-hover:text-primary-700">
                  {option.label}
                </h3>
                <p className="text-sm text-surface-500 mt-1">
                  {option.description}
                </p>
              </button>
            ))}
          </div>
          {onCancel && (
            <button onClick={onCancel} className="btn-secondary mt-6">
              Cancelar
            </button>
          )}
        </div>
      )}

      {/* Step 2: Fill Form */}
      {step === 'fill-form' && selectedType && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-surface-800">
                {TOKEN_TYPE_OPTIONS.find(o => o.value === selectedType)?.icon}{' '}
                {TOKEN_TYPE_OPTIONS.find(o => o.value === selectedType)?.label}
              </h2>
              <p className="text-surface-500 text-sm mt-1">
                Completa los datos del token
              </p>
            </div>
            <button
              onClick={() => setStep('select-type')}
              className="text-surface-500 hover:text-surface-700"
            >
              ← Cambiar tipo
            </button>
          </div>

          {validationErrors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="font-semibold text-red-800 mb-2">Errores de validación:</p>
              <ul className="list-disc list-inside text-sm text-red-700">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Selector de tipo de token (siempre visible primero) */}
          <div className="mb-6 p-4 bg-surface-50 rounded-xl">
            <label className="label mb-2">Tipo de Token *</label>
            <select
              value={selectedType || ''}
              onChange={(e) => {
                if (e.target.value) {
                  handleSelectType(e.target.value as PharmaTokenType)
                }
              }}
              className="select-field"
              required
            >
              <option value="">Seleccione Tipo de Token</option>
              {TOKEN_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
          </div>

          {!selectedType ? (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <p className="text-yellow-800 text-sm">
                ⚠️ Por favor, seleccione un tipo de token para continuar con el formulario.
              </p>
            </div>
          ) : (
            <>
              {/* Cantidad Total */}
              <div className="mb-6 p-4 bg-surface-50 rounded-xl">
                <label className="label mb-2">Cantidad Total *</label>
                <input
                  type="number"
                  value={totalSupply}
                  onChange={(e) => setTotalSupply(Number(e.target.value))}
                  className="input-field"
                  min="1"
                  disabled={!isTotalSupplyEditable()}
                  readOnly={!isTotalSupplyEditable()}
                />
                {!isTotalSupplyEditable() && (
                  <p className="text-xs text-surface-500 mt-1">
                    La cantidad total para este tipo de token es fija: 1
                  </p>
                )}
              </div>

              {/* Padres */}
              {selectedType !== PharmaTokenType.API_MP && (
            <div className="mb-6 p-4 bg-surface-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Token{canAddMultipleParents() ? 's' : ''} Padre{canAddMultipleParents() ? 's' : ''}</label>
                {canAddParents() && (
                  <button
                    type="button"
                    onClick={addParent}
                    className="text-xs text-primary-600 hover:text-primary-800 font-semibold"
                    disabled={!canAddParents()}
                  >
                    + Agregar Padre
                  </button>
                )}
              </div>
              {parentIds.length === 0 ? (
                <p className="text-xs text-surface-400">
                  {selectedType === PharmaTokenType.API_MP 
                    ? 'Las materias primas no requieren tokens padre'
                    : 'Sin padres (opcional)'}
                </p>
              ) : (
                <div className="space-y-2">
                  {parentIds.map((parent, index) => {
                    const availableParents = getAvailableParentTokens()
                    return (
                      <div key={index} className="flex gap-2 items-end">
                        <div className="flex-1">
                          <label className="text-xs text-surface-400">Token Padre</label>
                          <select
                            value={parent.tokenId.toString()}
                            onChange={(e) => updateParent(index, 'tokenId', BigInt(e.target.value))}
                            className="input-field mt-1 text-sm"
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
                            {parent.balance !== undefined && (
                              <span className="text-surface-400"> (max: {parent.balance.toString()})</span>
                            )}
                          </label>
                          <input
                            type="number"
                            value={parent.amount.toString()}
                            onChange={(e) => {
                              const value = BigInt(e.target.value || '0')
                              const maxValue = parent.balance || BigInt(Number.MAX_SAFE_INTEGER)
                              if (value <= maxValue) {
                                updateParent(index, 'amount', value)
                              }
                            }}
                            className="input-field mt-1 text-sm"
                            min="1"
                            max={parent.balance?.toString() || undefined}
                            disabled={!isParentAmountEditable(index)}
                            readOnly={!isParentAmountEditable(index)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeParent(index)}
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

              {loadingTokens ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : (
                renderForm()
              )}
            </>
          )}
        </div>
      )}

      {/* Popup de Warning para Recall */}
      {showRecallWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-surface-800">⚠️ Advertencia: Registro de Recall</h3>
            </div>
            
            <div className="mb-6 space-y-3 text-surface-700">
              <p className="font-semibold">¿Está seguro de que desea crear un registro de Recall?</p>
              <p className="text-sm">
                Esta acción marcará como <span className="font-semibold text-red-600">retirado (recall=true)</span> toda la cadena de suministro relacionada al token padre, incluyendo:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                <li>Todos los tokens padres (hacia arriba en la cadena)</li>
                <li>Todos los tokens hijos (hacia abajo en la cadena)</li>
                <li>Desde la materia prima hasta la unidad lógica relacionada</li>
              </ul>
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-semibold text-red-800">
                  ⚠️ Los tokens marcados como recall NO podrán:
                </p>
                <ul className="list-disc list-inside text-sm text-red-700 mt-1 ml-2">
                  <li>Ser seleccionados como padre de otros tokens</li>
                  <li>Ser transferidos</li>
                </ul>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleCancelRecall}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRecall}
                className="btn-primary flex-1 bg-red-600 hover:bg-red-700"
              >
                Sí, Confirmar Recall
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 'review' && (
        <div className="card">
          <h2 className="text-2xl font-bold text-surface-800 mb-6">📋 Revisar y Confirmar</h2>
          
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-surface-50 rounded-xl">
                <p className="text-sm text-surface-500">Nombre del Token</p>
                <input
                  type="text"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  className="input-field mt-1"
                />
              </div>
              <div className="p-4 bg-surface-50 rounded-xl">
                <p className="text-sm text-surface-500">Supply Total</p>
                <input
                  type="number"
                  value={totalSupply}
                  onChange={(e) => setTotalSupply(Number(e.target.value))}
                  className="input-field mt-1"
                  min="1"
                  disabled={!isTotalSupplyEditable()}
                  readOnly={!isTotalSupplyEditable()}
                />
                {!isTotalSupplyEditable() && (
                  <p className="text-xs text-surface-400 mt-1">Fijo: 1</p>
                )}
              </div>
              {selectedType !== PharmaTokenType.API_MP && (
                <div className="p-4 bg-surface-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-surface-500">Padres</p>
                    {canAddParents() && (
                      <button
                        type="button"
                        onClick={addParent}
                        className="text-xs text-primary-600 hover:text-primary-800 font-semibold"
                        disabled={!canAddParents()}
                      >
                        + Agregar Padre
                      </button>
                    )}
                  </div>
                  {parentIds.length === 0 ? (
                    <p className="text-xs text-surface-400">Sin padres</p>
                  ) : (
                    <div className="space-y-2">
                      {parentIds.map((parent, index) => {
                        const availableParents = getAvailableParentTokens()
                        return (
                          <div key={index} className="flex gap-2 items-end">
                            <div className="flex-1">
                              <label className="text-xs text-surface-400">Token Padre</label>
                              <select
                                value={parent.tokenId.toString()}
                                onChange={(e) => updateParent(index, 'tokenId', BigInt(e.target.value))}
                                className="input-field mt-1 text-sm"
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
                                {parent.balance !== undefined && (
                                  <span className="text-surface-400"> (max: {parent.balance.toString()})</span>
                                )}
                              </label>
                              <input
                                type="number"
                                value={parent.amount.toString()}
                                onChange={(e) => {
                                  const value = BigInt(e.target.value || '0')
                                  const maxValue = parent.balance || BigInt(Number.MAX_SAFE_INTEGER)
                                  if (value <= maxValue) {
                                    updateParent(index, 'amount', value)
                                  }
                                }}
                                className="input-field mt-1 text-sm"
                                min="1"
                                max={parent.balance?.toString() || undefined}
                                disabled={!isParentAmountEditable(index)}
                                readOnly={!isParentAmountEditable(index)}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeParent(index)}
                              className="text-red-600 hover:text-red-800 text-sm font-semibold px-2 py-1"
                            >
                              ×
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 bg-surface-50 rounded-xl">
              <p className="text-sm text-surface-500 mb-2">Features JSON</p>
              {!featuresJson || featuresJson.trim() === '' ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-semibold">⚠️ JSON de features faltante</p>
                  <p className="text-red-600 text-sm mt-1">
                    Debes completar el formulario para generar el JSON de features antes de crear el token.
                  </p>
                </div>
              ) : (
                <div className="bg-surface-800 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(featuresJson), null, 2)
                      } catch (err) {
                        return `Error al parsear JSON: ${err instanceof Error ? err.message : String(err)}`
                      }
                    })()}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800">
              {typeof error === 'string' ? error : JSON.stringify(error)}
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => setStep('fill-form')}
              className="btn-secondary flex-1"
            >
              ← Volver a editar
            </button>
            <button
              onClick={handleCreateToken}
              disabled={isLoading || !featuresJson || featuresJson.trim() === ''}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Creando...
                </>
              ) : !featuresJson || featuresJson.trim() === '' ? (
                '⚠️ Completa el formulario primero'
              ) : (
                '✓ Crear Token en Blockchain'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirm */}
      {step === 'confirm' && success && (
        <div className="card text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-surface-800 mb-2">¡Token Creado Exitosamente!</h2>
          <p className="text-surface-600 mb-6">
            El token <strong>{tokenName}</strong> ha sido registrado en la blockchain.
          </p>
          
          <div className="p-4 bg-surface-50 rounded-xl mb-6 text-left">
            <p className="text-sm text-surface-500">Resumen:</p>
            <ul className="mt-2 space-y-1 text-sm">
              <li><strong>Tipo:</strong> {String(selectedType)}</li>
              <li><strong>Supply:</strong> {totalSupply}</li>
              <li><strong>Padres:</strong> {parentIds.length > 0 
                ? parentIds.map((p, i) => `#${p.tokenId} (${p.amount})`).join(', ')
                : 'Ninguno'}</li>
            </ul>
          </div>

          <div className="flex gap-4">
            <button onClick={handleReset} className="btn-primary flex-1">
              + Crear Otro Token
            </button>
            {onCancel && (
              <button onClick={onCancel} className="btn-secondary flex-1">
                Cerrar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}




