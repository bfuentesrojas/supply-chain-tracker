/**
 * Validador de JSON Schema para features de tokens
 * Incluye descripciones de tipos y utilidades de validación
 */

// Schema importado dinámicamente si es necesario
// import featuresSchema from '@/schemas/features.schema.json'

// ============ Descripciones de Tipos ============

/** Descripciones completas de los tipos de token */
export const TOKEN_TYPE_DESCRIPTIONS: Record<string, string> = {
  'API_MP': 'Materia Prima / Ingrediente Farmacéutico Activo',
  'BOM': 'Bill of Materials - Receta de Fabricación',
  'PT_LOTE': 'Producto Terminado - Lote de Fabricación',
  'SSCC': 'Serial Shipping Container Code - Unidad Logística',
  'COMPLIANCE_LOG': 'Registro de Cumplimiento Regulatorio'
}

/** Descripciones cortas de los tipos de token */
export const TOKEN_TYPE_SHORT_DESCRIPTIONS: Record<string, string> = {
  'API_MP': 'Materia Prima',
  'BOM': 'Receta',
  'PT_LOTE': 'Producto Terminado',
  'SSCC': 'Unidad Logística',
  'COMPLIANCE_LOG': 'Cumplimiento'
}

// ============ Interfaz de Resultado ============

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// ============ Validación Simple (sin ajv) ============

/**
 * Valida que el string sea un JSON válido
 */
export function isValidJson(jsonString: string): boolean {
  try {
    JSON.parse(jsonString)
    return true
  } catch {
    return false
  }
}

/**
 * Parsea JSON de forma segura
 */
export function safeParseJson(jsonString: string): { success: boolean; data?: unknown; error?: string } {
  try {
    const data = JSON.parse(jsonString)
    return { success: true, data }
  } catch (e) {
    return { 
      success: false, 
      error: e instanceof Error ? e.message : 'JSON inválido' 
    }
  }
}

/**
 * Valida las features según el schema básico
 * Validación simplificada sin librería externa
 */
export function validateFeatures(features: unknown): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validar que sea un objeto
  if (!features || typeof features !== 'object' || Array.isArray(features)) {
    return {
      isValid: false,
      errors: ['Las features deben ser un objeto JSON'],
      warnings: []
    }
  }

  const obj = features as Record<string, unknown>

  // Validar campos requeridos según schema (type ya no es requerido, está en el contrato)
  const requiredFields = ['schema_version', 'labels']
  for (const field of requiredFields) {
    if (!(field in obj)) {
      errors.push(`Campo requerido faltante: ${field}`)
    }
  }

  // Validar schema_version
  if (obj.schema_version && obj.schema_version !== '1.0.0') {
    errors.push('schema_version debe ser "1.0.0"')
  }

  // Validar type (opcional, solo si está presente - el tipo ahora está en el contrato como tokenType)
  const validTypes = ['API_MP', 'BOM', 'PT_LOTE', 'SSCC', 'COMPLIANCE_LOG']
  if (obj.type) {
    if (!validTypes.includes(obj.type as string)) {
      errors.push(`type inválido. Valores permitidos: ${validTypes.join(', ')}`)
    } else {
      warnings.push('El campo "type" está presente pero ya no es requerido (el tipo se especifica en el contrato como tokenType)')
    }
  }

  // Validar labels
  if (obj.labels) {
    if (typeof obj.labels !== 'object' || Array.isArray(obj.labels)) {
      errors.push('labels debe ser un objeto')
    } else {
      const labels = obj.labels as Record<string, unknown>
      if (!labels.display_name || typeof labels.display_name !== 'string') {
        errors.push('labels.display_name es requerido y debe ser un string')
      }
    }
  }

  // Validaciones específicas por tipo (solo si type está presente en el JSON)
  // Nota: Si type no está presente, estas validaciones se omiten ya que el tipo se especifica en el contrato
  if (obj.type && errors.length === 0) {
    validateTypeSpecificFields(obj.type as string, obj, errors, warnings)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validaciones específicas según el tipo de token
 */
function validateTypeSpecificFields(
  type: string, 
  obj: Record<string, unknown>,
  errors: string[],
  warnings: string[]
): void {
  switch (type) {
    case 'API_MP':
      if (!obj.gs1) errors.push('API_MP requiere el campo gs1')
      if (!obj.uom) errors.push('API_MP requiere el campo uom')
      if (obj.gs1) {
        const gs1 = obj.gs1 as Record<string, unknown>
        if (!gs1.ai_10_lote) errors.push('API_MP requiere gs1.ai_10_lote')
      }
      break

    case 'BOM':
      if (!obj.parents) errors.push('BOM requiere el campo parents')
      if (obj.parents) {
        const parents = obj.parents as Record<string, unknown>
        if (!parents.components || !Array.isArray(parents.components)) {
          errors.push('BOM requiere parents.components como array')
        } else if ((parents.components as unknown[]).length === 0) {
          errors.push('BOM requiere al menos un componente')
        }
      }
      break

    case 'PT_LOTE':
      if (!obj.gs1) errors.push('PT_LOTE requiere el campo gs1')
      if (!obj.isp) errors.push('PT_LOTE requiere el campo isp')
      if (!obj.uom) errors.push('PT_LOTE requiere el campo uom')
      if (!obj.parents) errors.push('PT_LOTE requiere el campo parents')
      if (obj.gs1) {
        const gs1 = obj.gs1 as Record<string, unknown>
        if (!gs1.gtin) errors.push('PT_LOTE requiere gs1.gtin')
        if (!gs1.ai_10_lote) errors.push('PT_LOTE requiere gs1.ai_10_lote')
        if (!gs1.ai_17_vencimiento) errors.push('PT_LOTE requiere gs1.ai_17_vencimiento')
      }
      if (obj.isp) {
        const isp = obj.isp as Record<string, unknown>
        if (!isp.registro_sanitario) errors.push('PT_LOTE requiere isp.registro_sanitario')
      }
      break

    case 'SSCC':
      if (!obj.gs1) errors.push('SSCC requiere el campo gs1')
      if (!obj.contents) errors.push('SSCC requiere el campo contents')
      if (!obj.parents) errors.push('SSCC requiere el campo parents')
      if (obj.gs1) {
        const gs1 = obj.gs1 as Record<string, unknown>
        if (!gs1.sscc) errors.push('SSCC requiere gs1.sscc')
      }
      if (obj.contents && Array.isArray(obj.contents)) {
        if ((obj.contents as unknown[]).length === 0) {
          errors.push('SSCC requiere al menos un contenido')
        }
      }
      break

    case 'COMPLIANCE_LOG':
      if (!obj.documents) errors.push('COMPLIANCE_LOG requiere el campo documents')
      if (!obj.parents) errors.push('COMPLIANCE_LOG requiere el campo parents')
      if (obj.documents && Array.isArray(obj.documents)) {
        if ((obj.documents as unknown[]).length === 0) {
          errors.push('COMPLIANCE_LOG requiere al menos un documento')
        }
      }
      if (obj.custom) {
        const custom = obj.custom as Record<string, unknown>
        if (!custom.kind) {
          warnings.push('COMPLIANCE_LOG debería tener custom.kind')
        }
      }
      break
  }
}

/**
 * Valida un string JSON de features
 */
export function validateFeaturesJson(jsonString: string): ValidationResult {
  // Primero validar que sea JSON válido
  const parseResult = safeParseJson(jsonString)
  if (!parseResult.success) {
    return {
      isValid: false,
      errors: [`JSON inválido: ${parseResult.error}`],
      warnings: []
    }
  }

  // Luego validar estructura
  return validateFeatures(parseResult.data)
}

/**
 * Obtiene la descripción de un tipo de token
 */
export function getTypeDescription(type: string): string {
  return TOKEN_TYPE_DESCRIPTIONS[type] || type
}

/**
 * Obtiene la descripción corta de un tipo de token
 */
export function getTypeShortDescription(type: string): string {
  return TOKEN_TYPE_SHORT_DESCRIPTIONS[type] || type
}

/**
 * Formatea el tipo con su descripción: "API_MP (Materia Prima)"
 */
export function formatTypeWithDescription(type: string): string {
  const desc = TOKEN_TYPE_SHORT_DESCRIPTIONS[type]
  return desc ? `${type} (${desc})` : type
}

/**
 * Extrae los IDs de componentes de un BOM
 * Soporta ambos formatos:
 * - Formato nuevo: parents.components (schema JSON)
 * - Formato antiguo: components (BomFeatures directo)
 * @param features - Features JSON del token
 * @param tokenType - Tipo del token desde el contrato (opcional, se usa si type no está en JSON)
 */
export function extractBomComponentIds(features: unknown, tokenType?: string): number[] {
  if (!features || typeof features !== 'object') {
    console.log('[DEBUG] extractBomComponentIds: features no es objeto')
    return []
  }
  
  const obj = features as Record<string, unknown>
  // Verificar tipo: primero en JSON (si existe), luego en parámetro del contrato
  const type = obj.type as string | undefined || tokenType
  if (type !== 'BOM') {
    console.log('[DEBUG] extractBomComponentIds: tipo no es BOM', { typeFromJson: obj.type, typeFromContract: tokenType, finalType: type })
    return []
  }
  
  // Intentar formato nuevo: parents.components
  const parents = obj.parents as Record<string, unknown> | undefined
  console.log('[DEBUG] extractBomComponentIds: parents =', parents)
  
  if (parents?.components && Array.isArray(parents.components)) {
    const componentIds = (parents.components as Array<{ tokenId?: number }>)
      .map(c => c.tokenId)
      .filter((id): id is number => typeof id === 'number' && id > 0)
    
    console.log('[DEBUG] extractBomComponentIds: IDs extraídos de parents.components =', componentIds)
    return componentIds
  }
  
  // Intentar formato antiguo: components directamente
  if (obj.components && Array.isArray(obj.components)) {
    const componentIds = (obj.components as Array<{ tokenId?: number }>)
      .map(c => c.tokenId)
      .filter((id): id is number => typeof id === 'number' && id > 0)
    
    console.log('[DEBUG] extractBomComponentIds: IDs extraídos de components (formato antiguo) =', componentIds)
    return componentIds
  }
  
  console.log('[DEBUG] extractBomComponentIds: no se encontraron components en ningún formato', {
    hasParents: !!parents,
    hasParentsComponents: !!parents?.components,
    hasDirectComponents: !!obj.components,
    objKeys: Object.keys(obj)
  })
  return []
}

/**
 * Extrae los IDs de contenido de un SSCC
 * @param features - Features JSON del token
 * @param tokenType - Tipo del token desde el contrato (opcional, se usa si type no está en JSON)
 */
export function extractSsccContentIds(features: unknown, tokenType?: string): number[] {
  if (!features || typeof features !== 'object') return []
  
  const obj = features as Record<string, unknown>
  // Verificar tipo: primero en JSON (si existe), luego en parámetro del contrato
  const type = obj.type as string | undefined || tokenType
  if (type !== 'SSCC') return []
  
  if (!obj.contents || !Array.isArray(obj.contents)) return []
  
  return (obj.contents as Array<{ tokenId?: number }>)
    .map(c => c.tokenId)
    .filter((id): id is number => typeof id === 'number' && id > 0)
}

/**
 * Verifica si un token es de tipo compliance
 * @param features - Features JSON del token
 * @param tokenType - Tipo del token desde el contrato (opcional, se usa si type no está en JSON)
 */
export function isComplianceToken(features: unknown, tokenType?: string): boolean {
  if (!features || typeof features !== 'object') {
    // Si no hay features pero hay tokenType, usar el tokenType del contrato
    return tokenType === 'COMPLIANCE_LOG'
  }
  const obj = features as Record<string, unknown>
  // Verificar tipo: primero en JSON (si existe), luego en parámetro del contrato
  const type = obj.type as string | undefined || tokenType
  return type === 'COMPLIANCE_LOG'
}

/**
 * Obtiene la versión del schema
 */
export function getSchemaVersion() {
  return '1.0.0'
}




