# Casos de Prueba End-to-End - Sistema de Tracking Farmacéutico

Este documento describe casos de prueba completos (end-to-end) para el sistema de tracking de cadena de suministro farmacéutica, cubriendo todo el flujo desde la creación de materias primas hasta la entrega al consumidor, incluyendo casos de recall.

## Índice

1. [Caso de Prueba 1: Flujo Completo Normal](#caso-1-flujo-completo-normal)
2. [Caso de Prueba 2: Flujo con Recall](#caso-2-flujo-con-recall)
3. [Caso de Prueba 3: Múltiples Lotes desde una Receta](#caso-3-múltiples-lotes-desde-una-receta)
4. [Caso de Prueba 4: Transferencia Rechazada](#caso-4-transferencia-rechazada)

---

## Caso 1: Flujo Completo Normal

### Descripción
Flujo completo desde la creación de materias primas hasta la entrega al consumidor final, sin incidencias.

### Actores
- **Fabricante**: `0xFabricante...` (Manufacturer)
- **Distribuidor**: `0xDistribuidor...` (Distributor)
- **Minorista**: `0xMinorista...` (Retailer)
- **Consumidor**: `0xConsumidor...` (Consumer)

### Flujo de Ejecución

#### Paso 1: Creación de Materias Primas (API_MP)

**Actor**: Fabricante  
**Acción**: Crear tokens de materias primas

```javascript
// Materia Prima 1: Paracetamol API
createToken(
  name: "Paracetamol API - Lote MP-001",
  totalSupply: 10000, // 10,000 kg
  features: JSON.stringify({
    "schema_version": "1.0.0",
    "type": "API_MP",
    "labels": {
      "display_name": "Paracetamol API - Lote MP-001"
    },
    "gs1": {
      "gtin": "07612345678900",
      "ai_10_lote": "MP-001"
    },
    "uom": "kg",
    "batch": {
      "batchNumber": "MP-001",
      "manufacturingDate": "2024-01-15",
      "expirationDate": "2026-01-15"
    },
    "manufacturer": {
      "name": "API Supplier Co.",
      "country": "CL",
      "gln": "7612345678900"
    },
    "substance": {
      "name": "Paracetamol",
      "grade": "USP",
      "purity": 99.5
    },
    "storage": {
      "condition": "ambient",
      "minTemp": 15,
      "maxTemp": 25
    },
    "quantity": {
      "value": 10000,
      "unit": "kg"
    },
    "certificates": ["QC-2024-001"],
    "ispRegistration": "ISP-F-12345"
  }),
  tokenType: 0, // API_MP
  parentIds: [],
  parentAmounts: [],
  isRecall: false
)
// Resultado: Token ID 1
```

```javascript
// Materia Prima 2: Excipiente
createToken(
  name: "Excipiente - Lote EX-001",
  totalSupply: 5000, // 5,000 kg
  features: JSON.stringify({
    "schema_version": "1.0.0",
    "type": "API_MP",
    "labels": {
      "display_name": "Excipiente - Lote EX-001"
    },
    "gs1": {
      "ai_10_lote": "EX-001"
    },
    "uom": "kg",
    "batch": {
      "batchNumber": "EX-001",
      "manufacturingDate": "2024-01-16",
      "expirationDate": "2025-12-31"
    },
    "manufacturer": {
      "name": "Excipient Supplier Inc.",
      "country": "CL",
      "gln": "7654321098760"
    },
    "substance": {
      "name": "Lactosa monohidratada",
      "grade": "USP"
    },
    "storage": {
      "condition": "ambient",
      "minTemp": 15,
      "maxTemp": 25
    },
    "quantity": {
      "value": 5000,
      "unit": "kg"
    },
    "certificates": ["QC-2024-002"]
  }),
  tokenType: 0, // API_MP
  parentIds: [],
  parentAmounts: [],
  isRecall: false
)
// Resultado: Token ID 2
```

**Verificación**:
- ✅ Token ID 1 creado con tipo API_MP
- ✅ Balance del fabricante: 10,000 unidades
- ✅ Token ID 2 creado con tipo API_MP
- ✅ Balance del fabricante: 5,000 unidades

---

#### Paso 2: Creación de Receta (BOM)

**Actor**: Fabricante  
**Acción**: Crear receta de composición usando las materias primas

```javascript
createToken(
  name: "BOM - Paracetamol 500mg Tabletas",
  totalSupply: 1, // Una receta
  features: JSON.stringify({
    "schema_version": "1.0.0",
    "type": "BOM",
    "labels": {
      "display_name": "BOM - Paracetamol 500mg Tabletas"
    },
    "productName": "Paracetamol 500mg Tabletas",
    "version": "1.0",
    "components": [
      {
        "tokenId": 1,
        "name": "Paracetamol API",
        "quantity": 500,
        "unit": "g",
        "isActive": true,
        "percentage": 52.6
      },
      {
        "tokenId": 2,
        "name": "Lactosa monohidratada",
        "quantity": 450,
        "unit": "g",
        "isActive": false,
        "percentage": 47.4
      }
    ],
    "totalYield": {
      "value": 950,
      "unit": "g"
    },
    "parents": {
      "linking_strategy": "single_parent",
      "primary_parent_id": 0,
      "components": [
        {
          "tokenId": 1,
          "qty": 500,
          "uom": "g",
          "role": "API"
        },
        {
          "tokenId": 2,
          "qty": 450,
          "uom": "g",
          "role": "Excipient"
        }
      ]
    }
  }),
  tokenType: 1, // BOM
  parentIds: [1, 2], // Paracetamol API y Excipiente
  parentAmounts: [500, 450], // 500g de API + 450g de excipiente por cada unidad de receta
  isRecall: false
)
// Resultado: Token ID 3
```

**Verificación**:
- ✅ Token ID 3 creado con tipo BOM
- ✅ Tiene 2 padres: Token 1 (Paracetamol) y Token 2 (Excipiente)
- ✅ Balance del fabricante: 1 unidad de receta

---

#### Paso 3: Creación de Lote de Producto Terminado (PT_LOTE)

**Actor**: Fabricante  
**Acción**: Crear lote usando la receta (consume componentes automáticamente)

**⚠️ Verificación de Consistencia**: Antes de crear el lote, verificar que haya suficientes materias primas según el BOM:
- BOM especifica: 500g de Paracetamol API + 450g de Excipiente por unidad
- Materias primas disponibles:
  - Paracetamol API (Token 1): 10,000 kg = 10,000,000g disponibles
  - Excipiente (Token 2): 5,000 kg = 5,000,000g disponibles
- Para crear 1,000 unidades del lote se requiere:
  - Paracetamol API: 500g × 1,000 = 500,000g = 500 kg ✅ (hay 10,000 kg disponibles)
  - Excipiente: 450g × 1,000 = 450,000g = 450 kg ✅ (hay 5,000 kg disponibles)
- **Conclusión**: Se pueden crear 1,000 unidades sin problema

**Cálculo del máximo de unidades posibles**:
- Máximo según Paracetamol: 10,000,000g ÷ 500g = 20,000 unidades
- Máximo según Excipiente: 5,000,000g ÷ 450g = 11,111 unidades
- **Límite real**: 11,111 unidades (limitado por Excipiente)

```javascript
createToken(
  name: "Lote PT-2024-001 - Paracetamol 500mg",
  totalSupply: 1000, // 1,000 unidades de producto terminado (dentro del límite disponible)
  features: JSON.stringify({
    "schema_version": "1.0.0",
    "type": "PT_LOTE",
    "labels": {
      "display_name": "Lote PT-2024-001 - Paracetamol 500mg"
    },
    "gs1": {
      "gtin": "07612345678900",
      "ai_10_lote": "PT-2024-001",
      "ai_17_vencimiento": "2026-01-25"
    },
    "isp": {
      "registro_sanitario": "F-12345"
    },
    "uom": "units",
    "parents": {
      "linking_strategy": "bom_parent",
      "primary_parent_id": 3
    },
    "batch": {
      "batchNumber": "PT-2024-001",
      "manufacturingDate": "2024-01-25",
      "expirationDate": "2026-01-25"
    },
    "manufacturer": {
      "name": "Fabricante Farmacéutico S.A.",
      "country": "CL"
    },
    "product": {
      "name": "Paracetamol 500mg Tabletas",
      "genericName": "Paracetamol",
      "dosageForm": "Tableta",
      "strength": "500mg",
      "presentation": "30 comprimidos"
    },
    "storage": {
      "condition": "ambient",
      "minTemp": 15,
      "maxTemp": 25
    },
    "regulatory": {
      "ispRegistration": "F-12345"
    },
    "quantity": {
      "value": 1000,
      "unit": "units"
    },
    "bomTokenId": 3
  }),
  tokenType: 2, // PT_LOTE
  parentIds: [3], // BOM creado anteriormente
  parentAmounts: [], // No aplica para PT_LOTE
  isRecall: false
)
// Resultado: Token ID 4
```

**Verificación**:
- ✅ Token ID 4 creado con tipo PT_LOTE
- ✅ Balance del fabricante: 1,000 unidades del lote
- ✅ **Consumo verificado de materias primas** (calculado automáticamente por el contrato):
  - **Paracetamol API (Token 1)**:
    - Balance inicial: 10,000 kg
    - Cantidad consumida: 500g × 1,000 unidades = 500,000g = 500 kg
    - Balance final: 10,000 kg - 500 kg = 9,500 kg ✅
  - **Excipiente (Token 2)**:
    - Balance inicial: 5,000 kg
    - Cantidad consumida: 450g × 1,000 unidades = 450,000g = 450 kg
    - Balance final: 5,000 kg - 450 kg = 4,550 kg ✅
  - **BOM (Token 3)**: No se consume (solo se usa como referencia para la receta)
- ✅ Las cantidades consumidas corresponden exactamente a lo especificado en el BOM (500g + 450g por unidad) multiplicado por el totalSupply del lote (1,000 unidades)
- ✅ El contrato validó automáticamente que había suficientes existencias antes de crear el lote

---

#### Paso 4: Transferencia a Distribuidor

**Actor**: Fabricante → Distribuidor  
**Acción**: Transferir lote completo al distribuidor

```javascript
// Fabricante inicia transferencia
transfer(
  to: "0xDistribuidor...",
  tokenId: 4, // Lote PT-2024-001
  amount: 1000 // Todo el lote
)
// Resultado: Transfer ID 1
```

```javascript
// Distribuidor acepta transferencia
acceptTransfer(transferId: 1)
```

**Verificación**:
- ✅ Transfer ID 1 creado con estado Pending
- ✅ Transfer ID 1 aceptado, estado: Accepted
- ✅ Balance del fabricante: 0 unidades del Token 4
- ✅ Balance del distribuidor: 1,000 unidades del Token 4

---

#### Paso 5: Creación de Unidades Logísticas (SSCC)

**Actor**: Distribuidor  
**Acción**: Crear unidades logísticas (cajas) desde el lote

```javascript
// SSCC 1: Caja con 100 unidades
createToken(
  name: "SSCC-001 - Caja Paracetamol 500mg",
  totalSupply: 1, // Una caja
  features: JSON.stringify({
    "schema_version": "1.0.0",
    "type": "SSCC",
    "labels": {
      "display_name": "SSCC-001 - Caja Paracetamol 500mg"
    },
    "gs1": {
      "sscc": "000123456789012345"
    },
    "packaging": {
      "type": "Caja",
      "quantity": 100
    },
    "contents": [
      {
        "tokenId": 4,
        "batchNumber": "PT-2024-001",
        "quantity": 100
      }
    ],
    "logistics": {
      "shipmentDate": "2024-02-01",
      "origin": {
        "name": "Distribuidor Central"
      },
      "destination": {
        "name": "Minorista A"
      }
    },
    "storage": {
      "condition": "ambient",
      "minTemp": 15,
      "maxTemp": 25
    }
  }),
  tokenType: 3, // SSCC
  parentIds: [4], // Lote PT-2024-001
  parentAmounts: [100], // 100 unidades del lote por cada SSCC
  isRecall: false
)
// Resultado: Token ID 5
```

```javascript
// SSCC 2: Caja con 100 unidades
createToken(
  name: "SSCC-002 - Caja Paracetamol 500mg",
  totalSupply: 1,
  features: JSON.stringify({
    "schema_version": "1.0.0",
    "type": "SSCC",
    "labels": {
      "display_name": "SSCC-002 - Caja Paracetamol 500mg"
    },
    "gs1": {
      "sscc": "000123456789012346"
    },
    "packaging": {
      "type": "Caja",
      "quantity": 100
    },
    "contents": [
      {
        "tokenId": 4,
        "batchNumber": "PT-2024-001",
        "quantity": 100
      }
    ],
    "logistics": {
      "shipmentDate": "2024-02-01",
      "origin": {
        "name": "Distribuidor Central"
      },
      "destination": {
        "name": "Minorista B"
      }
    },
    "storage": {
      "condition": "ambient",
      "minTemp": 15,
      "maxTemp": 25
    }
  }),
  tokenType: 3, // SSCC
  parentIds: [4],
  parentAmounts: [100],
  isRecall: false
)
// Resultado: Token ID 6
```

**Verificación**:
- ✅ Token ID 5 creado (SSCC-001)
- ✅ Token ID 6 creado (SSCC-002)
- ✅ Balance del distribuidor del lote (Token 4): 800 (se consumieron 200)
- ✅ Balance del distribuidor SSCC-001: 1
- ✅ Balance del distribuidor SSCC-002: 1

---

#### Paso 6: Transferencia a Minorista

**Actor**: Distribuidor → Minorista  
**Acción**: Transferir SSCC al minorista

```javascript
// Distribuidor inicia transferencia de SSCC-001
transfer(
  to: "0xMinorista...",
  tokenId: 5, // SSCC-001
  amount: 1
)
// Resultado: Transfer ID 2
```

```javascript
// Minorista acepta transferencia
acceptTransfer(transferId: 2)
```

**Verificación**:
- ✅ Transfer ID 2 aceptado
- ✅ Balance del distribuidor SSCC-001: 0
- ✅ Balance del minorista SSCC-001: 1

---

#### Paso 7: Transferencia a Consumidor

**Actor**: Minorista → Consumidor  
**Acción**: Transferir SSCC al consumidor final

```javascript
// Minorista inicia transferencia
transfer(
  to: "0xConsumidor...",
  tokenId: 5, // SSCC-001
  amount: 1
)
// Resultado: Transfer ID 3
```

```javascript
// Consumidor acepta transferencia
acceptTransfer(transferId: 3)
```

**Verificación**:
- ✅ Transfer ID 3 aceptado
- ✅ Balance del minorista SSCC-001: 0
- ✅ Balance del consumidor SSCC-001: 1

---

#### Paso 8: Creación de Registro de Compliance

**Actor**: Consumidor  
**Acción**: Crear registro de compliance (ej: log de temperatura)

```javascript
createToken(
  name: "Compliance Log - Temperatura SSCC-001",
  totalSupply: 1,
  features: JSON.stringify({
    "schema_version": "1.0.0",
    "type": "COMPLIANCE_LOG",
    "labels": {
      "display_name": "Compliance Log - Temperatura SSCC-001"
    },
    "logType": "TEMP_LOG",
    "ssccTokenId": 5,
    "period": {
      "startDate": "2024-02-01",
      "endDate": "2024-02-05"
    },
    "readings": [
      {
        "timestamp": "2024-02-01T10:00:00Z",
        "value": 18.5,
        "sensorId": "SENSOR-001"
      },
      {
        "timestamp": "2024-02-01T14:00:00Z",
        "value": 20.1,
        "sensorId": "SENSOR-001"
      },
      {
        "timestamp": "2024-02-05T18:00:00Z",
        "value": 22.3,
        "sensorId": "SENSOR-001"
      }
    ],
    "summary": {
      "minTemp": 18.5,
      "maxTemp": 22.3,
      "avgTemp": 20.1,
      "excursions": 0
    },
    "limits": {
      "minAllowed": 15,
      "maxAllowed": 25
    },
    "deviceInfo": {
      "model": "DataLogger Pro",
      "serialNumber": "DL-2024-001"
    },
    "documents": [
      {
        "name": "DataLogger CSV",
        "hash": "0x1234567890abcdef",
        "uri": "ipfs://QmXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx"
      }
    ],
    "parents": {
      "linking_strategy": "single_parent",
      "primary_parent_id": 5
    }
  }),
  tokenType: 4, // COMPLIANCE_LOG
  parentIds: [5], // SSCC-001
  parentAmounts: [],
  isRecall: false
)
// Resultado: Token ID 7
```

**Verificación**:
- ✅ Token ID 7 creado con tipo COMPLIANCE_LOG
- ✅ Balance del consumidor: 1 unidad de compliance log
- ✅ Relación padre-hijo: SSCC-001 → Compliance Log

---

## Caso 2: Flujo con Recall

### Descripción
Flujo que incluye un recall (retiro) de producto, marcando toda la cadena relacionada.

### Actores
- **Fabricante**: `0xFabricante...`
- **Distribuidor**: `0xDistribuidor...`
- **Minorista**: `0xMinorista...`

### Flujo de Ejecución

#### Pasos 1-6: Iguales al Caso 1
(Se asume que ya se ejecutaron los pasos anteriores)

#### Paso 7: Detección de Problema y Creación de Recall

**Actor**: Fabricante  
**Acción**: Crear registro de recall que marca toda la cadena

```javascript
// Se detecta problema en el lote PT-2024-001
createToken(
  name: "Recall - Lote PT-2024-001 - Contaminación",
  totalSupply: 1,
  features: JSON.stringify({
    "schema_version": "1.0.0",
    "type": "COMPLIANCE_LOG",
    "labels": {
      "display_name": "Recall - Lote PT-2024-001 - Contaminación"
    },
    "logType": "RECALL",
    "ptLoteTokenId": 4,
    "recall": {
      "id": "REC-2024-001",
      "class": "I",
      "reason": "Posible contaminación detectada en análisis de control",
      "description": "Se detectó posible contaminación en el lote PT-2024-001 durante análisis de control de calidad. Se requiere retiro inmediato del mercado.",
      "initiatedDate": "2024-02-10",
      "effectiveDate": "2024-02-10"
    },
    "affectedBatches": ["PT-2024-001"],
    "affectedQuantity": {
      "value": 1000,
      "unit": "units"
    },
    "distribution": {
      "regions": ["Región Metropolitana"],
      "distributors": ["Distribuidor Central"]
    },
    "contactInfo": {
      "name": "Dr. María González",
      "email": "contacto@farmaceutica.cl",
      "phone": "+56912345678"
    },
    "regulatoryNotification": {
      "ispNotificationDate": "2024-02-10",
      "ispNotificationNumber": "ISP-REC-2024-001"
    },
    "documents": [
      {
        "name": "Informe de Análisis de Control",
        "hash": "0xabcdef1234567890",
        "uri": "ipfs://QmYyYyYyYyYyYyYyYyYyYyYyYyYyYyYyYyYyYyYyYyYyYyYyYyYyYyYy"
      },
      {
        "name": "Notificación ISP",
        "hash": "0x9876543210fedcba",
        "uri": "ipfs://QmZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZz"
      }
    ],
    "parents": {
      "linking_strategy": "single_parent",
      "primary_parent_id": 4
    }
  }),
  tokenType: 4, // COMPLIANCE_LOG
  parentIds: [4], // Lote PT-2024-001
  parentAmounts: [],
  isRecall: true // IMPORTANTE: Marca como recall
)
// Resultado: Token ID 8
```

**Verificación Automática del Sistema**:
- ✅ Token ID 8 creado como recall
- ✅ **Lote PT-2024-001 (Token 4)**: Marcado como recall
- ✅ **BOM (Token 3)**: Marcado como recall (padre del lote)
- ✅ **Paracetamol API (Token 1)**: Marcado como recall (padre del BOM)
- ✅ **Excipiente (Token 2)**: Marcado como recall (padre del BOM)
- ✅ **SSCC-001 (Token 5)**: Marcado como recall (hijo del lote)
- ✅ **SSCC-002 (Token 6)**: Marcado como recall (hijo del lote)
- ✅ **Compliance Log (Token 7)**: Marcado como recall (hijo del SSCC-001)

**Verificación de Bloqueos**:
- ❌ No se puede transferir Token 4 (lote en recall)
- ❌ No se puede transferir Token 5 (SSCC en recall)
- ❌ No se puede transferir Token 6 (SSCC en recall)
- ❌ No se puede usar Token 4 como padre para crear nuevos SSCC

---

## Caso 3: Múltiples Lotes desde una Receta

### Descripción
Crear múltiples lotes de producto terminado usando la misma receta (BOM).

### Actores
- **Fabricante**: `0xFabricante...`

### Flujo de Ejecución

#### Paso 1: Crear Materias Primas y BOM
(Similar al Caso 1, Pasos 1-2)

#### Paso 2: Crear Múltiples Lotes

**⚠️ Verificación de Consistencia**: Antes de crear los lotes adicionales, verificar materias primas restantes:
- Materias primas disponibles después del Caso 1:
  - Paracetamol API (Token 1): 9,500 kg = 9,500,000g
  - Excipiente (Token 2): 4,550 kg = 4,550,000g
- BOM especifica: 500g de Paracetamol API + 450g de Excipiente por unidad

**Para Lote 1 (500 unidades)**:
- Paracetamol API requerido: 500g × 500 = 250,000g = 250 kg ✅ (hay 9,500 kg)
- Excipiente requerido: 450g × 500 = 225,000g = 225 kg ✅ (hay 4,550 kg)

**Para Lote 2 (750 unidades)**:
- Paracetamol API requerido: 500g × 750 = 375,000g = 375 kg ✅ (habrá 9,250 kg después del Lote 1)
- Excipiente requerido: 450g × 750 = 337,500g = 337.5 kg ✅ (habrá 4,325 kg después del Lote 1)

```javascript
// Lote 1
createToken(
  name: "Lote PT-2024-002 - Paracetamol 500mg",
  totalSupply: 500, // Verificado: hay suficientes materias primas
  features: JSON.stringify({
    "schema_version": "1.0.0",
    "type": "PT_LOTE",
    "labels": {
      "display_name": "Lote PT-2024-002 - Paracetamol 500mg"
    },
    "gs1": {
      "gtin": "07612345678900",
      "ai_10_lote": "PT-2024-002",
      "ai_17_vencimiento": "2026-02-05"
    },
    "isp": {
      "registro_sanitario": "F-12345"
    },
    "uom": "units",
    "parents": {
      "linking_strategy": "bom_parent",
      "primary_parent_id": 3
    },
    "batch": {
      "batchNumber": "PT-2024-002",
      "manufacturingDate": "2024-02-05",
      "expirationDate": "2026-02-05"
    },
    "manufacturer": {
      "name": "Fabricante Farmacéutico S.A.",
      "country": "CL"
    },
    "product": {
      "name": "Paracetamol 500mg Tabletas",
      "genericName": "Paracetamol",
      "dosageForm": "Tableta",
      "strength": "500mg",
      "presentation": "30 comprimidos"
    },
    "storage": {
      "condition": "ambient",
      "minTemp": 15,
      "maxTemp": 25
    },
    "regulatory": {
      "ispRegistration": "F-12345"
    },
    "quantity": {
      "value": 500,
      "unit": "units"
    },
    "bomTokenId": 3
  }),
  tokenType: 2, // PT_LOTE
  parentIds: [3], // Mismo BOM
  parentAmounts: [],
  isRecall: false
)
// Resultado: Token ID 9
```

```javascript
// Lote 2
createToken(
  name: "Lote PT-2024-003 - Paracetamol 500mg",
  totalSupply: 750,
  features: JSON.stringify({
    "schema_version": "1.0.0",
    "type": "PT_LOTE",
    "labels": {
      "display_name": "Lote PT-2024-003 - Paracetamol 500mg"
    },
    "gs1": {
      "gtin": "07612345678900",
      "ai_10_lote": "PT-2024-003",
      "ai_17_vencimiento": "2026-02-06"
    },
    "isp": {
      "registro_sanitario": "F-12345"
    },
    "uom": "units",
    "parents": {
      "linking_strategy": "bom_parent",
      "primary_parent_id": 3
    },
    "batch": {
      "batchNumber": "PT-2024-003",
      "manufacturingDate": "2024-02-06",
      "expirationDate": "2026-02-06"
    },
    "manufacturer": {
      "name": "Fabricante Farmacéutico S.A.",
      "country": "CL"
    },
    "product": {
      "name": "Paracetamol 500mg Tabletas",
      "genericName": "Paracetamol",
      "dosageForm": "Tableta",
      "strength": "500mg",
      "presentation": "30 comprimidos"
    },
    "storage": {
      "condition": "ambient",
      "minTemp": 15,
      "maxTemp": 25
    },
    "regulatory": {
      "ispRegistration": "F-12345"
    },
    "quantity": {
      "value": 750,
      "unit": "units"
    },
    "bomTokenId": 3
  }),
  tokenType: 2, // PT_LOTE
  parentIds: [3], // Mismo BOM
  parentAmounts: [],
  isRecall: false
)
// Resultado: Token ID 10
```

**Verificación**:
- ✅ Token ID 9 creado (Lote 2: 500 unidades)
- ✅ Token ID 10 creado (Lote 3: 750 unidades)
- ✅ Ambos usan el mismo BOM (Token 3)
- ✅ **Consumo acumulado verificado de materias primas**:
  - **Paracetamol API (Token 1)**:
    - Inicial (después del Caso 1): 9,500 kg
    - Consumido Lote 2: 250 kg (500g × 500 unidades)
    - Consumido Lote 3: 375 kg (500g × 750 unidades)
    - **Balance final**: 9,500 - 250 - 375 = 8,875 kg ✅
  - **Excipiente (Token 2)**:
    - Inicial (después del Caso 1): 4,550 kg
    - Consumido Lote 2: 225 kg (450g × 500 unidades)
    - Consumido Lote 3: 337.5 kg (450g × 750 unidades)
    - **Balance final**: 4,550 - 225 - 337.5 = 3,987.5 kg ✅
- ✅ Las cantidades consumidas corresponden exactamente a lo especificado en el BOM multiplicado por el totalSupply de cada lote

---

## Caso 4: Transferencia Rechazada

### Descripción
Flujo donde una transferencia es rechazada por el destinatario.

### Actores
- **Fabricante**: `0xFabricante...`
- **Distribuidor**: `0xDistribuidor...`

### Flujo de Ejecución

#### Paso 1: Crear Lote
(Similar al Caso 1, Pasos 1-3)

#### Paso 2: Iniciar Transferencia

```javascript
// Fabricante inicia transferencia
transfer(
  to: "0xDistribuidor...",
  tokenId: 4, // Lote PT-2024-001
  amount: 1000
)
// Resultado: Transfer ID 4
```

#### Paso 3: Rechazar Transferencia

```javascript
// Distribuidor rechaza transferencia
rejectTransfer(transferId: 4)
```

**Verificación**:
- ✅ Transfer ID 4 creado con estado Pending
- ✅ Transfer ID 4 rechazado, estado: Rejected
- ✅ Balance del fabricante: 1,000 unidades (no cambió)
- ✅ Balance del distribuidor: 0 unidades
- ✅ El fabricante puede intentar otra transferencia

---

## Resumen de Validaciones del Sistema

### Validaciones de Creación de Tokens

1. **API_MP**: No requiere padres
2. **BOM**: Requiere padres de tipo API_MP, no consume componentes (solo define la receta)
3. **PT_LOTE**: 
   - Requiere exactamente 1 padre de tipo BOM
   - Consume componentes de la receta automáticamente
   - **Validación crítica**: Verifica que haya suficientes existencias de cada componente antes de crear el lote
   - La cantidad consumida = `cantidad_componente_en_BOM × totalSupply_PT_LOTE`
   - Si algún componente no tiene suficiente balance, la transacción falla
4. **SSCC**: Requiere exactamente 1 padre de tipo PT_LOTE, consume unidades del lote
5. **COMPLIANCE_LOG**: Puede tener padres, no consume

### Validaciones de Transferencias

1. Solo usuarios aprobados pueden transferir
2. El destinatario debe ser usuario aprobado
3. No se puede transferir tokens en recall
4. No se puede transferir a uno mismo
5. Debe haber balance suficiente

### Validaciones de Recall

1. Un recall marca recursivamente:
   - Todos los padres (hacia arriba en la cadena)
   - Todos los hijos (hacia abajo en la cadena)
2. Tokens en recall no pueden:
   - Ser transferidos
   - Ser usados como padres para crear nuevos tokens
   - Ser consumidos en nuevas operaciones

---

## Datos de Prueba Sugeridos

### Direcciones de Prueba (Anvil)

```
Fabricante:   0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Distribuidor: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Minorista:    0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
Consumidor:   0x90F79bf6EB2c4f870365E785982E1f101E93b906
```

### Valores de Prueba

- **Materias Primas**: Cantidades en kg (1000, 5000, 10000)
- **BOM**: Cantidades en gramos por unidad (500g API, 450g excipiente)
- **PT_LOTE**: Cantidades en unidades de producto (1000, 500, 750)
- **SSCC**: Cantidades en unidades por caja (100 unidades por SSCC)

---

## Notas de Implementación

1. **Conversión de Unidades**: El sistema no convierte unidades automáticamente. Es responsabilidad del usuario mantener consistencia (kg, g, unidades).

2. **Consumo Automático**: 
   - Al crear PT_LOTE desde BOM, se consumen automáticamente los componentes
   - Al crear SSCC desde PT_LOTE, se consumen unidades del lote

3. **Recall Recursivo**: El sistema marca automáticamente toda la cadena relacionada cuando se crea un recall.

4. **Validación de Jerarquía**: El sistema valida que la jerarquía sea correcta:
   - API_MP → BOM → PT_LOTE → SSCC
   - COMPLIANCE_LOG puede referenciar cualquier token

5. **Estructura de JSON Features**: Los JSONs de `features` deben coincidir exactamente con la estructura generada por los builders (`buildApiMpFeatures`, `buildBomFeatures`, etc.) en `frontend/src/builders/pharma.ts`. 
   
   - **API_MP**: Estructura según `ApiMpFeatures`:
     - `type`: "API_MP"
     - `gs1`: objeto con `gtin` (opcional)
     - `batch`: objeto con `batchNumber`, `manufacturingDate`, `expirationDate`
     - `manufacturer`: objeto con `name`, `country`, `gln` (opcional)
     - `substance`: objeto con `name`, `grade`, `casNumber` (opcional), `purity` (opcional)
     - `storage`: objeto con `condition`, `minTemp` (opcional), `maxTemp` (opcional), `lightSensitive` (opcional)
     - `quantity`: objeto con `value`, `unit`
     - `certificates` (opcional): array de strings
     - `ispRegistration` (opcional): string
     - **NO incluye**: `schema_version`, `labels`, `uom` (raíz), `ai_10_lote` en `gs1`
   
   - **BOM**: Estructura según `BomFeatures` con transformación especial:
     - `schema_version`: "1.0.0" (incluido solo en BOM)
     - `type`: "BOM"
     - `labels.display_name`: string (incluido solo en BOM)
     - `parents`: objeto con `linking_strategy`, `primary_parent_id`, `components` (array)
     - `custom`: objeto con `productName`, `version`, `totalYield`, `instructions` (opcional), `ispRegistration` (opcional)
   
   - **PT_LOTE**: Estructura según `PtLoteFeatures`:
     - `type`: "PT_LOTE"
     - `gs1`: objeto con `gtin` (opcional)
     - `batch`: objeto con `batchNumber`, `manufacturingDate`, `expirationDate`
     - `manufacturer`: objeto con `name`, `country`, `gln` (opcional)
     - `product`: objeto con `name`, `genericName` (opcional), `dosageForm`, `strength`, `presentation`
     - `storage`: objeto con `condition`, `minTemp` (opcional), `maxTemp` (opcional), `shelfLife` (opcional)
     - `regulatory`: objeto con `ispRegistration`, `atcCode` (opcional), `prescription` (opcional)
     - `quantity`: objeto con `value`, `unit`
     - `bomTokenId` (opcional): number
     - `qualityRelease` (opcional): objeto con `date`, `responsibleQP`
     - **NO incluye**: `schema_version`, `labels`, `uom` (raíz), `isp.registro_sanitario` (usa `regulatory.ispRegistration`), `parents`
   
   - **SSCC**: Estructura según `SsccFeatures`:
     - `type`: "SSCC"
     - `gs1`: objeto con `sscc` (obligatorio), `gtin` (opcional)
     - `packaging`: objeto con `type`, `quantity`, `grossWeight` (opcional), `netWeight` (opcional), `dimensions` (opcional)
     - `contents`: array de objetos con `tokenId`, `batchNumber`, `quantity`
     - `logistics`: objeto con `shipmentDate` (opcional), `origin`, `destination` (opcional)
     - `storage`: objeto con `condition`, `minTemp` (opcional), `maxTemp` (opcional)
     - **NO incluye**: `schema_version`, `labels`, `parents`
   
   - **COMPLIANCE_LOG**: Estructura según tipo (`TempLogFeatures`, `CapaFeatures`, `RecallFeatures`):
     - `type`: "COMPLIANCE_LOG"
     - `logType`: "TEMP_LOG", "CAPA", o "RECALL"
     - Campos específicos según `logType` (ver interfaces en `frontend/src/types/pharma.ts`)
     - `documents`: array con al menos un elemento (cada elemento tiene `name` requerido, `hash` y `uri` opcionales)
     - `parents`: objeto con `linking_strategy` ("single_parent") y `primary_parent_id` (integer mínimo 1)
     - **NO incluye**: `schema_version`, `labels`
   
   Los JSONs en este documento coinciden exactamente con la estructura generada por los builders de los formularios. Para más detalles, consultar `frontend/src/builders/pharma.ts` y `frontend/src/types/pharma.ts`.

---

## Checklist de Pruebas

- [ ] Crear materias primas (API_MP)
- [ ] Crear receta (BOM) con múltiples componentes
- [ ] Crear lote (PT_LOTE) desde BOM
- [ ] Verificar consumo automático de componentes
- [ ] Transferir lote a distribuidor
- [ ] Crear SSCC desde lote
- [ ] Transferir SSCC a minorista
- [ ] Transferir SSCC a consumidor
- [ ] Crear compliance log
- [ ] Crear recall y verificar marcado recursivo
- [ ] Intentar transferir token en recall (debe fallar)
- [ ] Rechazar transferencia
- [ ] Crear múltiples lotes desde misma receta
- [ ] Verificar balances en cada paso
- [ ] Verificar historial de transferencias

---

*Documento generado para el sistema de tracking de cadena de suministro farmacéutica*

