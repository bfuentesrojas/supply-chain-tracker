'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWeb3 } from '@/contexts/Web3Context'
import { useSupplyChain } from '@/hooks/useSupplyChain'
import { 
  TokenType, 
  ComplianceLogType,
  TOKEN_TYPE_OPTIONS
} from '@/types/pharma'
import { Token } from '@/contracts/SupplyChain'
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
  const { createToken, getUserTokens, getToken, isLoading, error, clearError } = useSupplyChain()

  const [step, setStep] = useState<WizardStep>('select-type')
  const [selectedType, setSelectedType] = useState<TokenType | null>(null)
  const [featuresJson, setFeaturesJson] = useState<string>('')
  const [tokenName, setTokenName] = useState('')
  const [totalSupply, setTotalSupply] = useState(1)
  const [parentId, setParentId] = useState(0)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [success, setSuccess] = useState(false)

  // Tokens disponibles para referencias
  const [userTokens, setUserTokens] = useState<Token[]>([])
  const [loadingTokens, setLoadingTokens] = useState(false)

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

  // Filtrar tokens por tipo (basado en features)
  const filterTokensByType = (type: string): Token[] => {
    return userTokens.filter(t => {
      try {
        const features = JSON.parse(t.features)
        return features.type === type
      } catch {
        return false
      }
    })
  }

  const handleSelectType = (type: TokenType) => {
    setSelectedType(type)
    setStep('fill-form')
    clearError()
    setValidationErrors([])
    
    // Establecer supply por defecto según tipo
    const option = TOKEN_TYPE_OPTIONS.find(o => o.value === type)
    setTotalSupply(option?.supplyDefault || 1)
  }

  const handleFormSubmit = (data: unknown, type: TokenType, logType?: ComplianceLogType) => {
    let result: { success: boolean; json?: string; errors: string[] }

    switch (type) {
      case TokenType.API_MP:
        result = buildApiMpFeatures(data as ApiMpBuilderInput)
        if (result.success) setTokenName(`API: ${(data as ApiMpBuilderInput).substanceName}`)
        break
      case TokenType.BOM:
        result = buildBomFeatures(data as BomBuilderInput)
        if (result.success) setTokenName(`BOM: ${(data as BomBuilderInput).productName}`)
        break
      case TokenType.PT_LOTE:
        result = buildPtLoteFeatures(data as PtLoteBuilderInput)
        if (result.success) {
          setTokenName(`PT: ${(data as PtLoteBuilderInput).productName} - ${(data as PtLoteBuilderInput).batchNumber}`)
          // Si tiene BOM asociado, usar como parentId
          const ptData = data as PtLoteBuilderInput
          if (ptData.bomTokenId) setParentId(ptData.bomTokenId)
        }
        break
      case TokenType.SSCC:
        result = buildSsccFeatures(data as SsccBuilderInput)
        if (result.success) setTokenName(`SSCC: ${(data as SsccBuilderInput).sscc}`)
        break
      case TokenType.COMPLIANCE_LOG:
        if (logType === ComplianceLogType.TEMP_LOG) {
          result = buildTempLogFeatures(data as TempLogBuilderInput)
          if (result.success) {
            setTokenName(`TempLog: SSCC#${(data as TempLogBuilderInput).ssccTokenId}`)
            setParentId((data as TempLogBuilderInput).ssccTokenId)
          }
        } else if (logType === ComplianceLogType.CAPA) {
          result = buildCapaFeatures(data as CapaBuilderInput)
          if (result.success) {
            setTokenName(`CAPA: ${(data as CapaBuilderInput).capaId}`)
            setParentId((data as CapaBuilderInput).ssccTokenId)
          }
        } else if (logType === ComplianceLogType.RECALL) {
          result = buildRecallFeatures(data as RecallBuilderInput)
          if (result.success) {
            setTokenName(`Recall: ${(data as RecallBuilderInput).recallId}`)
            setParentId((data as RecallBuilderInput).ptLoteTokenId)
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
      setStep('review')
    } else {
      setValidationErrors(result.errors)
    }
  }

  const handleCreateToken = async () => {
    clearError()
    const success = await createToken(
      tokenName,
      BigInt(totalSupply),
      featuresJson,
      BigInt(parentId)
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
    setParentId(0)
    setValidationErrors([])
    setSuccess(false)
    clearError()
  }

  const renderForm = () => {
    switch (selectedType) {
      case TokenType.API_MP:
        return (
          <ApiMpForm 
            onSubmit={(data) => handleFormSubmit(data, TokenType.API_MP)}
            isLoading={isLoading}
          />
        )
      case TokenType.BOM:
        return (
          <BomForm 
            onSubmit={(data) => handleFormSubmit(data, TokenType.BOM)}
            isLoading={isLoading}
            availableTokens={filterTokensByType(TokenType.API_MP)}
          />
        )
      case TokenType.PT_LOTE:
        return (
          <PtLoteForm 
            onSubmit={(data) => handleFormSubmit(data, TokenType.PT_LOTE)}
            isLoading={isLoading}
            availableBoms={filterTokensByType(TokenType.BOM)}
          />
        )
      case TokenType.SSCC:
        return (
          <SsccForm 
            onSubmit={(data) => handleFormSubmit(data, TokenType.SSCC)}
            isLoading={isLoading}
            availablePtLotes={filterTokensByType(TokenType.PT_LOTE)}
          />
        )
      case TokenType.COMPLIANCE_LOG:
        return (
          <ComplianceLogForm 
            onSubmit={(data, logType) => handleFormSubmit(data, TokenType.COMPLIANCE_LOG, logType)}
            isLoading={isLoading}
            availableSsccs={filterTokensByType(TokenType.SSCC)}
            availablePtLotes={filterTokensByType(TokenType.PT_LOTE)}
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

          {loadingTokens ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            renderForm()
          )}
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
                />
              </div>
              <div className="p-4 bg-surface-50 rounded-xl">
                <p className="text-sm text-surface-500">Parent ID</p>
                <input
                  type="number"
                  value={parentId}
                  onChange={(e) => setParentId(Number(e.target.value))}
                  className="input-field mt-1"
                  min="0"
                />
                <p className="text-xs text-surface-400 mt-1">0 = sin padre</p>
              </div>
            </div>

            <div className="p-4 bg-surface-50 rounded-xl">
              <p className="text-sm text-surface-500 mb-2">Features JSON</p>
              <div className="bg-surface-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
                  {JSON.stringify(JSON.parse(featuresJson), null, 2)}
                </pre>
              </div>
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
              disabled={isLoading}
              className="btn-primary flex-1"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Creando...
                </>
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
              <li><strong>Parent ID:</strong> {parentId || 'Ninguno'}</li>
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
