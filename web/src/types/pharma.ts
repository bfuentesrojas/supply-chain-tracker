/**
 * Tipos TypeScript para el sistema de tokens de cadena de suministro farmacéutica
 * Caso de uso: Chile MVP
 */

// ============ Enums ============

/** Tipos de token disponibles */
export enum TokenType {
  API_MP = 'API_MP',           // Materia Prima / API (Active Pharmaceutical Ingredient)
  BOM = 'BOM',                 // Bill of Materials (receta/composición)
  PT_LOTE = 'PT_LOTE',         // Producto Terminado - Lote
  SSCC = 'SSCC',               // Serial Shipping Container Code (unidad logística)
  COMPLIANCE_LOG = 'COMPLIANCE_LOG' // Registros de cumplimiento (TempLog, CAPA, Recall)
}

/** Subtipos de COMPLIANCE_LOG */
export enum ComplianceLogType {
  TEMP_LOG = 'TEMP_LOG',       // Registro de temperatura
  CAPA = 'CAPA',               // Corrective And Preventive Actions
  RECALL = 'RECALL'            // Retiro de producto
}

/** Unidades de medida */
export enum UnitOfMeasure {
  KG = 'kg',
  G = 'g',
  MG = 'mg',
  L = 'L',
  ML = 'ml',
  UNITS = 'units'
}

/** Estado de almacenamiento */
export enum StorageCondition {
  AMBIENT = 'ambient',         // 15-25°C
  REFRIGERATED = 'refrigerated', // 2-8°C
  FROZEN = 'frozen',           // -20°C o menos
  CONTROLLED = 'controlled'    // Temperatura controlada específica
}

/** Nivel de severidad para CAPA */
export enum CAPASeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/** Clase de recall */
export enum RecallClass {
  CLASS_I = 'I',     // Riesgo grave para la salud
  CLASS_II = 'II',   // Riesgo temporal o reversible
  CLASS_III = 'III'  // Bajo riesgo para la salud
}

// ============ Interfaces Base ============

/** Información GS1 común */
export interface GS1Info {
  gtin?: string          // Global Trade Item Number (14 dígitos)
  gln?: string           // Global Location Number (13 dígitos)
  sscc?: string          // Serial Shipping Container Code (18 dígitos)
  grai?: string          // Global Returnable Asset Identifier
}

/** Información de lote */
export interface BatchInfo {
  batchNumber: string    // Número de lote
  expirationDate: string // Fecha de vencimiento (ISO 8601)
  manufacturingDate: string // Fecha de fabricación (ISO 8601)
}

/** Información del fabricante */
export interface ManufacturerInfo {
  name: string
  gln?: string           // GLN del fabricante
  country: string        // Código ISO 3166-1 alpha-2
  facilityId?: string    // ID de instalación
}

// ============ Features por Tipo de Token ============

/** Features para API_MP (Materia Prima / API) */
export interface ApiMpFeatures {
  type: TokenType.API_MP
  gs1: GS1Info
  batch: BatchInfo
  manufacturer: ManufacturerInfo
  substance: {
    name: string           // Nombre del principio activo o materia prima
    casNumber?: string     // CAS Registry Number
    grade: string          // Grado farmacéutico (USP, EP, BP, etc.)
    purity?: number        // Pureza en porcentaje
  }
  storage: {
    condition: StorageCondition
    minTemp?: number       // Temperatura mínima °C
    maxTemp?: number       // Temperatura máxima °C
    humidity?: string      // Requisitos de humedad
    lightSensitive?: boolean
  }
  quantity: {
    value: number
    unit: UnitOfMeasure
  }
  certificates?: string[]  // Referencias a certificados (CoA, etc.)
  ispRegistration?: string // Registro ISP Chile
}

/** Componente individual en un BOM */
export interface BOMComponent {
  tokenId: number         // ID del token componente (API_MP u otro)
  name: string            // Nombre descriptivo
  quantity: number        // Cantidad requerida
  unit: UnitOfMeasure
  percentage?: number     // Porcentaje en la formulación
  isActive: boolean       // Es principio activo o excipiente
}

/** Features para BOM (Bill of Materials) */
export interface BomFeatures {
  type: TokenType.BOM
  productName: string      // Nombre del producto que describe
  version: string          // Versión del BOM (ej: "1.0")
  components: BOMComponent[]
  totalYield: {
    value: number
    unit: UnitOfMeasure
  }
  instructions?: string    // Instrucciones de fabricación resumidas
  ispRegistration?: string // Registro sanitario ISP
}

/** Features para PT_LOTE (Producto Terminado - Lote) */
export interface PtLoteFeatures {
  type: TokenType.PT_LOTE
  gs1: GS1Info
  batch: BatchInfo
  manufacturer: ManufacturerInfo
  product: {
    name: string           // Nombre comercial
    genericName?: string   // Nombre genérico/DCI
    dosageForm: string     // Forma farmacéutica
    strength: string       // Concentración/potencia
    presentation: string   // Presentación (ej: "30 comprimidos")
  }
  storage: {
    condition: StorageCondition
    minTemp?: number
    maxTemp?: number
    shelfLife?: number     // Vida útil en meses
  }
  regulatory: {
    ispRegistration: string  // Registro ISP Chile
    atcCode?: string         // Código ATC
    prescription?: boolean   // Requiere receta
  }
  quantity: {
    value: number
    unit: UnitOfMeasure
  }
  bomTokenId?: number        // Referencia al BOM usado (vía parentId)
  qualityRelease?: {
    date: string
    responsibleQP: string    // Qualified Person
  }
}

/** Features para SSCC (Unidad Logística) */
export interface SsccFeatures {
  type: TokenType.SSCC
  gs1: GS1Info & {
    sscc: string             // SSCC es obligatorio aquí
  }
  packaging: {
    type: string             // Tipo de embalaje (pallet, caja, etc.)
    quantity: number         // Cantidad de unidades contenidas
    grossWeight?: number     // Peso bruto en kg
    netWeight?: number       // Peso neto en kg
    dimensions?: {
      length: number         // cm
      width: number          // cm
      height: number         // cm
    }
  }
  contents: {
    tokenId: number          // ID del token contenido (PT_LOTE)
    batchNumber: string
    quantity: number
  }[]
  logistics: {
    shipmentDate?: string    // Fecha de envío
    origin: {
      gln?: string
      name: string
      address?: string
    }
    destination?: {
      gln?: string
      name: string
      address?: string
    }
  }
  storage: {
    condition: StorageCondition
    minTemp?: number
    maxTemp?: number
  }
}

/** Registro de temperatura individual */
export interface TempReading {
  timestamp: string        // ISO 8601
  value: number            // Temperatura en °C
  sensorId?: string        // ID del sensor
  location?: string        // Ubicación del sensor
}

/** Features para COMPLIANCE_LOG tipo TEMP_LOG */
export interface TempLogFeatures {
  type: TokenType.COMPLIANCE_LOG
  logType: ComplianceLogType.TEMP_LOG
  ssccTokenId: number      // SSCC al que aplica (vía parentId)
  period: {
    startDate: string      // ISO 8601
    endDate: string        // ISO 8601
  }
  readings: TempReading[]
  summary: {
    minTemp: number
    maxTemp: number
    avgTemp: number
    excursions: number     // Número de excursiones fuera de rango
  }
  limits: {
    minAllowed: number
    maxAllowed: number
  }
  deviceInfo?: {
    model: string
    serialNumber: string
    calibrationDate?: string
  }
}

/** Features para COMPLIANCE_LOG tipo CAPA */
export interface CapaFeatures {
  type: TokenType.COMPLIANCE_LOG
  logType: ComplianceLogType.CAPA
  ssccTokenId: number      // SSCC al que aplica (vía parentId)
  capa: {
    id: string             // ID interno del CAPA
    severity: CAPASeverity
    description: string    // Descripción del problema
    rootCause?: string     // Análisis de causa raíz
    correctiveActions: string[]
    preventiveActions: string[]
    status: 'open' | 'in_progress' | 'closed' | 'verified'
    openDate: string       // ISO 8601
    dueDate?: string       // ISO 8601
    closeDate?: string     // ISO 8601
  }
  affectedBatches?: string[]
  responsiblePerson: string
}

/** Features para COMPLIANCE_LOG tipo RECALL */
export interface RecallFeatures {
  type: TokenType.COMPLIANCE_LOG
  logType: ComplianceLogType.RECALL
  ptLoteTokenId: number    // PT_LOTE al que aplica (vía parentId)
  recall: {
    id: string             // ID del recall (ej: número ISP)
    class: RecallClass
    reason: string         // Motivo del retiro
    description: string    // Descripción detallada
    initiatedDate: string  // ISO 8601
    effectiveDate: string  // ISO 8601
  }
  affectedBatches: string[]
  affectedQuantity: {
    value: number
    unit: UnitOfMeasure
  }
  distribution: {
    regions?: string[]     // Regiones afectadas
    distributors?: string[]
  }
  contactInfo: {
    name: string
    phone?: string
    email?: string
  }
  regulatoryNotification?: {
    ispNotificationDate?: string
    ispNotificationNumber?: string
  }
}

/** Union type para todas las features de COMPLIANCE_LOG */
export type ComplianceLogFeatures = TempLogFeatures | CapaFeatures | RecallFeatures

/** Union type para todas las features posibles */
export type TokenFeatures = 
  | ApiMpFeatures 
  | BomFeatures 
  | PtLoteFeatures 
  | SsccFeatures 
  | ComplianceLogFeatures

// ============ Tipos para formularios ============

/** Datos del formulario para crear token */
export interface CreateTokenFormData {
  name: string
  totalSupply: number
  features: TokenFeatures
  parentId: number
}

/** Resultado de validación */
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/** Opciones para el selector de tipo */
export interface TokenTypeOption {
  value: TokenType
  label: string
  description: string
  icon: string
  supplyDefault: number
}

export const TOKEN_TYPE_OPTIONS: TokenTypeOption[] = [
  {
    value: TokenType.API_MP,
    label: 'Materia Prima / API',
    description: 'Principio activo o excipiente farmacéutico',
    icon: '🧪',
    supplyDefault: 1
  },
  {
    value: TokenType.BOM,
    label: 'BOM (Receta)',
    description: 'Bill of Materials - composición del producto',
    icon: '📋',
    supplyDefault: 1
  },
  {
    value: TokenType.PT_LOTE,
    label: 'Producto Terminado',
    description: 'Lote de producto farmacéutico terminado',
    icon: '💊',
    supplyDefault: 1
  },
  {
    value: TokenType.SSCC,
    label: 'SSCC (Unidad Logística)',
    description: 'Contenedor de envío con código GS1',
    icon: '📦',
    supplyDefault: 1
  },
  {
    value: TokenType.COMPLIANCE_LOG,
    label: 'Registro de Cumplimiento',
    description: 'TempLog, CAPA o Recall',
    icon: '📝',
    supplyDefault: 1
  }
]
