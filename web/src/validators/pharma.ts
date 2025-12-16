/**
 * Validadores Zod para features de tokens de cadena de suministro farmacéutica
 */

import { z } from 'zod'
import { 
  TokenType, 
  ComplianceLogType, 
  UnitOfMeasure, 
  StorageCondition,
  CAPASeverity,
  RecallClass
} from '@/types/pharma'

// ============ Validadores GS1 ============

/** Validar GTIN (14 dígitos) */
export const gtinSchema = z.string()
  .regex(/^\d{14}$/, 'GTIN debe tener exactamente 14 dígitos')
  .refine(validateGTINCheckDigit, 'Dígito verificador de GTIN inválido')

/** Validar GLN (13 dígitos) */
export const glnSchema = z.string()
  .regex(/^\d{13}$/, 'GLN debe tener exactamente 13 dígitos')
  .refine(validateGLNCheckDigit, 'Dígito verificador de GLN inválido')

/** Validar SSCC (18 dígitos) */
export const ssccSchema = z.string()
  .regex(/^\d{18}$/, 'SSCC debe tener exactamente 18 dígitos')
  .refine(validateSSCCCheckDigit, 'Dígito verificador de SSCC inválido')

/** Validar fecha ISO 8601 */
export const isoDateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/, 
    'Fecha debe estar en formato ISO 8601')

/** Validar fecha ISO 8601 y que no esté vencida */
export const futureDateSchema = isoDateSchema.refine(
  (date) => new Date(date) > new Date(),
  'La fecha debe ser futura'
)

// ============ Funciones de validación GS1 ============

function validateGTINCheckDigit(gtin: string): boolean {
  return validateModulo10CheckDigit(gtin)
}

function validateGLNCheckDigit(gln: string): boolean {
  return validateModulo10CheckDigit(gln)
}

function validateSSCCCheckDigit(sscc: string): boolean {
  return validateModulo10CheckDigit(sscc)
}

/** Algoritmo Modulo 10 de GS1 */
function validateModulo10CheckDigit(code: string): boolean {
  if (!code || code.length < 2) return false
  
  const digits = code.split('').map(Number)
  const checkDigit = digits.pop()!
  
  let sum = 0
  const length = digits.length
  
  for (let i = 0; i < length; i++) {
    // Para GTIN-14, GLN-13, SSCC-18: posiciones impares desde la derecha x3
    const multiplier = (length - i) % 2 === 0 ? 1 : 3
    sum += digits[i] * multiplier
  }
  
  const calculatedCheck = (10 - (sum % 10)) % 10
  return calculatedCheck === checkDigit
}

// ============ Esquemas base ============

const gs1InfoSchema = z.object({
  gtin: gtinSchema.optional(),
  gln: glnSchema.optional(),
  sscc: ssccSchema.optional(),
  grai: z.string().optional()
})

const batchInfoSchema = z.object({
  batchNumber: z.string().min(1, 'Número de lote requerido').max(20, 'Máximo 20 caracteres'),
  expirationDate: isoDateSchema,
  manufacturingDate: isoDateSchema
}).refine(
  (data) => new Date(data.expirationDate) > new Date(data.manufacturingDate),
  'Fecha de vencimiento debe ser posterior a fecha de fabricación'
)

const manufacturerInfoSchema = z.object({
  name: z.string().min(1, 'Nombre del fabricante requerido'),
  gln: glnSchema.optional(),
  country: z.string().length(2, 'Código de país debe ser ISO 3166-1 alpha-2 (2 caracteres)'),
  facilityId: z.string().optional()
})

const unitOfMeasureSchema = z.nativeEnum(UnitOfMeasure)
const storageConditionSchema = z.nativeEnum(StorageCondition)

const storageSchemaBase = z.object({
  condition: storageConditionSchema,
  minTemp: z.number().optional(),
  maxTemp: z.number().optional(),
  humidity: z.string().optional(),
  lightSensitive: z.boolean().optional()
})

const storageRefinement = (data: { minTemp?: number; maxTemp?: number }) => {
  if (data.minTemp !== undefined && data.maxTemp !== undefined) {
    return data.minTemp <= data.maxTemp
  }
  return true
}

const storageSchema = storageSchemaBase.refine(
  storageRefinement,
  'Temperatura mínima debe ser menor o igual a temperatura máxima'
)

const quantitySchema = z.object({
  value: z.number().positive('La cantidad debe ser positiva'),
  unit: unitOfMeasureSchema
})

// ============ Esquemas por tipo de token ============

/** Schema para API_MP (Materia Prima) */
export const apiMpFeaturesSchema = z.object({
  type: z.literal(TokenType.API_MP),
  gs1: gs1InfoSchema,
  batch: batchInfoSchema,
  manufacturer: manufacturerInfoSchema,
  substance: z.object({
    name: z.string().min(1, 'Nombre de sustancia requerido'),
    casNumber: z.string().regex(/^\d{1,7}-\d{2}-\d$/, 'Formato CAS inválido (ej: 50-78-2)').optional(),
    grade: z.string().min(1, 'Grado farmacéutico requerido'),
    purity: z.number().min(0).max(100, 'Pureza debe estar entre 0 y 100').optional()
  }),
  storage: storageSchema,
  quantity: quantitySchema,
  certificates: z.array(z.string()).optional(),
  ispRegistration: z.string().optional()
})

/** Schema para BOM Component */
const bomComponentSchema = z.object({
  tokenId: z.number().int().nonnegative('Token ID debe ser un número entero no negativo'),
  name: z.string().min(1, 'Nombre del componente requerido'),
  quantity: z.number().positive('Cantidad debe ser positiva'),
  unit: unitOfMeasureSchema,
  percentage: z.number().min(0).max(100).optional(),
  isActive: z.boolean()
})

/** Schema para BOM (Bill of Materials) */
export const bomFeaturesSchema = z.object({
  type: z.literal(TokenType.BOM),
  productName: z.string().min(1, 'Nombre del producto requerido'),
  version: z.string().regex(/^\d+\.\d+$/, 'Versión debe ser formato X.Y'),
  components: z.array(bomComponentSchema).min(1, 'Debe tener al menos un componente'),
  totalYield: quantitySchema,
  instructions: z.string().optional(),
  ispRegistration: z.string().optional()
}).refine(
  (data) => {
    const activeComponents = data.components.filter(c => c.isActive)
    return activeComponents.length >= 1
  },
  'Debe tener al menos un principio activo'
)

/** Schema para PT_LOTE (Producto Terminado) */
export const ptLoteFeaturesSchema = z.object({
  type: z.literal(TokenType.PT_LOTE),
  gs1: gs1InfoSchema,
  batch: batchInfoSchema,
  manufacturer: manufacturerInfoSchema,
  product: z.object({
    name: z.string().min(1, 'Nombre comercial requerido'),
    genericName: z.string().optional(),
    dosageForm: z.string().min(1, 'Forma farmacéutica requerida'),
    strength: z.string().min(1, 'Concentración requerida'),
    presentation: z.string().min(1, 'Presentación requerida')
  }),
  storage: storageSchemaBase.extend({
    shelfLife: z.number().int().positive().optional()
  }).refine(storageRefinement, 'Temperatura mínima debe ser menor o igual a temperatura máxima'),
  regulatory: z.object({
    ispRegistration: z.string().min(1, 'Registro ISP requerido'),
    atcCode: z.string().regex(/^[A-Z]\d{2}[A-Z]{2}\d{2}$/, 'Formato ATC inválido').optional(),
    prescription: z.boolean().optional()
  }),
  quantity: quantitySchema,
  bomTokenId: z.number().int().nonnegative().optional(),
  qualityRelease: z.object({
    date: isoDateSchema,
    responsibleQP: z.string().min(1, 'QP responsable requerido')
  }).optional()
})

/** Schema para SSCC (Unidad Logística) */
export const ssccFeaturesSchema = z.object({
  type: z.literal(TokenType.SSCC),
  gs1: gs1InfoSchema.extend({
    sscc: ssccSchema  // SSCC es obligatorio en este tipo
  }),
  packaging: z.object({
    type: z.string().min(1, 'Tipo de embalaje requerido'),
    quantity: z.number().int().positive('Cantidad debe ser positiva'),
    grossWeight: z.number().positive().optional(),
    netWeight: z.number().positive().optional(),
    dimensions: z.object({
      length: z.number().positive(),
      width: z.number().positive(),
      height: z.number().positive()
    }).optional()
  }),
  contents: z.array(z.object({
    tokenId: z.number().int().nonnegative(),
    batchNumber: z.string().min(1),
    quantity: z.number().int().positive()
  })).min(1, 'Debe tener al menos un contenido'),
  logistics: z.object({
    shipmentDate: isoDateSchema.optional(),
    origin: z.object({
      gln: glnSchema.optional(),
      name: z.string().min(1, 'Nombre de origen requerido'),
      address: z.string().optional()
    }),
    destination: z.object({
      gln: glnSchema.optional(),
      name: z.string().min(1),
      address: z.string().optional()
    }).optional()
  }),
  storage: storageSchema
})

/** Schema para TempLog */
export const tempLogFeaturesSchema = z.object({
  type: z.literal(TokenType.COMPLIANCE_LOG),
  logType: z.literal(ComplianceLogType.TEMP_LOG),
  ssccTokenId: z.number().int().positive('Token SSCC requerido'),
  period: z.object({
    startDate: isoDateSchema,
    endDate: isoDateSchema
  }).refine(
    (data) => new Date(data.endDate) >= new Date(data.startDate),
    'Fecha fin debe ser posterior o igual a fecha inicio'
  ),
  readings: z.array(z.object({
    timestamp: isoDateSchema,
    value: z.number(),
    sensorId: z.string().optional(),
    location: z.string().optional()
  })).min(1, 'Debe tener al menos una lectura'),
  summary: z.object({
    minTemp: z.number(),
    maxTemp: z.number(),
    avgTemp: z.number(),
    excursions: z.number().int().nonnegative()
  }),
  limits: z.object({
    minAllowed: z.number(),
    maxAllowed: z.number()
  }),
  deviceInfo: z.object({
    model: z.string(),
    serialNumber: z.string(),
    calibrationDate: isoDateSchema.optional()
  }).optional()
})

/** Schema para CAPA */
export const capaFeaturesSchema = z.object({
  type: z.literal(TokenType.COMPLIANCE_LOG),
  logType: z.literal(ComplianceLogType.CAPA),
  ssccTokenId: z.number().int().positive('Token SSCC requerido'),
  capa: z.object({
    id: z.string().min(1, 'ID de CAPA requerido'),
    severity: z.nativeEnum(CAPASeverity),
    description: z.string().min(10, 'Descripción debe tener al menos 10 caracteres'),
    rootCause: z.string().optional(),
    correctiveActions: z.array(z.string().min(1)).min(1, 'Debe tener al menos una acción correctiva'),
    preventiveActions: z.array(z.string().min(1)),
    status: z.enum(['open', 'in_progress', 'closed', 'verified']),
    openDate: isoDateSchema,
    dueDate: isoDateSchema.optional(),
    closeDate: isoDateSchema.optional()
  }),
  affectedBatches: z.array(z.string()).optional(),
  responsiblePerson: z.string().min(1, 'Responsable requerido')
})

/** Schema para Recall */
export const recallFeaturesSchema = z.object({
  type: z.literal(TokenType.COMPLIANCE_LOG),
  logType: z.literal(ComplianceLogType.RECALL),
  ptLoteTokenId: z.number().int().positive('Token PT_LOTE requerido'),
  recall: z.object({
    id: z.string().min(1, 'ID de recall requerido'),
    class: z.nativeEnum(RecallClass),
    reason: z.string().min(1, 'Motivo requerido'),
    description: z.string().min(10, 'Descripción debe tener al menos 10 caracteres'),
    initiatedDate: isoDateSchema,
    effectiveDate: isoDateSchema
  }),
  affectedBatches: z.array(z.string().min(1)).min(1, 'Debe especificar lotes afectados'),
  affectedQuantity: quantitySchema,
  distribution: z.object({
    regions: z.array(z.string()).optional(),
    distributors: z.array(z.string()).optional()
  }),
  contactInfo: z.object({
    name: z.string().min(1, 'Nombre de contacto requerido'),
    phone: z.string().optional(),
    email: z.string().email('Email inválido').optional()
  }),
  regulatoryNotification: z.object({
    ispNotificationDate: isoDateSchema.optional(),
    ispNotificationNumber: z.string().optional()
  }).optional()
})

/** Schema union para COMPLIANCE_LOG */
export const complianceLogFeaturesSchema = z.discriminatedUnion('logType', [
  tempLogFeaturesSchema,
  capaFeaturesSchema,
  recallFeaturesSchema
])

/** Schema union para todas las features 
 * Usando z.union en lugar de discriminatedUnion porque algunos schemas usan .refine()
 */
export const tokenFeaturesSchema = z.union([
  apiMpFeaturesSchema,
  bomFeaturesSchema,
  ptLoteFeaturesSchema,
  ssccFeaturesSchema,
  // Para COMPLIANCE_LOG
  z.object({
    type: z.literal(TokenType.COMPLIANCE_LOG),
    logType: z.nativeEnum(ComplianceLogType)
  }).passthrough()
])

// ============ Funciones de validación ============

export type ValidationError = {
  path: string
  message: string
}

export interface ValidationResult {
  success: boolean
  data?: unknown
  errors: ValidationError[]
}

/** Validar features según su tipo */
export function validateFeatures(features: unknown): ValidationResult {
  // Primero detectar el tipo
  if (!features || typeof features !== 'object') {
    return {
      success: false,
      errors: [{ path: '', message: 'Features debe ser un objeto válido' }]
    }
  }

  const featuresObj = features as Record<string, unknown>
  const type = featuresObj.type as TokenType

  let schema: z.ZodSchema

  switch (type) {
    case TokenType.API_MP:
      schema = apiMpFeaturesSchema
      break
    case TokenType.BOM:
      schema = bomFeaturesSchema
      break
    case TokenType.PT_LOTE:
      schema = ptLoteFeaturesSchema
      break
    case TokenType.SSCC:
      schema = ssccFeaturesSchema
      break
    case TokenType.COMPLIANCE_LOG:
      const logType = featuresObj.logType as ComplianceLogType
      switch (logType) {
        case ComplianceLogType.TEMP_LOG:
          schema = tempLogFeaturesSchema
          break
        case ComplianceLogType.CAPA:
          schema = capaFeaturesSchema
          break
        case ComplianceLogType.RECALL:
          schema = recallFeaturesSchema
          break
        default:
          return {
            success: false,
            errors: [{ path: 'logType', message: 'Tipo de log de cumplimiento inválido' }]
          }
      }
      break
    default:
      return {
        success: false,
        errors: [{ path: 'type', message: 'Tipo de token inválido' }]
      }
  }

  const result = schema.safeParse(features)

  if (result.success) {
    return {
      success: true,
      data: result.data,
      errors: []
    }
  }

  return {
    success: false,
    errors: result.error.errors.map(err => ({
      path: err.path.join('.'),
      message: err.message
    }))
  }
}

/** Generar GTIN check digit */
export function generateGTINCheckDigit(gtin13: string): string {
  if (gtin13.length !== 13) throw new Error('GTIN base debe tener 13 dígitos')
  
  const digits = gtin13.split('').map(Number)
  let sum = 0
  
  for (let i = 0; i < 13; i++) {
    const multiplier = i % 2 === 0 ? 1 : 3
    sum += digits[i] * multiplier
  }
  
  const checkDigit = (10 - (sum % 10)) % 10
  return gtin13 + checkDigit
}

/** Generar SSCC check digit */
export function generateSSCCCheckDigit(sscc17: string): string {
  if (sscc17.length !== 17) throw new Error('SSCC base debe tener 17 dígitos')
  
  const digits = sscc17.split('').map(Number)
  let sum = 0
  
  for (let i = 0; i < 17; i++) {
    const multiplier = i % 2 === 0 ? 3 : 1
    sum += digits[i] * multiplier
  }
  
  const checkDigit = (10 - (sum % 10)) % 10
  return sscc17 + checkDigit
}

