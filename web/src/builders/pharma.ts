/**
 * Builders para generar objetos features validados para tokens farmacéuticos
 */

import {
  TokenType,
  ComplianceLogType,
  UnitOfMeasure,
  StorageCondition,
  CAPASeverity,
  RecallClass,
  ApiMpFeatures,
  BomFeatures,
  PtLoteFeatures,
  SsccFeatures,
  TempLogFeatures,
  CapaFeatures,
  RecallFeatures,
  BOMComponent,
  GS1Info,
  BatchInfo,
  ManufacturerInfo,
  TempReading
} from '@/types/pharma'

import {
  validateFeatures,
  generateGTINCheckDigit,
  generateSSCCCheckDigit,
  ValidationResult
} from '@/validators/pharma'

// ============ Builder Result Type ============

export interface BuilderResult<T> {
  success: boolean
  data?: T
  json?: string
  errors: string[]
}

// ============ Helper Functions ============

/** Formatear fecha actual como ISO 8601 */
export function getCurrentISODate(): string {
  return new Date().toISOString().split('T')[0]
}

/** Formatear fecha futura (meses desde hoy) */
export function getFutureDate(months: number): string {
  const date = new Date()
  date.setMonth(date.getMonth() + months)
  return date.toISOString().split('T')[0]
}

/** Crear batch info con valores por defecto */
export function createBatchInfo(
  batchNumber: string,
  expirationMonths: number = 24
): BatchInfo {
  return {
    batchNumber,
    manufacturingDate: getCurrentISODate(),
    expirationDate: getFutureDate(expirationMonths)
  }
}

/** Crear GS1 info vacío */
export function createEmptyGS1Info(): GS1Info {
  return {}
}

/** Crear manufacturer info */
export function createManufacturerInfo(
  name: string,
  country: string = 'CL',
  gln?: string,
  facilityId?: string
): ManufacturerInfo {
  return { name, country, gln, facilityId }
}

// ============ API_MP Builder ============

export interface ApiMpBuilderInput {
  // Substance
  substanceName: string
  casNumber?: string
  grade: string
  purity?: number
  // Batch
  batchNumber: string
  expirationDate: string
  manufacturingDate: string
  // Manufacturer
  manufacturerName: string
  manufacturerCountry?: string
  manufacturerGln?: string
  // Storage
  storageCondition: StorageCondition
  minTemp?: number
  maxTemp?: number
  lightSensitive?: boolean
  // Quantity
  quantity: number
  unit: UnitOfMeasure
  // GS1
  gtin?: string
  // Regulatory
  ispRegistration?: string
  certificates?: string[]
}

export function buildApiMpFeatures(input: ApiMpBuilderInput): BuilderResult<ApiMpFeatures> {
  const features: ApiMpFeatures = {
    type: TokenType.API_MP,
    gs1: {
      gtin: input.gtin
    },
    batch: {
      batchNumber: input.batchNumber,
      expirationDate: input.expirationDate,
      manufacturingDate: input.manufacturingDate
    },
    manufacturer: {
      name: input.manufacturerName,
      country: input.manufacturerCountry || 'CL',
      gln: input.manufacturerGln
    },
    substance: {
      name: input.substanceName,
      casNumber: input.casNumber,
      grade: input.grade,
      purity: input.purity
    },
    storage: {
      condition: input.storageCondition,
      minTemp: input.minTemp,
      maxTemp: input.maxTemp,
      lightSensitive: input.lightSensitive
    },
    quantity: {
      value: input.quantity,
      unit: input.unit
    },
    ispRegistration: input.ispRegistration,
    certificates: input.certificates
  }

  const validation = validateFeatures(features)
  
  if (validation.success) {
    return {
      success: true,
      data: features,
      json: JSON.stringify(features),
      errors: []
    }
  }

  return {
    success: false,
    errors: validation.errors.map(e => `${e.path}: ${e.message}`)
  }
}

// ============ BOM Builder ============

export interface BomBuilderInput {
  productName: string
  version: string
  components: BOMComponent[]
  totalYieldValue: number
  totalYieldUnit: UnitOfMeasure
  instructions?: string
  ispRegistration?: string
}

export function buildBomFeatures(input: BomBuilderInput): BuilderResult<BomFeatures> {
  const features: BomFeatures = {
    type: TokenType.BOM,
    productName: input.productName,
    version: input.version,
    components: input.components,
    totalYield: {
      value: input.totalYieldValue,
      unit: input.totalYieldUnit
    },
    instructions: input.instructions,
    ispRegistration: input.ispRegistration
  }

  const validation = validateFeatures(features)
  
  if (validation.success) {
    return {
      success: true,
      data: features,
      json: JSON.stringify(features),
      errors: []
    }
  }

  return {
    success: false,
    errors: validation.errors.map(e => `${e.path}: ${e.message}`)
  }
}

/** Helper para crear un componente BOM */
export function createBomComponent(
  tokenId: number,
  name: string,
  quantity: number,
  unit: UnitOfMeasure,
  isActive: boolean,
  percentage?: number
): BOMComponent {
  return { tokenId, name, quantity, unit, isActive, percentage }
}

// ============ PT_LOTE Builder ============

export interface PtLoteBuilderInput {
  // Product
  productName: string
  genericName?: string
  dosageForm: string
  strength: string
  presentation: string
  // Batch
  batchNumber: string
  expirationDate: string
  manufacturingDate: string
  // Manufacturer
  manufacturerName: string
  manufacturerCountry?: string
  manufacturerGln?: string
  // Storage
  storageCondition: StorageCondition
  minTemp?: number
  maxTemp?: number
  shelfLife?: number
  // Regulatory
  ispRegistration: string
  atcCode?: string
  prescription?: boolean
  // Quantity
  quantity: number
  unit: UnitOfMeasure
  // GS1
  gtin?: string
  // BOM reference
  bomTokenId?: number
  // Quality
  qualityReleaseDate?: string
  qualityResponsibleQP?: string
}

export function buildPtLoteFeatures(input: PtLoteBuilderInput): BuilderResult<PtLoteFeatures> {
  const features: PtLoteFeatures = {
    type: TokenType.PT_LOTE,
    gs1: {
      gtin: input.gtin
    },
    batch: {
      batchNumber: input.batchNumber,
      expirationDate: input.expirationDate,
      manufacturingDate: input.manufacturingDate
    },
    manufacturer: {
      name: input.manufacturerName,
      country: input.manufacturerCountry || 'CL',
      gln: input.manufacturerGln
    },
    product: {
      name: input.productName,
      genericName: input.genericName,
      dosageForm: input.dosageForm,
      strength: input.strength,
      presentation: input.presentation
    },
    storage: {
      condition: input.storageCondition,
      minTemp: input.minTemp,
      maxTemp: input.maxTemp,
      shelfLife: input.shelfLife
    },
    regulatory: {
      ispRegistration: input.ispRegistration,
      atcCode: input.atcCode,
      prescription: input.prescription
    },
    quantity: {
      value: input.quantity,
      unit: input.unit
    },
    bomTokenId: input.bomTokenId,
    qualityRelease: input.qualityReleaseDate && input.qualityResponsibleQP ? {
      date: input.qualityReleaseDate,
      responsibleQP: input.qualityResponsibleQP
    } : undefined
  }

  const validation = validateFeatures(features)
  
  if (validation.success) {
    return {
      success: true,
      data: features,
      json: JSON.stringify(features),
      errors: []
    }
  }

  return {
    success: false,
    errors: validation.errors.map(e => `${e.path}: ${e.message}`)
  }
}

// ============ SSCC Builder ============

export interface SsccContentInput {
  tokenId: number
  batchNumber: string
  quantity: number
}

export interface SsccBuilderInput {
  // SSCC
  sscc: string
  gtin?: string
  // Packaging
  packagingType: string
  packagingQuantity: number
  grossWeight?: number
  netWeight?: number
  length?: number
  width?: number
  height?: number
  // Contents
  contents: SsccContentInput[]
  // Logistics
  shipmentDate?: string
  originName: string
  originGln?: string
  originAddress?: string
  destinationName?: string
  destinationGln?: string
  destinationAddress?: string
  // Storage
  storageCondition: StorageCondition
  minTemp?: number
  maxTemp?: number
}

export function buildSsccFeatures(input: SsccBuilderInput): BuilderResult<SsccFeatures> {
  const features: SsccFeatures = {
    type: TokenType.SSCC,
    gs1: {
      sscc: input.sscc,
      gtin: input.gtin
    },
    packaging: {
      type: input.packagingType,
      quantity: input.packagingQuantity,
      grossWeight: input.grossWeight,
      netWeight: input.netWeight,
      dimensions: input.length && input.width && input.height ? {
        length: input.length,
        width: input.width,
        height: input.height
      } : undefined
    },
    contents: input.contents,
    logistics: {
      shipmentDate: input.shipmentDate,
      origin: {
        name: input.originName,
        gln: input.originGln,
        address: input.originAddress
      },
      destination: input.destinationName ? {
        name: input.destinationName,
        gln: input.destinationGln,
        address: input.destinationAddress
      } : undefined
    },
    storage: {
      condition: input.storageCondition,
      minTemp: input.minTemp,
      maxTemp: input.maxTemp
    }
  }

  const validation = validateFeatures(features)
  
  if (validation.success) {
    return {
      success: true,
      data: features,
      json: JSON.stringify(features),
      errors: []
    }
  }

  return {
    success: false,
    errors: validation.errors.map(e => `${e.path}: ${e.message}`)
  }
}

// ============ TempLog Builder ============

export interface TempLogBuilderInput {
  ssccTokenId: number
  startDate: string
  endDate: string
  readings: TempReading[]
  minAllowed: number
  maxAllowed: number
  deviceModel?: string
  deviceSerialNumber?: string
  deviceCalibrationDate?: string
}

export function buildTempLogFeatures(input: TempLogBuilderInput): BuilderResult<TempLogFeatures> {
  // Calcular resumen automáticamente
  const temps = input.readings.map(r => r.value)
  const minTemp = Math.min(...temps)
  const maxTemp = Math.max(...temps)
  const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length
  const excursions = temps.filter(t => t < input.minAllowed || t > input.maxAllowed).length

  const features: TempLogFeatures = {
    type: TokenType.COMPLIANCE_LOG,
    logType: ComplianceLogType.TEMP_LOG,
    ssccTokenId: input.ssccTokenId,
    period: {
      startDate: input.startDate,
      endDate: input.endDate
    },
    readings: input.readings,
    summary: {
      minTemp,
      maxTemp,
      avgTemp: Math.round(avgTemp * 100) / 100,
      excursions
    },
    limits: {
      minAllowed: input.minAllowed,
      maxAllowed: input.maxAllowed
    },
    deviceInfo: input.deviceModel && input.deviceSerialNumber ? {
      model: input.deviceModel,
      serialNumber: input.deviceSerialNumber,
      calibrationDate: input.deviceCalibrationDate
    } : undefined
  }

  const validation = validateFeatures(features)
  
  if (validation.success) {
    return {
      success: true,
      data: features,
      json: JSON.stringify(features),
      errors: []
    }
  }

  return {
    success: false,
    errors: validation.errors.map(e => `${e.path}: ${e.message}`)
  }
}

// ============ CAPA Builder ============

export interface CapaBuilderInput {
  ssccTokenId: number
  capaId: string
  severity: CAPASeverity
  description: string
  rootCause?: string
  correctiveActions: string[]
  preventiveActions: string[]
  status: 'open' | 'in_progress' | 'closed' | 'verified'
  openDate: string
  dueDate?: string
  closeDate?: string
  affectedBatches?: string[]
  responsiblePerson: string
}

export function buildCapaFeatures(input: CapaBuilderInput): BuilderResult<CapaFeatures> {
  const features: CapaFeatures = {
    type: TokenType.COMPLIANCE_LOG,
    logType: ComplianceLogType.CAPA,
    ssccTokenId: input.ssccTokenId,
    capa: {
      id: input.capaId,
      severity: input.severity,
      description: input.description,
      rootCause: input.rootCause,
      correctiveActions: input.correctiveActions,
      preventiveActions: input.preventiveActions,
      status: input.status,
      openDate: input.openDate,
      dueDate: input.dueDate,
      closeDate: input.closeDate
    },
    affectedBatches: input.affectedBatches,
    responsiblePerson: input.responsiblePerson
  }

  const validation = validateFeatures(features)
  
  if (validation.success) {
    return {
      success: true,
      data: features,
      json: JSON.stringify(features),
      errors: []
    }
  }

  return {
    success: false,
    errors: validation.errors.map(e => `${e.path}: ${e.message}`)
  }
}

// ============ Recall Builder ============

export interface RecallBuilderInput {
  ptLoteTokenId: number
  recallId: string
  recallClass: RecallClass
  reason: string
  description: string
  initiatedDate: string
  effectiveDate: string
  affectedBatches: string[]
  affectedQuantity: number
  affectedUnit: UnitOfMeasure
  regions?: string[]
  distributors?: string[]
  contactName: string
  contactPhone?: string
  contactEmail?: string
  ispNotificationDate?: string
  ispNotificationNumber?: string
}

export function buildRecallFeatures(input: RecallBuilderInput): BuilderResult<RecallFeatures> {
  const features: RecallFeatures = {
    type: TokenType.COMPLIANCE_LOG,
    logType: ComplianceLogType.RECALL,
    ptLoteTokenId: input.ptLoteTokenId,
    recall: {
      id: input.recallId,
      class: input.recallClass,
      reason: input.reason,
      description: input.description,
      initiatedDate: input.initiatedDate,
      effectiveDate: input.effectiveDate
    },
    affectedBatches: input.affectedBatches,
    affectedQuantity: {
      value: input.affectedQuantity,
      unit: input.affectedUnit
    },
    distribution: {
      regions: input.regions,
      distributors: input.distributors
    },
    contactInfo: {
      name: input.contactName,
      phone: input.contactPhone,
      email: input.contactEmail
    },
    regulatoryNotification: input.ispNotificationDate || input.ispNotificationNumber ? {
      ispNotificationDate: input.ispNotificationDate,
      ispNotificationNumber: input.ispNotificationNumber
    } : undefined
  }

  const validation = validateFeatures(features)
  
  if (validation.success) {
    return {
      success: true,
      data: features,
      json: JSON.stringify(features),
      errors: []
    }
  }

  return {
    success: false,
    errors: validation.errors.map(e => `${e.path}: ${e.message}`)
  }
}

// ============ Utility Exports ============

export {
  generateGTINCheckDigit,
  generateSSCCCheckDigit,
  TokenType,
  ComplianceLogType,
  UnitOfMeasure,
  StorageCondition,
  CAPASeverity,
  RecallClass
}
