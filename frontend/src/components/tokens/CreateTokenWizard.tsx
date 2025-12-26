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
  // Usar number | null para amounts para permitir campos vacíos (se convertirán a bigint multiplicando por 1000 al enviar)
  const [parentIds, setParentIds] = useState<{ tokenId: bigint; amount: number | null; balance?: bigint; totalSupply?: bigint }[]>([])
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
        return true // Lote: monto editable
      case PharmaTokenType.COMPLIANCE_LOG:
        return false // Compliance log: monto = balance
      case PharmaTokenType.SSCC:
        return true // Unidad lógica: monto editable pero <= balance
      default:
        return true
    }
  }

  // Verificar si el amount del padre permite decimales
  const allowsDecimalAmounts = (): boolean => {
    if (!selectedType) return true
    
    switch (selectedType) {
      case PharmaTokenType.PT_LOTE:
        return false // Lote: solo enteros
      case PharmaTokenType.SSCC:
        return false // Unidad lógica: solo enteros
      case PharmaTokenType.BOM:
        return true // BOM: permite decimales
      default:
        return true
    }
  }

  // Cargar balance de un token padre
  const loadParentBalance = useCallback(async (tokenId: bigint, index: number) => {
    if (!tokenId || tokenId === BigInt(0)) return
    
    setLoadingBalances(true)
    try {
      // Obtener el token completo para acceder a totalSupply
      const parentToken = await getToken(tokenId)
      if (!parentToken) {
        console.error('Token padre no encontrado')
        return
      }
      
      // SIEMPRE usar totalSupply del token padre, independientemente del dueño
      const totalSupply = parentToken.totalSupply
      
      // Cargar el balance del usuario solo para mostrarlo en la UI (opcional)
      let userBalance = BigInt(0)
      if (account) {
        try {
          userBalance = await getTokenBalance(tokenId, account)
        } catch (err) {
          // Si falla obtener el balance del usuario, continuar con totalSupply
          console.warn('No se pudo obtener balance del usuario:', err)
        }
      }
      
      setParentIds(prev => {
        const updated = [...prev]
        // Asegurar que el tokenId se preserve correctamente
        const currentParent = updated[index]
        if (!currentParent || currentParent.tokenId !== tokenId) {
          // Si el tokenId no coincide, no actualizar (puede haber sido cambiado por el usuario)
          console.warn(`TokenId mismatch: expected ${tokenId}, got ${currentParent?.tokenId}`)
          return prev
        }
        
        // Guardar el balance del usuario y totalSupply para mostrarlos en la UI
        // Para PT_LOTE y SSCC: dejar amount en null (campo vacío) para que el usuario ingrese libremente
        // Para COMPLIANCE_LOG: establecer amount al totalSupply
        updated[index] = { 
          ...currentParent, 
          balance: userBalance,
          totalSupply: totalSupply
        }
        
        if (selectedType === PharmaTokenType.COMPLIANCE_LOG) {
          // Solo para COMPLIANCE_LOG establecer un valor por defecto
          updated[index].amount = Number(totalSupply) / 1000
        } else {
          // Para PT_LOTE, SSCC y otros: dejar en null (campo vacío)
          updated[index].amount = null
        }
        
        return updated
      })
    } catch (err) {
      console.error('Error cargando información del token padre:', err)
    } finally {
      setLoadingBalances(false)
    }
  }, [account, getTokenBalance, getToken, selectedType])

  // Agregar un padre a la lista
  const addParent = () => {
    if (!canAddParents()) return
    
    const newParent = { tokenId: BigInt(0), amount: null as number | null }
    setParentIds([...parentIds, newParent])
  }

  // Remover un padre de la lista
  const removeParent = (index: number) => {
    setParentIds(parentIds.filter((_, i) => i !== index))
  }

  // Actualizar un padre en la lista
  const updateParent = async (index: number, field: 'tokenId' | 'amount', value: bigint | number | null) => {
    // Si se cambió el tokenId, cargar balance primero
    if (field === 'tokenId' && typeof value === 'bigint' && value > BigInt(0)) {
      await loadParentBalance(value, index)
    } else {
      // Actualizar directamente
      setParentIds(prev => {
        const updated = [...prev]
        if (field === 'tokenId') {
          updated[index] = { ...updated[index], [field]: value as bigint }
          // El monto se cargará cuando se llame a loadParentBalance
        } else {
          updated[index] = { ...updated[index], [field]: value as number | null }
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

  const handleFormSubmit = async (data: unknown, type: PharmaTokenType, logType?: ComplianceLogType, recallFlag?: boolean) => {
    let result: { success: boolean; json?: string; errors: string[] }

    switch (type) {
      case PharmaTokenType.API_MP:
        result = buildApiMpFeatures(data as ApiMpBuilderInput)
        if (result.success) setTokenName(`API: ${(data as ApiMpBuilderInput).substanceName}`)
        break
      case PharmaTokenType.BOM:
        result = buildBomFeatures(data as BomBuilderInput)
        if (result.success) {
          setTokenName(`BOM: ${(data as BomBuilderInput).productName}`)
          // Los parentIds se manejan directamente en el wizard mediante el selector de tokens padres
          // No se sincronizan desde el formulario BOM ya que la sección de componentes fue eliminada
        }
        break
      case PharmaTokenType.PT_LOTE:
        result = buildPtLoteFeatures(data as PtLoteBuilderInput)
        if (result.success) {
          setTokenName(`PT: ${(data as PtLoteBuilderInput).productName} - ${(data as PtLoteBuilderInput).batchNumber}`)
          // Si no hay padre configurado y tiene BOM asociado, agregar como padre
          // El amount quedará en null (campo vacío) para que el usuario ingrese libremente
          const ptData = data as PtLoteBuilderInput
          if (parentIds.length === 0 && ptData.bomTokenId) {
            setParentIds([{ tokenId: BigInt(ptData.bomTokenId), amount: null }])
            // Cargar el balance y totalSupply del token padre para mostrarlos como máximo
            loadParentBalance(BigInt(ptData.bomTokenId), 0).catch(console.error)
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
              setParentIds([{ tokenId: BigInt(tempData.ssccTokenId), amount: 1 }])
            }
          }
        } else if (logType === ComplianceLogType.CAPA) {
          result = buildCapaFeatures(data as CapaBuilderInput)
          if (result.success) {
            setTokenName(`CAPA: ${(data as CapaBuilderInput).capaId}`)
            // Si no hay padre configurado, usar el del formulario
            if (parentIds.length === 0) {
              const capaData = data as CapaBuilderInput
              setParentIds([{ tokenId: BigInt(capaData.ssccTokenId), amount: 1 }])
            }
          }
        } else if (logType === ComplianceLogType.RECALL) {
          result = buildRecallFeatures(data as RecallBuilderInput)
          if (result.success) {
            setTokenName(`Recall: ${(data as RecallBuilderInput).recallId}`)
            // Si no hay padre configurado, usar el del formulario
            if (parentIds.length === 0) {
              const recallData = data as RecallBuilderInput
              setParentIds([{ tokenId: BigInt(recallData.ptLoteTokenId), amount: 1 }])
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
    let parsed: unknown
    try {
      parsed = JSON.parse(featuresJson)
    } catch (err) {
      setValidationErrors(['El JSON de features no es válido. Por favor, revisa el formato.'])
      return
    }
    
    // Validar que sea un objeto
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      setValidationErrors(['El JSON de features debe ser un objeto válido.'])
      return
    }

    if (!selectedType) {
      setValidationErrors(['Debes seleccionar un tipo de token'])
      return
    }
    
    // Validar según el tipo si permite decimales o solo enteros
    const allowsDecimals = allowsDecimalAmounts()
    const minAmount = allowsDecimals ? 0 : 1 // Para enteros, mínimo 2, pero validamos después
    
    // Convertir parentIds y parentAmounts a arrays (filtrar los que tienen tokenId = 0 y amount válido)
    // Para tipos que no permiten decimales, validar que sea entero >= 1
    const validParents = parentIds.filter(p => {
      if (p.tokenId === BigInt(0)) return false
      if (p.amount === null || p.amount === undefined) return false
      if (allowsDecimals) {
        return p.amount > 0
      } else {
        // Para enteros, debe ser >= 1 y ser un número entero
        return p.amount >= 1 && Number.isInteger(p.amount)
      }
    })
    
    // Validar que todos los padres requeridos tengan un amount válido
    const requiredParents = parentIds.filter(p => p.tokenId > BigInt(0))
    const invalidParents = requiredParents.filter(p => {
      if (p.amount === null || p.amount === undefined) return true
      if (allowsDecimals) {
        return p.amount <= 0
      } else {
        // Para enteros, debe ser >= 1 y ser un número entero
        return p.amount < 1 || !Number.isInteger(p.amount)
      }
    })
    
    if (invalidParents.length > 0) {
      const errorMessage = allowsDecimals 
        ? 'Todos los tokens padre deben tener una cantidad mayor a 0. Por favor, ingresa la cantidad manualmente.'
        : 'Todos los tokens padre deben tener una cantidad entera mayor o igual a 1. Por favor, ingresa una cantidad válida.'
      setValidationErrors([errorMessage])
      return
    }
    
    const parentIdsArray = validParents.map(p => p.tokenId)
    const parentAmountsArray = validParents.map(p => {
      // Convertir de number a bigint multiplicando por 1000 para mantener 3 decimales de precisión
      const amountAsBigInt = BigInt(Math.round(p.amount! * 1000))
      return amountAsBigInt
    })

    // Asegurar que sean arrays (no undefined/null)
    const safeParentIds = Array.isArray(parentIdsArray) ? parentIdsArray : []
    const safeParentAmounts = Array.isArray(parentAmountsArray) ? parentAmountsArray : []

    const contractTokenType = tokenTypeStringToNumber(selectedType)
    
    // Validación específica para PT_LOTE: verificar que el token padre existe y hay suficientes componentes
    if (selectedType === PharmaTokenType.PT_LOTE && safeParentIds.length === 1) {
      try {
        const recipeId = safeParentIds[0]
        
        // Verificar que el token padre existe
        if (!recipeId || recipeId === BigInt(0)) {
          setValidationErrors(['Debes seleccionar un token padre (receta BOM) para crear el lote.'])
          return
        }
        
        const recipe = await getToken(recipeId)
        
        if (!recipe) {
          setValidationErrors([`El token padre #${recipeId.toString()} no existe. Por favor, selecciona un token válido.`])
          return
        }
        
        // Verificar que el padre sea una receta (BOM)
        if (recipe.tokenType !== 1) { // 1 = BOM
          setValidationErrors(['El padre seleccionado no es una receta (BOM). Un lote solo puede tener como padre una receta.'])
          return
        }
        
        // Obtener balances y verificar componentes
        // componentAmountPerUnit está en BigInt con 3 decimales (multiplicado por 1000)
        // lotAmount es el supply del lote (entero)
        // parentAmount está en BigInt con 3 decimales (multiplicado por 1000)
        // totalUnits = totalSupply * (parentAmount / 1000) = unidades totales de producto terminado
        // totalComponentNeeded = (componentAmountPerUnit * totalUnits) / 1000
        const lotAmount = BigInt(totalSupply)
        const parentAmountRaw = safeParentAmounts[0] // BigInt con 3 decimales (ej: 10000 = 10)
        const parentAmount = parentAmountRaw / BigInt(1000) // Convertir a entero (ej: 10000 / 1000 = 10)
        const totalUnits = lotAmount * parentAmount // totalSupply * parentAmount (ej: 1000 * 10 = 10000)
        const insufficientComponents: string[] = []
        
        for (let i = 0; i < recipe.parentIds.length; i++) {
          const componentId = recipe.parentIds[i]
          const componentAmountPerUnit = recipe.parentAmounts[i] // BigInt con 3 decimales (ej: 500 = 0.5)
          
          // Calcular: (componentAmountPerUnit * totalUnits) / 1000
          // Ejemplo: 0.5 unidades/componente * 10000 unidades totales = 5000 unidades
          // En BigInt: (500 * 10000) / 1000 = 5000000 / 1000 = 5000
          const totalComponentNeeded = (componentAmountPerUnit * totalUnits) / BigInt(1000)
          
          // Obtener balance del componente (en BigInt entero)
          const balance = await getTokenBalance(componentId, account!)
          
          if (balance < totalComponentNeeded) {
            // Obtener información del componente para el mensaje
            const componentToken = await getToken(componentId)
            const componentName = componentToken?.name || `Token #${componentId}`
            
            // Convertir a números para mostrar decimales en el mensaje
            const componentAmountDecimal = Number(componentAmountPerUnit) / 1000
            const parentAmountDecimal = Number(parentAmount)
            const totalNeededDecimal = componentAmountDecimal * totalSupply * parentAmountDecimal
            
            insufficientComponents.push(
              `${componentName}: necesitas ${totalNeededDecimal.toFixed(3)} unidades (${componentAmountDecimal.toFixed(3)} × ${totalSupply} × ${parentAmountDecimal}) pero solo tienes ${balance.toString()} disponibles`
            )
          }
        }
        
        if (insufficientComponents.length > 0) {
          setValidationErrors([
            `No hay suficientes componentes para crear el lote de ${totalSupply} unidades.`,
            ...insufficientComponents
          ])
          return
        }
      } catch (err) {
        console.error('Error validando componentes:', err)
        setValidationErrors(['Error al validar los componentes. Por favor, intenta de nuevo.'])
        return
      }
    }
    
    // Validación específica para SSCC: debe tener exactamente un padre (lote/PT_LOTE)
    if (selectedType === PharmaTokenType.SSCC && safeParentIds.length === 1) {
      try {
        const lotId = safeParentIds[0]
        
        // Verificar que el token padre existe
        if (!lotId || lotId === BigInt(0)) {
          setValidationErrors(['Debes seleccionar un token padre (lote PT_LOTE) para crear la unidad lógica.'])
          return
        }
        
        const lot = await getToken(lotId)
        
        if (!lot) {
          setValidationErrors([`El token padre #${lotId.toString()} no existe. Por favor, selecciona un token válido.`])
          return
        }
        
        // Verificar que el padre sea un lote (PT_LOTE)
        if (lot.tokenType !== 2) { // 2 = PT_LOTE
          setValidationErrors(['El padre seleccionado no es un lote (PT_LOTE). Una unidad lógica solo puede tener como padre un lote.'])
          return
        }
        
        // Obtener balance del lote padre
        const lotBalance = await getTokenBalance(lotId, account!)
        
        // Calcular cantidad total a consumir
        // parentAmount viene multiplicado por 1000, así que dividimos por 1000
        const parentAmountRaw = safeParentAmounts[0] // BigInt con 3 decimales (ej: 1000 = 1)
        const parentAmount = parentAmountRaw / BigInt(1000) // Convertir a entero (ej: 1000 / 1000 = 1)
        const totalAmountToConsume = BigInt(totalSupply) * parentAmount
        
        console.log('[DEBUG] SSCC Validation:', {
          lotId: lotId.toString(),
          lotBalance: lotBalance.toString(),
          totalSupply,
          parentAmountRaw: parentAmountRaw.toString(),
          parentAmount: parentAmount.toString(),
          totalAmountToConsume: totalAmountToConsume.toString(),
          calculation: `${totalSupply} × ${parentAmount.toString()} = ${totalAmountToConsume.toString()}`
        })
        
        // Verificar que hay suficiente balance
        if (lotBalance < totalAmountToConsume) {
          setValidationErrors([
            `Balance insuficiente: necesitas ${totalAmountToConsume.toString()} unidades del lote ` +
            `(${totalSupply} × ${parentAmount.toString()}) pero solo tienes ${lotBalance.toString()} disponibles.`
          ])
          return
        }
      } catch (err) {
        console.error('Error validando balance del lote:', err)
        setValidationErrors(['Error al validar el balance del lote padre. Por favor, intenta de nuevo.'])
        return
      }
    }
    
    console.log('[DEBUG] CreateTokenWizard - createToken:', {
      tokenName,
      totalSupply,
      tokenType: contractTokenType,
      parentIdsLength: safeParentIds.length,
      parentAmountsLength: safeParentAmounts.length,
      parentIds: safeParentIds.map(id => id.toString()),
      parentAmounts: safeParentAmounts.map(amt => amt.toString()),
      parentAmountsCalculated: safeParentAmounts.map(amt => {
        const divided = amt / BigInt(1000)
        return `${amt.toString()} (${divided.toString()} después de dividir por 1000)`
      })
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
                  Sin padres (opcional)
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
                            value={parent.tokenId === BigInt(0) ? "0" : parent.tokenId.toString()}
                            onChange={(e) => {
                              const selectedValue = e.target.value
                              const tokenId = selectedValue === "0" ? BigInt(0) : BigInt(selectedValue)
                              
                              // Actualizar el estado primero
                              setParentIds(prev => {
                                const updated = [...prev]
                                updated[index] = { ...updated[index], tokenId }
                                return updated
                              })
                              
                              // Cargar balance si se seleccionó un token (sin await para no bloquear el render)
                              if (tokenId > BigInt(0)) {
                                loadParentBalance(tokenId, index).catch(err => {
                                  console.error('Error cargando balance:', err)
                                })
                              }
                            }}
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
                            {allowsDecimalAmounts() && parent.totalSupply !== undefined && (
                              <span className="text-surface-400"> (max: {(Number(parent.totalSupply) / 1000).toFixed(3)})</span>
                            )}
                          </label>
                          <input
                            type="number"
                            value={parent.amount === null || parent.amount === undefined ? '' : parent.amount}
                            onChange={(e) => {
                              const inputValue = e.target.value
                              const allowsDecimals = allowsDecimalAmounts()
                              
                              // Permitir campo vacío
                              if (inputValue === '' || inputValue === '-') {
                                updateParent(index, 'amount', null)
                                return
                              }
                              
                              // Para tipos que no permiten decimales, validar que sea entero
                              if (!allowsDecimals) {
                                // Permitir cualquier número entero mientras se escribe (la validación >= 2 se hace al crear el token)
                                const intValue = parseInt(inputValue, 10)
                                if (!isNaN(intValue) && intValue >= 1) {
                                  // Para PT_LOTE y SSCC: no hay límite máximo
                                  updateParent(index, 'amount', intValue)
                                } else if (inputValue === '' || inputValue === '0') {
                                  // Permitir campo vacío o 0 temporalmente
                                  updateParent(index, 'amount', inputValue === '' ? null : 0)
                                }
                              } else {
                                // Para tipos que permiten decimales (BOM)
                                const value = parseFloat(inputValue)
                                if (!isNaN(value) && value >= 0) {
                                  // Usar totalSupply del token padre como máximo (solo para BOM)
                                  const maxValue = parent.totalSupply ? Number(parent.totalSupply) / 1000 : Number.MAX_SAFE_INTEGER
                                  if (value <= maxValue) {
                                    updateParent(index, 'amount', value)
                                  }
                                }
                              }
                            }}
                            className="input-field mt-1 text-sm"
                            min={allowsDecimalAmounts() ? "0" : "1"}
                            step={allowsDecimalAmounts() ? "0.001" : "1"}
                            max={allowsDecimalAmounts() && parent.totalSupply ? (Number(parent.totalSupply) / 1000).toString() : undefined}
                            disabled={!isParentAmountEditable(index)}
                            readOnly={!isParentAmountEditable(index)}
                            placeholder={allowsDecimalAmounts() ? "Ingrese cantidad" : "Ingrese cantidad (entero ≥ 2)"}
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
                                value={parent.tokenId === BigInt(0) ? "0" : parent.tokenId.toString()}
                                onChange={(e) => {
                                  const selectedValue = e.target.value
                                  const tokenId = selectedValue === "0" ? BigInt(0) : BigInt(selectedValue)
                                  
                                  // Actualizar el estado primero
                                  setParentIds(prev => {
                                    const updated = [...prev]
                                    updated[index] = { ...updated[index], tokenId }
                                    return updated
                                  })
                                  
                                  // Cargar balance si se seleccionó un token (sin await para no bloquear el render)
                                  if (tokenId > BigInt(0)) {
                                    loadParentBalance(tokenId, index).catch(err => {
                                      console.error('Error cargando balance:', err)
                                    })
                                  }
                                }}
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
                                {allowsDecimalAmounts() && parent.totalSupply !== undefined && (
                                  <span className="text-surface-400"> (max: {(Number(parent.totalSupply) / 1000).toFixed(3)})</span>
                                )}
                              </label>
                              <input
                                type="number"
                                value={parent.amount === null || parent.amount === undefined ? '' : parent.amount}
                                onChange={(e) => {
                                  const inputValue = e.target.value
                                  const allowsDecimals = allowsDecimalAmounts()
                                  
                                  // Permitir campo vacío
                                  if (inputValue === '' || inputValue === '-') {
                                    updateParent(index, 'amount', null)
                                    return
                                  }
                                  
                                  // Para tipos que no permiten decimales, validar que sea entero
                                  if (!allowsDecimals) {
                                    // Permitir cualquier número entero mientras se escribe (la validación >= 2 se hace al crear el token)
                                    const intValue = parseInt(inputValue, 10)
                                    if (!isNaN(intValue) && intValue >= 1) {
                                      // Para PT_LOTE y SSCC: no hay límite máximo
                                      updateParent(index, 'amount', intValue)
                                    } else if (inputValue === '' || inputValue === '0') {
                                      // Permitir campo vacío o 0 temporalmente
                                      updateParent(index, 'amount', inputValue === '' ? null : 0)
                                    }
                                  } else {
                                    // Para tipos que permiten decimales (BOM)
                                    const value = parseFloat(inputValue)
                                    if (!isNaN(value) && value >= 0) {
                                      // Usar totalSupply del token padre como máximo (solo para BOM)
                                      const maxValue = parent.totalSupply ? Number(parent.totalSupply) / 1000 : Number.MAX_SAFE_INTEGER
                                      if (value <= maxValue) {
                                        updateParent(index, 'amount', value)
                                      }
                                    }
                                  }
                                }}
                                className="input-field mt-1 text-sm"
                                min={allowsDecimalAmounts() ? "0" : "1"}
                                step={allowsDecimalAmounts() ? "0.001" : "1"}
                                max={allowsDecimalAmounts() && parent.totalSupply ? (Number(parent.totalSupply) / 1000).toString() : undefined}
                                disabled={!isParentAmountEditable(index)}
                                readOnly={!isParentAmountEditable(index)}
                                placeholder={allowsDecimalAmounts() ? "Ingrese cantidad" : "Ingrese cantidad (entero ≥ 2)"}
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
                ? parentIds.map((p, i) => `#${p.tokenId} (${p.amount.toFixed(3)})`).join(', ')
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




