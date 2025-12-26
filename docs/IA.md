# Retrospectiva del Uso de IA en Supply Chain Tracker

## 2.1. IA Usadas

### Claude (Anthropic) - Claude Opus 4.5
- **Plataforma**: Cursor IDE con integración de Claude
- **Modelo**: Claude Opus 4.5
- **Tipo de interacción**: Pair programming asistido por IA
- **Idioma de interacción**: Español

### Herramientas complementarias utilizadas:
- **Cursor IDE**: Editor de código con integración nativa de IA
- **Terminal integrada**: Para ejecución de comandos (forge, npm, git)

---

## 2.2. Tiempo Consumido Aproximado

### Sesión 1: Setup Inicial (2 de Diciembre, 2024)

#### Smart Contracts (Solidity + Foundry)
| Tarea | Tiempo Estimado |
|-------|-----------------|
| Configuración inicial Foundry | 2 min |
| Instalación de dependencias (forge-std) | 3 min |
| Desarrollo del contrato SupplyChain.sol v1 | 5 min |
| Desarrollo del script de deploy | 1 min |
| Desarrollo de tests (24 tests) | 5 min |
| Compilación y verificación | 2 min |
| **Total Smart Contracts v1** | **~18 minutos** |

#### Frontend (Next.js + TypeScript + Tailwind)
| Tarea | Tiempo Estimado |
|-------|-----------------|
| Configuración proyecto Next.js | 2 min |
| Configuración Tailwind CSS | 2 min |
| Instalación de dependencias (npm install) | 3 min |
| Desarrollo Web3Context | 3 min |
| Desarrollo hook useSupplyChain | 3 min |
| Desarrollo de utilidades (web3Service) | 2 min |
| Desarrollo ABI y tipos (SupplyChain.ts) | 2 min |
| Desarrollo Navbar | 2 min |
| Desarrollo página Home | 3 min |
| Desarrollo página Dashboard | 4 min |
| Desarrollo página Register | 3 min |
| Desarrollo página Products | 5 min |
| Desarrollo página Track | 4 min |
| Estilos globales CSS | 2 min |
| Corrección de errores de TypeScript | 5 min |
| Build y verificación final | 3 min |
| **Total Frontend v1** | **~48 minutos** |

### Sesión 2: Reestructuración del Contrato (3 de Diciembre, 2024)

#### Smart Contracts - Versión 2
| Tarea | Tiempo Estimado |
|-------|-----------------|
| Rediseño completo del contrato con nuevos enums y structs | 10 min |
| Implementación de gestión de usuarios (UserStatus) | 5 min |
| Implementación de gestión de tokens | 5 min |
| Implementación de sistema de transferencias | 8 min |
| Desarrollo de tests completos (50 tests) | 15 min |
| Compilación y verificación | 2 min |
| **Total Smart Contracts v2** | **~45 minutos** |

#### Frontend - Actualización para v2
| Tarea | Tiempo Estimado |
|-------|-----------------|
| Actualización del ABI y tipos TypeScript | 5 min |
| Actualización del hook useSupplyChain | 5 min |
| Actualización página Dashboard | 5 min |
| Actualización página Register | 3 min |
| Actualización página Products | 5 min |
| Actualización página Track | 3 min |
| Nueva página Admin | 5 min |
| Build y verificación | 2 min |
| **Total Frontend v2** | **~33 minutos** |

### Sesión 3: Flujo de Autenticación y Autorización (11 de Diciembre, 2024)

#### Smart Contracts - Modificaciones
| Tarea | Tiempo Estimado |
|-------|-----------------|
| Actualización del script Deploy.s.sol para admin paramétrico | 2 min |
| Redespliegue del contrato | 1 min |
| **Total Smart Contracts v3** | **~3 minutos** |

#### Frontend - Sistema de Autenticación
| Tarea | Tiempo Estimado |
|-------|-----------------|
| Creación componente AccessGate.tsx | 8 min |
| Actualización Navbar.tsx (mostrar rol y estado) | 3 min |
| Integración AccessGate en página Dashboard | 2 min |
| Integración AccessGate en página Products | 2 min |
| Integración AccessGate en página Track | 2 min |
| Integración AccessGate en página Admin | 2 min |
| Eliminación de página Register (funcionalidad migrada) | 1 min |
| Corrección de errores TypeScript | 3 min |
| Build y verificación | 2 min |
| **Total Frontend v3** | **~25 minutos** |

### Sesión 4: Sistema Pharma y Trazabilidad Completa (11 de Diciembre, 2024)

### Sesión 5: Mejoras de UX y Validaciones (15 de Diciembre, 2024)

### Sesión 6: Correcciones y Mejoras Finales (Diciembre 2024)

| Tarea | Tiempo Estimado |
|-------|-----------------|
| Corrección listado destinatarios | 8 min |
| Dashboard con totalizadores | 8 min |
| Restricciones consumidores | 5 min |
| Validación JSON obligatoria | 5 min |
| Corrección visualización BOM | 5 min |
| Corrección bug getUsersByRole | 3 min |
| Build y verificación | 2 min |
| **Total Sesión 6** | **~36 minutos** |

### Sesión 7: Sistema de Múltiples Padres y Descuento de Supply (Diciembre 2024)

#### Cambios en el Contrato
| Tarea | Tiempo Estimado |
|-------|-----------------|
| Cambio de parentId a parentIds[] (array) | 3 min |
| Agregado de parentAmounts[] (array) | 3 min |
| Implementación de enum TokenType | 2 min |
| Implementación de descuento de supply para PT_LOTE | 10 min |
| Función _consumeRecipeComponents | 8 min |
| Actualización de tests (55 tests) | 15 min |
| Compilación y verificación | 2 min |
| **Total Smart Contracts v4** | **~43 minutos** |

#### Cambios en Frontend
| Tarea | Tiempo Estimado |
|-------|-----------------|
| Actualización de tipos TypeScript (Token interface) | 3 min |
| Actualización de ABI del contrato | 3 min |
| Actualización de hook useSupplyChain | 5 min |
| Modificación de CreateTokenWizard para múltiples padres | 8 min |
| Modificación de página Products para múltiples padres | 5 min |
| Actualización de schema JSON (remover type, actualizar parents) | 4 min |
| Actualización de schemaValidator.ts | 5 min |
| Validaciones mejoradas en frontend para PT_LOTE | 8 min |
| Mejora de mensajes de error descriptivos | 5 min |
| Actualización de página Track para múltiples padres | 4 min |
| Build y verificación | 2 min |
| **Total Frontend v4** | **~52 minutos** |

### Resumen Total del Proyecto
| Componente | Sesión 1 | Sesión 2 | Sesión 3 | Sesión 4 | Sesión 5 | Sesión 6 | Sesión 7 | Total |
|------------|----------|----------|----------|----------|----------|----------|----------|-------|
| Smart Contracts | ~18 min | ~45 min | ~3 min | - | - | - | ~43 min | **~109 min** |
| Frontend | ~48 min | ~33 min | ~25 min | ~135 min | ~63 min | ~46 min | ~52 min | **~402 min** |
| Documentación | ~5 min | ~5 min | ~5 min | ~10 min | ~5 min | ~5 min | ~5 min | **~40 min** |
| **TOTAL PROYECTO** | **~71 min** | **~83 min** | **~33 min** | **~145 min** | **~68 min** | **~51 min** | **~100 min** | **~551 min (~9h 11min)** |

#### Sistema de Tokens Farmacéuticos
| Tarea | Tiempo Estimado |
|-------|-----------------|
| Tipos TypeScript para features pharma (pharma.ts) | 8 min |
| Validadores Zod para cada tipo de token | 10 min |
| Builders para generar features JSON | 8 min |
| Formulario API_MP (Materia Prima) | 5 min |
| Formulario BOM (Bill of Materials) | 6 min |
| Formulario PT_LOTE (Producto Terminado) | 6 min |
| Formulario SSCC (Unidad Logística) | 6 min |
| Formulario ComplianceLog (TempLog/CAPA/Recall) | 8 min |
| CreateTokenWizard principal | 10 min |
| Página /tokens/create | 3 min |
| **Total Sistema Pharma** | **~70 minutos** |

#### Mejoras en Trazabilidad
| Tarea | Tiempo Estimado |
|-------|-----------------|
| Función getTokenTransfers en hook | 5 min |
| Función getTokenHierarchy en hook | 5 min |
| Rediseño página Track con pestañas | 10 min |
| Vista de jerarquía visual (árbol) | 8 min |
| Timeline de transferencias | 8 min |
| Detección automática de Token IDs en features | 5 min |
| **Total Trazabilidad** | **~41 minutos** |

#### Panel de Administración Mejorado
| Tarea | Tiempo Estimado |
|-------|-----------------|
| Lista paginada de usuarios (10/50/100) | 8 min |
| Filtro por estado | 3 min |
| Modal de detalle de usuario | 5 min |
| Acciones rápidas de cambio de estado | 3 min |
| **Total Admin** | **~19 minutos** |

#### Correcciones de UI/UX
| Tarea | Tiempo Estimado |
|-------|-----------------|
| Corrección colores de texto en inputs | 2 min |
| Cambio de fondo de página | 2 min |
| Actualización pie de página | 1 min |
| **Total UI/UX** | **~5 minutos** |

#### Mejoras de UX y Validaciones
| Tarea | Tiempo Estimado |
|-------|-----------------|
| Validación JSON con schema (schemaValidator.ts) | 8 min |
| Mejora jerarquía BOM (componentes nivel 0) | 6 min |
| Botón volver en vista de token | 4 min |
| Validación balance con popup | 5 min |
| Dashboard por perfil (Admin/Fabricante/Consumidor) | 12 min |
| Ejemplos de nombres acordes a medicamentos | 2 min |
| ParentId como lista desplegable | 3 min |
| Mostrar perfil en transferencias | 3 min |
| Descripción de type en JSON | 2 min |
| Tokens compliance como sub-nivel | 5 min |
| Combobox de destinatarios filtrado por rol | 8 min |
| Corrección errores Zod (validators/pharma.ts) | 3 min |
| Build y verificación | 2 min |
| **Total Sesión 5** | **~63 minutos** |

### Resumen Total del Proyecto
| Componente | Sesión 1 | Sesión 2 | Sesión 3 | Sesión 4 | Sesión 5 | Sesión 6 | Sesión 7 | Total |
|------------|----------|----------|----------|----------|----------|----------|----------|-------|
| Smart Contracts | ~18 min | ~45 min | ~3 min | - | - | - | ~48 min | **~114 min** |
| Frontend | ~48 min | ~33 min | ~25 min | ~135 min | ~63 min | ~46 min | ~71 min | **~421 min** |
| Documentación | ~5 min | ~5 min | ~5 min | ~10 min | ~5 min | ~5 min | ~5 min | **~40 min** |
| **TOTAL PROYECTO** | **~71 min** | **~83 min** | **~33 min** | **~145 min** | **~68 min** | **~51 min** | **~124 min** | **~575 min (~9h 35min)** |

---

## 2.3. Errores Más Habituales

### Errores en Smart Contracts

#### 1. Instalación de forge-std
```bash
# Error inicial
forge install foundry-rs/forge-std --no-commit
# Error: unexpected argument '--no-commit' found

# Solución: Inicializar git primero
git init && forge install foundry-rs/forge-std
```
**Causa**: La versión de Foundry instalada no soportaba el flag `--no-commit` sin un repositorio git inicializado.

#### 2. Mapping dentro de struct
```solidity
// Error conceptual inicial
struct Token {
    mapping(address => uint256) balance; // No se puede retornar en funciones view
}

// Solución: Separar el mapping del struct
mapping(uint256 => mapping(address => uint256)) private _tokenBalances;
```
**Causa**: Los structs con mappings no pueden ser retornados por funciones.

### Errores en Frontend

#### 1. Fuentes no disponibles en Next.js
```typescript
// Error
import { Geist, Geist_Mono } from 'next/font/google'
// `next/font` error: Unknown font `Geist`

// Solución: Usar fuentes alternativas
import { Inter, JetBrains_Mono } from 'next/font/google'
```

#### 2. Objetos renderizados como React children
```typescript
// Error
<p>{value}</p>  // value puede ser un objeto

// Solución: Verificar tipo antes de renderizar
<p>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</p>
```
**Causa**: Los features JSON del sistema pharma contienen objetos anidados.

#### 3. ChainId incorrecto (MetaMask en red equivocada)
```typescript
// Error: BAD_DATA al llamar funciones del contrato
// Causa: MetaMask conectado a Mainnet (chainId: 1) en lugar de Anvil (31337)

// Solución: Verificación de red + botón para cambiar
if (chainId !== EXPECTED_CHAIN_ID) {
  await switchToAnvilNetwork()
}
```

#### 4. Cuentas sin fondos en Anvil
```bash
# Error: Failed to fetch al enviar transacciones
# Causa: Cuentas importadas no tienen ETH

# Solución: Script de funding
cast send <address> --value 10ether --private-key <anvil-key>
```

### Patrones de Errores Identificados

| Categoría | Frecuencia | Causa Principal |
|-----------|------------|-----------------|
| Tipos TypeScript | Alta | Integración con librerías externas (ethers, MetaMask) |
| Renderizado de objetos | Media | Features JSON con estructura compleja |
| Configuración de red | Media | MetaMask conectado a red incorrecta |
| Fondos insuficientes | Media | Cuentas de prueba sin ETH |
| React Hooks | Media | Dependencias faltantes en arrays de deps |

---

## 2.4. Ficheros de los Chats de la IA

### Ubicación de los Logs
```
~/.cursor/
├── logs/
│   └── [session-logs]
└── projects/
    └── home-bfuentes-Documentos-codecrypto-supply-chain-tracker/
        └── agent-transcripts/
            └── [session-id].txt
```

### Archivos de Sesión
- `chats/session-2024-12-02-supply-chain.md` - Sesión inicial
- `chats/session-2024-12-03-refactor.md` - Sesión de reestructuración

### Métricas Finales del Chat

| Métrica | Sesión 1 | Sesión 2 | Sesión 3 | Sesión 4 | Sesión 5 | Sesión 6 | Sesión 7 | Total |
|---------|----------|----------|----------|----------|----------|----------|----------|-------|
| Prompts del usuario | 2 | 4 | 3 | ~20 | ~12 | ~8 | ~15 | ~64 |
| Archivos creados/modificados | 20+ | 15+ | 8 | 25+ | 10+ | 6+ | 12+ | 78+ |
| Líneas de código generadas | ~3,500 | ~2,000 | ~400 | ~4,000 | ~1,200 | ~600 | ~1,500 | ~13,200 |
| Tests implementados | 24 | 50 | 50 | 50 | 50 | 50 | 55 | 55 (final) |

---

## 2.5. Funcionalidades Implementadas

### Smart Contract (SupplyChain.sol)
- Gestión de usuarios con estados (Pending, Approved, Rejected, Canceled)
- Gestión de tokens con características JSON
- **Enum TokenType**: API_MP, BOM, PT_LOTE, SSCC, COMPLIANCE_LOG
- **Sistema de múltiples padres**: `parentIds[]` y `parentAmounts[]` para tokens con múltiples componentes
- **Sistema de descuento de supply**: Al crear un PT_LOTE, se validan y descuentan automáticamente los componentes de la receta
- Sistema de transferencias con aprobación
- Control de acceso basado en roles
- Admin hardcodeado para red local
- **Enum TokenType** para tipos de token (API_MP, BOM, PT_LOTE, SSCC, COMPLIANCE_LOG)
- **Múltiples padres** por token (parentIds[] y parentAmounts[])
- **Descuento automático de supply** al crear PT_LOTE: valida y descuenta componentes de la receta automáticamente

### Frontend - Páginas
| Página | Descripción |
|--------|-------------|
| `/` | Landing page con información del proyecto |
| `/dashboard` | Panel principal con estadísticas y resumen |
| `/products` | Gestión de tokens (crear, listar, transferir) |
| `/tokens/create` | **Wizard de creación de tokens farmacéuticos** |
| `/track` | **Trazabilidad completa con jerarquía y transferencias** |
| `/admin` | **Panel de administración con lista paginada** |

### Sistema Pharma (Sesión 4)
Tipos de tokens implementados:
1. **API_MP** - Materia Prima / API (Active Pharmaceutical Ingredient)
2. **BOM** - Bill of Materials (receta/composición)
3. **PT_LOTE** - Producto Terminado – Lote
4. **SSCC** - Serial Shipping Container Code (unidad logística)
5. **COMPLIANCE_LOG** - Registros de cumplimiento:
   - TempLog (temperatura)
   - CAPA (acciones correctivas/preventivas)
   - Recall (retiro de producto)

### Validaciones y Mejoras UX (Sesión 5)
- **Validación JSON con schema**: Validación en tiempo real del JSON de features según `features.schema.json`
- **Dashboard por perfil**:
  - Admin: Panel completo sin cambios
  - Fabricante/Distribuidor/Minorista: Pestañas "Mis Tokens", "Recibidas", "Enviadas", "Mi Estado"
  - Consumidor: Pestañas "Mis Tokens", "Recibidas", "Mi Estado" (sin crear tokens)
- **Transferencias mejoradas**:
  - Combobox de destinatarios filtrado por rol según cadena de suministro
  - Validación de balance con popup de error
  - Muestra perfil del destinatario entre paréntesis
- **Mejoras en creación de tokens**:
  - Ejemplos acordes a medicamentos
  - ParentId como lista desplegable de tokens propios

### Correcciones y Mejoras Finales (Sesión 6)
- **Listado de destinatarios corregido**:
  - Admin: Ve todos los usuarios aprobados (excluyendo su propia cuenta)
  - Fabricante: Solo ve distribuidores
  - Distribuidor: Solo ve minoristas
  - Minorista: Solo ve consumidores
  - Formato de visualización: `#número (rol)` en lugar de dirección
- **Dashboard con totalizadores personalizados por rol**:
  - Admin: Total Tokens, Total Usuarios, Total Transferencias, Mi Estado
  - Fabricante/Distribuidor/Retailer: Mis Tokens, Transferencias Enviadas, Transferencias Recibidas, Mi Estado
  - Consumidor: Mis Tokens, Transferencias Recibidas, Mi Estado
- **Restricciones para consumidores**:
  - Enlace "Tokens" oculto en navbar
  - Enlace "+ Crear" oculto en navbar
  - Pestañas "Crear Token" y "Transferir" ocultas en página de productos
  - Redirección automática si intentan acceder a estas opciones
- **Validación obligatoria del campo JSON**:
  - Campo requerido con validación HTML
  - Validación JavaScript de JSON válido
  - Validación de campos mínimos requeridos
  - Botón deshabilitado si no hay JSON válido
- **Corrección visualización componentes BOM**:
  - Componentes BOM ahora se muestran como sub-nivel bajo cada BOM en el árbol de jerarquía
  - Corrección del builder de BOM para generar JSON con estructura correcta (`parents.components`)
- **Corrección bug en getUsersByRole**:
  - Conversión explícita de `user.status` a número antes de comparar con `UserStatus.Approved`

### Características de Trazabilidad
- Vista de jerarquía completa (árbol visual)
- **Componentes BOM mostrados como sub-nivel bajo cada BOM** (materias primas bajo el BOM)
- **Tokens compliance como sub-nivel** en la jerarquía
- Timeline de transferencias cronológico
- Detección automática de Token IDs en features (links navegables)
- **Botón "Volver"** según historial de navegación
- **Descripción de tipos** en JSON (ej: "API_MP (Materia Prima)")
- Filtros por estado en transferencias

---

## 2.6. Estructura Final del Proyecto

```
supply-chain-tracker/
├── sc/                              # Smart Contracts
│   ├── src/SupplyChain.sol          # Contrato principal
│   ├── script/
│   │   ├── Deploy.s.sol             # Script de despliegue
│   │   └── FundAccounts.s.sol       # Script para fondear cuentas
│   └── test/SupplyChain.t.sol       # 50 tests
├── web/                             # Frontend Next.js
│   ├── src/
│   │   ├── app/                     # Páginas (App Router)
│   │   │   ├── admin/               # Panel de administración
│   │   │   ├── dashboard/           # Dashboard principal
│   │   │   ├── products/            # Gestión de productos
│   │   │   ├── tokens/create/       # Wizard de creación
│   │   │   └── track/               # Trazabilidad
│   │   ├── components/
│   │   │   ├── AccessGate.tsx       # Control de acceso
│   │   │   ├── Navbar.tsx           # Navegación
│   │   │   └── tokens/              # Componentes de tokens
│   │   │       ├── CreateTokenWizard.tsx
│   │   │       └── forms/           # Formularios por tipo
│   │   ├── types/pharma.ts          # Tipos TypeScript pharma
│   │   ├── validators/pharma.ts     # Validadores Zod
│   │   ├── builders/pharma.ts       # Constructores de features
│   │   ├── schemas/                 # Schemas JSON
│   │   │   └── features.schema.json # Schema de validación de features
│   │   └── lib/
│   │       ├── errorHandler.ts       # Manejador de errores Web3
│   │       └── schemaValidator.ts   # Validador de JSON schema
│   │   ├── hooks/useSupplyChain.ts  # Hook del contrato
│   │   └── contexts/Web3Context.tsx # Contexto Web3
├── chats/                           # Logs de sesiones IA
├── IA.md                            # Este documento
└── README.md                        # Documentación principal
```

---

## 2.7. Conclusiones

### Aspectos Positivos
1. **Velocidad de desarrollo**: dApp completa funcional en ~5.5 horas
2. **Sistema pharma completo**: Validaciones GS1, múltiples tipos de token
3. **UX de trazabilidad**: Vista visual de jerarquía y timeline de transferencias
4. **Código estructurado**: Separación clara de tipos, validadores y builders
5. **Tests completos**: 50 tests unitarios cubriendo todos los casos

### Áreas de Mejora
1. **Optimización de queries**: Las funciones de trazabilidad iteran todas las transferencias
2. **Eventos del contrato**: Podrían usarse para indexar datos más eficientemente
3. **Cache de datos**: No implementado, cada navegación recarga datos

### Recomendaciones
1. Para producción: usar The Graph para indexar eventos
2. Implementar cache con React Query o SWR
3. Añadir paginación del lado del contrato para transferencias
4. Considerar IPFS para almacenar features JSON grandes

---

## Estadísticas Finales del Proyecto

| Métrica | Valor |
|---------|-------|
| Tiempo total de desarrollo | ~9h 11min |
| Sesiones de desarrollo | 7 |
| Archivos de código creados | 78+ |
| Líneas de código totales | ~13,200+ |
| Tests unitarios | 55 |
| Páginas del frontend | 6 |
| Componentes React | 10+ |
| Hooks personalizados | 1 |
| Contratos Solidity | 1 |
| Tipos de token pharma | 5 |
| Validadores Zod | 8 |

---

## 2.8. Mejoras Implementadas (Sesión 5 - 15 Diciembre, 2024)

### Validaciones
1. **Validación JSON con schema**: Implementado `schemaValidator.ts` que valida el JSON de features según `features.schema.json` antes de crear tokens
2. **Validación de balance**: Popup modal cuando se intenta transferir más de lo disponible

### Mejoras de UX
1. **Dashboard por perfil**: Diferentes vistas según rol (Admin/Fabricante-Distribuidor-Minorista/Consumidor)
2. **Combobox de destinatarios**: Filtrado automático por rol según cadena de suministro (Fabricante→Distribuidor, Distribuidor→Minorista, Minorista→Consumidor)
3. **Botón volver**: Historial de navegación en vista de token
4. **ParentId como lista**: Selector desplegable en lugar de input numérico
5. **Ejemplos mejorados**: Nombres de tokens acordes a medicamentos

### Mejoras Visuales
1. **Jerarquía BOM**: Componentes del BOM mostrados como sub-nivel bajo cada BOM (verde)
2. **Tokens compliance**: Mostrados como sub-nivel (morado) en la jerarquía
3. **Descripción de tipos**: Formato "API_MP (Materia Prima)" en JSON
4. **Perfil en transferencias**: Muestra rol entre paréntesis junto a dirección

### Sesión 7: Sistema de Múltiples Padres y Descuento de Supply (Diciembre 2024 - Enero 2025)

### Sesión 8: Sistema de Recall y Mejoras de Jerarquía (Enero 2025)

#### Cambios en Smart Contracts
| Tarea | Tiempo Estimado |
|-------|-----------------|
| Cambio de parentId a parentIds (array) | 5 min |
| Agregado de enum TokenType | 3 min |
| Implementación de parentAmounts (array) | 5 min |
| Sistema de descuento de supply para PT_LOTE | 15 min |
| Función _consumeRecipeComponents | 8 min |
| Actualización de tests (55 tests) | 10 min |
| Compilación y verificación | 2 min |
| **Total Smart Contracts** | **~48 minutos** |

#### Cambios en Frontend
| Tarea | Tiempo Estimado |
|-------|-----------------|
| Actualización de tipos TypeScript para arrays | 5 min |
| Actualización de ABI y interfaces | 5 min |
| Modificación de CreateTokenWizard para múltiples padres | 10 min |
| Modificación de página Products para múltiples padres | 8 min |
| Validaciones frontend para PT_LOTE | 10 min |
| Validación de componentes disponibles | 12 min |
| Mejoras en errorHandler para mensajes descriptivos | 8 min |
| Actualización de schema JSON (eliminación de type) | 5 min |
| Corrección de referencias parentId → parentIds | 5 min |
| Build y verificación | 3 min |
| **Total Frontend** | **~71 minutos** |

#### Funcionalidades Implementadas
1. **Sistema de múltiples padres**:
   - Cambio de `parentId` (uint256) a `parentIds` (uint256[])
   - Agregado de `parentAmounts` (uint256[]) para almacenar cantidades por padre
   - Soporte para tokens con múltiples componentes padre

2. **Enum TokenType**:
   - Enum en el contrato: API_MP, BOM, PT_LOTE, SSCC, COMPLIANCE_LOG
   - Tipo de token ahora es un parámetro directo del contrato, no solo en JSON

3. **Sistema de descuento de supply para lotes (PT_LOTE)**:
   - Validación automática de componentes disponibles al crear un lote
   - Descuento automático de balances de componentes al crear un lote
   - Cálculo: `cantidadNecesaria = cantidadPorUnidad * cantidadLote`
   - Validación: verifica que todos los componentes tengan suficiente balance antes de descontar
   - Si falta algún componente, la transacción revierte con mensaje descriptivo

4. **Validaciones mejoradas en frontend**:
   - Validación de padre único para PT_LOTE antes de enviar transacción
   - Validación de componentes suficientes antes de crear el lote
   - Mensajes de error descriptivos y específicos

5. **Mensajes de error mejorados**:
   - Parseo mejorado de errores del contrato
   - Mensajes descriptivos para cada validación
   - Feedback inmediato en el frontend antes de enviar transacciones

## 2.9. Correcciones y Mejoras Finales (Sesión 6 - Diciembre 2024)

## 2.10. Sistema de Múltiples Padres y Descuento de Supply (Sesión 7 - Diciembre 2024)

### Cambios en la Estructura del Contrato

1. **Múltiples Padres**:
   - Cambio de `uint256 parentId` a `uint256[] parentIds` en struct Token
   - Agregado de `uint256[] parentAmounts` para almacenar cantidades de cada padre
   - Actualización de función `createToken` para aceptar arrays de padres y cantidades

2. **Enum TokenType**:
   - Implementación de enum `TokenType` con 5 valores: API_MP, BOM, PT_LOTE, SSCC, COMPLIANCE_LOG
   - Agregado `tokenType` al struct Token
   - Validaciones específicas según tipo de token

3. **Descuento Automático de Supply para PT_LOTE**:
   - Cuando se crea un PT_LOTE con una receta (BOM) como padre:
     - Se valida que el padre sea una receta (BOM)
     - Se valida que haya exactamente un padre
     - Se calcula la cantidad necesaria de cada componente: `cantidadPorUnidad * cantidadLote`
     - Se verifica que haya suficientes componentes disponibles
     - Se descuentan automáticamente los balances de los componentes
   - Función interna `_consumeRecipeComponents` implementa toda la lógica de validación y descuento

### Cambios en Frontend

1. **Actualización de Tipos**:
   - Interface `Token` actualizada con `tokenType`, `parentIds[]`, `parentAmounts[]`
   - Helper functions para convertir entre TokenType del contrato (número) y string

2. **Wizard de Creación**:
   - Modificado para permitir agregar múltiples padres con sus cantidades
   - Selector de tipo de token visible
   - UI mejorada para gestionar lista de padres dinámicamente

3. **Validaciones Mejoradas**:
   - Validación en frontend antes de enviar transacción:
     - PT_LOTE debe tener exactamente un padre (receta)
     - Verificación de balances suficientes antes de crear el lote
     - Mensajes descriptivos por cada componente insuficiente
   - Mensajes de error mejorados con información específica

4. **Schema JSON Actualizado**:
   - Removido campo `type` del JSON (ahora es parte del contrato)
   - Simplificada estructura de `parents` en el schema
   - Validador actualizado para no requerir `type` en JSON

### Tests Agregados

5 nuevos tests específicos para el descuento de supply:
- `testCreateLotWithRecipeConsumesComponents`: Verifica consumo correcto de componentes
- `testCreateLotWithInsufficientComponents`: Verifica validación cuando no hay suficientes componentes
- `testCreateLotRequiresBOMAsParent`: Verifica que el padre debe ser BOM
- `testCreateLotRequiresExactlyOneParent`: Verifica que solo puede tener un padre
- `testCreateLotWithMultipleComponents`: Verifica consumo de múltiples componentes

Total: **55 tests** (todos pasando)

### Correcciones de Funcionalidad
1. **Listado de destinatarios corregido**:
   - Implementación correcta de la lógica de filtrado por rol
   - Admin ve todos los usuarios aprobados (excluyendo su propia cuenta)
   - Formato de visualización mejorado: `#número (rol)` en lugar de dirección completa
   - Corrección de bug en comparación de estado de usuario (`getUsersByRole`)

2. **Dashboard con totalizadores personalizados**:
   - Implementación de totalizadores específicos por rol
   - Admin: Mantiene totalizadores globales
   - Productores (Fabricante/Distribuidor/Retailer): Totalizadores personales
   - Consumidor: Totalizadores limitados (sin transferencias enviadas)

3. **Restricciones de acceso para consumidores**:
   - Ocultación de enlaces "Tokens" y "+ Crear" en navbar
   - Ocultación de pestañas "Crear Token" y "Transferir" en página de productos
   - Redirección automática si intentan acceder a opciones no permitidas

4. **Validación obligatoria del campo JSON**:
   - Campo marcado como requerido en HTML
   - Validación JavaScript de JSON válido
   - Validación de campos mínimos requeridos (type, labels.display_name)
   - Botón deshabilitado con mensajes claros cuando no hay JSON válido

5. **Corrección de visualización de componentes BOM**:
   - Componentes BOM ahora se muestran como sub-nivel bajo cada BOM (no como nivel 0)
   - Corrección del builder de BOM para generar JSON con estructura correcta (`parents.components`)
   - Soporte para formatos antiguos y nuevos en la función de extracción

### Mejoras Técnicas
1. **Corrección de comparación de estado**: Conversión explícita de `user.status` a número antes de comparar con enum
2. **Logs de depuración**: Agregados para facilitar diagnóstico de problemas
3. **Código más robusto**: Mejoras en manejo de errores y validaciones

---

## 2.11. Funcionalidades de Descuento de Supply (Sesión 7)

### Descuento Automático al Crear Lotes (PT_LOTE)

Cuando se crea un token de tipo PT_LOTE:
1. **Validaciones**:
   - Debe tener exactamente un padre (receta/BOM)
   - El padre debe ser una receta (BOM), no otro tipo de token
   - Se calcula la cantidad necesaria de cada componente: `cantidadPorUnidad * cantidadLote`
   - Se verifica que haya suficientes componentes disponibles

2. **Descuento Automático**:
   - Si todas las validaciones pasan, se descuentan automáticamente los balances de todos los componentes
   - El descuento se hace del balance del creador del lote
   - La transacción revierte si algún componente es insuficiente

3. **Mensajes de Error Descriptivos**:
   - Frontend valida antes de enviar la transacción
   - Muestra mensajes específicos indicando qué componente falta y cuánto se necesita vs. cuánto hay disponible
   - Mensajes del contrato parseados y traducidos a mensajes amigables

### Validaciones en Frontend

- Validación previa a la transacción para PT_LOTE
- Cálculo de componentes necesarios antes de crear el lote
- Verificación de balances disponibles
- Mensajes descriptivos por cada componente insuficiente

---

## 2.10. Sistema de Múltiples Padres y Descuento de Supply (Sesión 7 - Diciembre 2024/Enero 2025)

### Cambios Principales

1. **Estructura de tokens con múltiples padres**:
   - **Antes**: `parentId: uint256` (solo un padre)
   - **Ahora**: `parentIds: uint256[]` y `parentAmounts: uint256[]` (múltiples padres con cantidades)

2. **Enum TokenType en el contrato**:
   - Tipo de token ahora es un parámetro directo del contrato
   - Enum: API_MP, BOM, PT_LOTE, SSCC, COMPLIANCE_LOG
   - Eliminado del JSON de features (solo para compatibilidad hacia atrás)

3. **Sistema de descuento automático de supply**:
   - Al crear un PT_LOTE que tiene como padre una receta (BOM)
   - El sistema valida que hay suficientes componentes antes de crear el lote
   - Calcula: `cantidadNecesaria = cantidadPorUnidad * cantidadLote` para cada componente
   - Si falta algún componente, revierte con mensaje descriptivo
   - Si todo está bien, descuenta automáticamente los balances de todos los componentes

4. **Validaciones mejoradas en frontend**:
   - Validación de padre único para PT_LOTE antes de enviar transacción
   - Validación de componentes suficientes consultando balances antes de crear el lote
   - Mensajes de error descriptivos que muestran qué componente falta y cuánto se necesita

5. **Mensajes de error descriptivos**:
   - Parseo mejorado de errores del contrato
   - Mensajes específicos para cada validación
   - Feedback inmediato en el frontend con detalles del problema

### Funcionalidades Específicas

#### Función `_consumeRecipeComponents`
```solidity
// Valida y descuenta componentes de una receta al crear un lote
function _consumeRecipeComponents(Token memory recipe, uint256 lotAmount, address consumer) internal
```

Esta función:
1. Valida que hay suficientes componentes para cada uno
2. Si alguno falta, revierte con mensaje claro
3. Si todo está bien, descuenta los balances automáticamente

#### Validaciones en Frontend
- Verificación de padre único (PT_LOTE debe tener exactamente un padre)
- Verificación de que el padre sea una receta (BOM)
- Cálculo y verificación de componentes disponibles antes de crear el lote
- Mensajes descriptivos que indican qué componente falta y cuánto se necesita

## 2.12. Sistema de Recall y Mejoras de Jerarquía (Sesión 8 - Enero 2025)

### Cambios en Smart Contracts

| Tarea | Tiempo Estimado |
|-------|-----------------|
| Agregado campo `recall` (bool) al struct Token | 2 min |
| Implementación de validación de recall solo para COMPLIANCE_LOG | 3 min |
| Implementación de marcado de cadena de suministro como retirada | 8 min |
| Validación de que tokens retirados no se puedan usar como padres | 3 min |
| Bloqueo de transferencias de tokens retirados | 2 min |
| Corrección de tests (expectEmit con 4 parámetros) | 5 min |
| Corrección de test testCreateTokenByRetailer para SSCC | 5 min |
| Compilación y verificación | 2 min |
| **Total Smart Contracts** | **~30 minutos** |

### Cambios en Frontend

| Tarea | Tiempo Estimado |
|-------|-----------------|
| Actualización de tipos TypeScript (campo recall) | 2 min |
| Actualización de ABI del contrato | 3 min |
| Agregado checkbox de recall en products/page.tsx | 5 min |
| Implementación de popup de advertencia para recall | 8 min |
| Agregado indicador "Retirado" en dashboard | 3 min |
| Agregado indicador "Retirado" en track (info) | 3 min |
| Agregado indicador "Retirado" en jerarquía | 3 min |
| Implementación de icono de información para consumidores | 8 min |
| Popup explicativo para consumidores sobre productos retirados | 10 min |
| Mejora de jerarquía para mostrar múltiples padres en mismo nivel (BFS) | 8 min |
| Actualización de getTokenHierarchy para mapear campo recall | 2 min |
| Build y verificación | 2 min |
| **Total Frontend** | **~57 minutos** |

### Funcionalidades Implementadas

1. **Sistema de Recall (Retiro de Productos)**:
   - Campo `recall: bool` agregado al struct Token
   - Validación: recall solo válido para tokens COMPLIANCE_LOG
   - Validación: recall debe tener exactamente un padre
   - Marcado automático de toda la cadena de suministro relacionada como retirada
   - Bloqueo de transferencias de tokens retirados
   - Bloqueo de uso de tokens retirados como padres

2. **Interfaz de Usuario para Recall**:
   - Checkbox de recall visible solo para COMPLIANCE_LOG
   - Popup de advertencia antes de crear token con recall
   - Indicador visual "Retirado" en todas las vistas:
     - Dashboard (lista de tokens)
     - Página de productos (lista de tokens)
     - Vista de información del token
     - Árbol de jerarquía
   - Icono de información para consumidores:
     - Aparece junto al badge "Retirado" solo para usuarios consumidores
     - Popup explicativo con pasos a seguir
     - Mensaje claro pero no alarmista

3. **Mejoras en Visualización de Jerarquía**:
   - Implementación de BFS (Breadth-First Search) para construir jerarquía
   - Todos los padres de un token se muestran en el mismo nivel
   - Especialmente útil para BOMs con múltiples padres (materias primas)
   - Indicadores visuales cuando hay múltiples padres en el mismo nivel

4. **Correcciones de Tests**:
   - Corrección de `expectEmit` para usar 4 parámetros booleanos
   - Corrección de `testCreateTokenByRetailer` para crear SSCC con padre PT_LOTE válido
   - Todos los 55 tests pasando correctamente

### Resumen de Sesión 8

| Componente | Tiempo |
|------------|--------|
| Smart Contracts | ~30 min |
| Frontend | ~57 min |
| Documentación | ~5 min |
| **Total Sesión 8** | **~92 minutos** |

### Resumen Total Actualizado

| Componente | Sesión 1 | Sesión 2 | Sesión 3 | Sesión 4 | Sesión 5 | Sesión 6 | Sesión 7 | Sesión 8 | Total |
|------------|----------|----------|----------|----------|----------|----------|----------|----------|-------|
| Smart Contracts | ~18 min | ~45 min | ~3 min | - | - | - | ~43 min | ~30 min | **~139 min** |
| Frontend | ~48 min | ~33 min | ~25 min | ~135 min | ~63 min | ~46 min | ~52 min | ~57 min | **~454 min** |
| Documentación | ~5 min | ~5 min | ~5 min | ~10 min | ~5 min | ~5 min | ~5 min | ~5 min | **~45 min** |
| **TOTAL PROYECTO** | **~71 min** | **~83 min** | **~33 min** | **~145 min** | **~68 min** | **~51 min** | **~100 min** | **~92 min** | **~643 min (~10h 43min)** |

### Estadísticas Finales Actualizadas

| Métrica | Valor |
|---------|-------|
| Tiempo total de desarrollo | ~10h 43min |
| Sesiones de desarrollo | 8 |
| Archivos de código creados | 80+ |
| Líneas de código totales | ~14,000+ |
| Tests unitarios | 55 (todos pasando) |
| Páginas del frontend | 6 |
| Componentes React | 10+ |
| Hooks personalizados | 1 |
| Contratos Solidity | 1 |
| Tipos de token pharma | 5 |
| Validadores Zod | 8 |
| Funcionalidades principales | Sistema completo de trazabilidad, múltiples padres, descuento de supply, sistema de recall |

---

## 2.13. Sistema MCP (Model Context Protocol) y Herramientas Foundry (Diciembre 2024 - Enero 2025)

### Cambios en Backend

| Tarea | Tiempo Estimado |
|-------|-----------------|
| Creación de servidor Express para APIs MCP (puerto 3001) | 15 min |
| Implementación de endpoints Foundry (forge/build, forge/test) | 10 min |
| Implementación de endpoint anvil/restart (reemplazo de start/stop) | 20 min |
| Implementación de endpoints cast/call y cast/send | 15 min |
| Implementación de endpoint health | 8 min |
| Funciones de sanitización y validación (foundryTools.ts) | 12 min |
| Corrección de sanitización para permitir paréntesis en firmas de función | 8 min |
| Scripts de inicio (start-mcp-api.sh, start-tools.sh) | 5 min |
| Documentación DATOS_PRUEBA_CAST.md | 10 min |
| **Total Backend** | **~103 minutos** |

### Cambios en Frontend

| Tarea | Tiempo Estimado |
|-------|-----------------|
| Creación de página /tools para interfaz MCP (integradas en puerto 3000) | 25 min |
| Implementación de componentes UI para cada herramienta | 20 min |
| Integración de llamadas a API MCP | 15 min |
| Mejoras de UI para mostrar resultados detallados | 12 min |
| Actualización de anvil/start y anvil/stop a anvil/restart | 8 min |
| **Total Frontend** | **~80 minutos** |

### Funcionalidades Implementadas

1. **Sistema MCP (Model Context Protocol)**:
   - Servidor Express.js separado en puerto 3001 para APIs MCP
   - Frontend Next.js integrado en puerto 3000 (dApp en /, Tools en /tools)
   - Arquitectura: dApp + Tools (3000), API MCP (3001)

2. **Endpoints de API MCP**:
   - `GET /health`: Verifica estado de herramientas Foundry y Anvil
   - `POST /forge/build`: Compila smart contracts
   - `POST /forge/test`: Ejecuta tests con verbosidad configurable
   - `POST /anvil/restart`: Reinicia Anvil (detiene todos los procesos y inicia uno nuevo)
   - `POST /cast/call`: Ejecuta llamadas de solo lectura a contratos
   - `POST /cast/send`: Envía transacciones a contratos

3. **Características de Seguridad**:
   - Validación de inputs con Zod
   - Sanitización de argumentos con allowlist
   - Ejecución segura con `execFile` (no `exec`)
   - Validación de comandos permitidos

4. **Mejoras en Gestión de Anvil**:
   - Reemplazo de `anvil/start` y `anvil/stop` por `anvil/restart`
   - Detención agresiva de todos los procesos Anvil antes de reiniciar
   - Verificación de procesos zombies y no responsivos
   - Detección de reinicios automáticos y advertencias al usuario

5. **Correcciones en Cast Call/Send**:
   - Corrección de sanitización para permitir paréntesis en firmas de función
   - Soporte para argumentos de función (`args` array)
   - Mejor manejo de arrays vacíos y con valores

6. **Documentación**:
   - `DATOS_PRUEBA_CAST.md`: Guía completa con ejemplos para cast call/send
   - `web/src/app/api/tools/README.md`: Documentación de APIs
   - `web/src/app/tools/README.md`: Documentación del frontend de herramientas

### Resumen de Sesión 9

| Componente | Tiempo |
|------------|--------|
| Backend (APIs MCP) | ~103 min |
| Frontend (Interfaz Tools) | ~80 min |
| Documentación | ~10 min |
| **Total Sesión 9** | **~193 minutos (~3h 13min)** |

### Resumen Total Actualizado

| Componente | Sesión 1 | Sesión 2 | Sesión 3 | Sesión 4 | Sesión 5 | Sesión 6 | Sesión 7 | Sesión 8 | Sesión 9 | Total |
|------------|----------|----------|----------|----------|----------|----------|----------|----------|----------|-------|
| Smart Contracts | ~18 min | ~45 min | ~3 min | - | - | - | ~43 min | ~30 min | - | **~139 min** |
| Frontend | ~48 min | ~33 min | ~25 min | ~135 min | ~63 min | ~46 min | ~52 min | ~57 min | ~80 min | **~534 min** |
| Backend/APIs | - | - | - | - | - | - | - | - | ~103 min | **~103 min** |
| Documentación | ~5 min | ~5 min | ~5 min | ~10 min | ~5 min | ~5 min | ~5 min | ~5 min | ~10 min | **~55 min** |
| **TOTAL PROYECTO** | **~71 min** | **~83 min** | **~33 min** | **~145 min** | **~68 min** | **~51 min** | **~100 min** | **~92 min** | **~193 min** | **~836 min (~13h 56min)** |

### Estadísticas Finales Actualizadas

| Métrica | Valor |
|---------|-------|
| Tiempo total de desarrollo | ~13h 56min |
| Sesiones de desarrollo | 9 |
| Archivos de código creados | 90+ |
| Líneas de código totales | ~16,000+ |
| Tests unitarios | 55 (todos pasando) |
| Páginas del frontend | 7 (incluye /tools) |
| Componentes React | 12+ |
| Hooks personalizados | 1 |
| Contratos Solidity | 1 |
| APIs REST | 6 endpoints |
| Tipos de token pharma | 5 |
| Validadores Zod | 8 |
| Funcionalidades principales | Sistema completo de trazabilidad, múltiples padres, descuento de supply, sistema de recall, MCP Tools |

---

## 2.14. Asistente de IA Integrado (Enero 2025)

### Cambios en Backend

| Tarea | Tiempo Estimado |
|-------|-----------------|
| Creación de endpoint `/api/assistant` para integración con Ollama | 20 min |
| Implementación de herramientas (tools) para LLM | 15 min |
| Implementación de funciones de consulta (get_token_status, get_user_info, list_all_users) | 25 min |
| Implementación de funciones de acción (change_user_status, create_token, transfer_token) | 30 min |
| Implementación de funciones de transferencias (accept_transfer, reject_transfer) | 15 min |
| Mejora de prompt del sistema con información completa | 20 min |
| Manejo de errores y timeouts | 15 min |
| Endpoint de confirmación para transacciones (`/api/assistant/confirm`) | 20 min |
| **Total Backend** | **~160 minutos** |

### Cambios en Frontend

| Tarea | Tiempo Estimado |
|-------|-----------------|
| Creación de componente FloatingAssistantChat | 25 min |
| Integración en layout global | 5 min |
| Mejoras de UI (ancho del chat, animaciones) | 10 min |
| Manejo de confirmaciones de transacciones | 15 min |
| **Total Frontend** | **~55 minutos** |

### Funcionalidades Implementadas

1. **Asistente de IA con Ollama**:
   - Integración con Ollama para procesamiento de lenguaje natural
   - Chat flotante disponible en todas las páginas
   - Interfaz moderna con animaciones

2. **Herramientas de Consulta**:
   - `get_token_status`: Información completa de tokens por ID
   - `list_all_tokens`: Lista todos los tokens con filtrado
   - `get_user_info`: Información de usuarios por dirección
   - `list_all_users`: Lista todos los usuarios con filtrado
   - `get_transfer_info`: Información de transferencias por ID
   - `list_all_transfers`: Lista todas las transferencias
   - `get_user_tokens`: Tokens de un usuario específico
   - `get_user_transfers`: Transferencias de un usuario
   - `get_system_stats`: Estadísticas generales del sistema

3. **Herramientas de Acción** (requieren confirmación):
   - `change_user_status`: Cambiar estado de usuarios (solo admin)
   - `create_token`: Crear tokens de cualquier tipo
   - `transfer_token`: Crear solicitudes de transferencia
   - `accept_transfer`: Aceptar transferencias pendientes
   - `reject_transfer`: Rechazar transferencias pendientes

4. **Capacidades del Asistente**:
   - Consultas sobre usuarios, tokens, transferencias
   - Búsquedas con múltiples criterios (rol Y estado, tipo Y recall, etc.)
   - Explicaciones del funcionamiento del sistema
   - Ejecución de acciones sobre el contrato
   - Mantenimiento de contexto de conversación
   - Manejo inteligente de referencias ("este usuario", "esta transferencia")

5. **Mejoras en Manejo de Errores**:
   - Timeout de 60 segundos para llamadas a Ollama
   - Detección de errores de conexión
   - Mensajes de error descriptivos
   - Health check opcional de Ollama

### Resumen de Sesión 10

| Componente | Tiempo |
|------------|--------|
| Backend (API Assistant) | ~160 min |
| Frontend (FloatingAssistantChat) | ~55 min |
| Documentación | ~10 min |
| **Total Sesión 10** | **~225 minutos (~3h 45min)** |

---

## 2.15. Corrección del Flujo de Confirmación con MetaMask (Enero 2025)

### Cambios en Backend

| Tarea | Tiempo Estimado |
|-------|-----------------|
| Corrección de conversión de tipos (newStatus string → number) | 15 min |
| Normalización de campos (address/userAddress) | 20 min |
| Validación temprana en executeTool | 15 min |
| Mejoras en SYSTEM_PROMPT para aprobación de usuarios | 10 min |
| Simplificación del endpoint /api/assistant/confirm | 20 min |
| **Total Backend** | **~80 minutos** |

### Cambios en Frontend

| Tarea | Tiempo Estimado |
|-------|-----------------|
| Integración con MetaMask en FloatingAssistantChat | 30 min |
| Manejo de errores de MetaMask | 10 min |
| Mejoras en mensajes de éxito/error | 10 min |
| **Total Frontend** | **~50 minutos** |

### Problemas Resueltos

1. **Error "Estado inválido"**: El LLM enviaba `newStatus` como string. Solución: conversión automática de tipos.

2. **Error "Dirección de usuario inválida"**: El LLM no proporcionaba correctamente la dirección. Solución: normalización de campos y validación temprana.

3. **Error "Solo el admin puede ejecutar esta funcion"**: El servidor firmaba con clave privada incorrecta. Solución: integración completa con MetaMask para firmar transacciones.

### Funcionalidades Implementadas

1. **Normalización de Tipos**:
   - Conversión automática de strings a números para parámetros comunes
   - Validación de tipos antes de ejecutar herramientas

2. **Normalización de Campos**:
   - Acepta `address` o `userAddress` en `change_user_status`
   - Conversión automática de `address` → `userAddress`

3. **Validación Temprana**:
   - Validación en `executeTool` antes de requerir confirmación
   - Mensajes de error descriptivos con hints

4. **Integración con MetaMask**:
   - Transacciones firmadas con la cuenta conectada del usuario
   - Manejo de errores específicos de MetaMask
   - Mensajes de éxito con hash y gas usado

### Resumen de Sesión 11

| Componente | Tiempo |
|------------|--------|
| Backend (Correcciones y mejoras) | ~80 min |
| Frontend (Integración MetaMask) | ~50 min |
| Documentación | ~5 min |
| **Total Sesión 11** | **~135 minutos (~2h 15min)** |

### Resumen Total Actualizado

| Componente | Sesión 1 | Sesión 2 | Sesión 3 | Sesión 4 | Sesión 5 | Sesión 6 | Sesión 7 | Sesión 8 | Sesión 9 | Sesión 10 | Sesión 11 | Total |
|------------|----------|----------|----------|----------|----------|----------|----------|----------|----------|-----------|-----------|-------|
| Smart Contracts | ~18 min | ~45 min | ~3 min | - | - | - | ~43 min | ~30 min | - | - | - | **~139 min** |
| Frontend | ~48 min | ~33 min | ~25 min | ~135 min | ~63 min | ~46 min | ~52 min | ~57 min | ~80 min | ~55 min | ~50 min | **~639 min** |
| Backend/APIs | - | - | - | - | - | - | - | - | ~103 min | ~160 min | ~80 min | **~343 min** |
| Documentación | ~5 min | ~5 min | ~5 min | ~10 min | ~5 min | ~5 min | ~5 min | ~5 min | ~10 min | ~10 min | ~5 min | **~70 min** |
| **TOTAL PROYECTO** | **~71 min** | **~83 min** | **~33 min** | **~145 min** | **~68 min** | **~51 min** | **~100 min** | **~92 min** | **~193 min** | **~225 min** | **~135 min** | **~1,196 min (~19h 56min)** |

### Estadísticas Finales Actualizadas

| Métrica | Valor |
|---------|-------|
| Tiempo total de desarrollo | ~19h 56min |
| Sesiones de desarrollo | 11 |
| Archivos de código creados | 100+ |
| Líneas de código totales | ~18,500+ |
| Tests unitarios | 55 (todos pasando) |
| Páginas del frontend | 7 (incluye /tools) |
| Componentes React | 13+ |
| Hooks personalizados | 1 |
| Contratos Solidity | 1 |
| APIs REST | 8 endpoints (6 MCP + 2 Assistant) |
| Tipos de token pharma | 5 |
| Validadores Zod | 8 |
| Herramientas de IA | 9 herramientas |
| Funcionalidades principales | Sistema completo de trazabilidad, múltiples padres, descuento de supply, sistema de recall, MCP Tools, Asistente de IA con MetaMask |

---

---

## 2.16. Debugging y Optimización del Servidor MCP Foundry (Diciembre 2024 - Enero 2025)

### Problema Identificado

El servidor MCP para Foundry Tools experimentaba errores recurrentes `ENOENT` al ejecutar comandos `forge_test` y `forge_build` desde Claude Desktop, aunque `health_check` funcionaba correctamente.

**Observación clave**: 
- ✅ `health_check` funciona usando `execFileAsync` sin `cwd`
- ❌ `forge_test`/`forge_build` fallaban con múltiples estrategias (`execFile`, `spawn`, `exec`)

### Estrategias Implementadas

#### 1. Logging Detallado
- Implementado sistema de logging con `DEBUG_FOUNDRY=true`
- Logs detallados de rutas, PATH, argumentos, y estadísticas de binarios
- Diagnóstico mejorado de errores ENOENT

#### 2. Verificación Robusta de Rutas
- Resolución de symlinks con `realpath()`
- Verificación de tipo de archivo (no directorio)
- Verificación de permisos de ejecución (`X_OK`)
- Validación del cache antes de usar

#### 3. Fallback Inteligente
- Fallback a `~/.foundry/bin/tool` si la ruta encontrada falla
- Actualización automática del cache con rutas correctas
- Limpieza automática de cache en errores

#### 4. Estrategia Final: Replicar health_check
- **Solución**: Replicar exactamente el entorno de `health_check`
- Si se especifica `cwd` explícitamente → usarlo directamente
- Si NO se especifica `cwd` → intentar sin `cwd` primero (como `health_check`)
- Mismo `env` que `health_check`: `{ ...process.env, PATH: \`${HOME}/.foundry/bin:${PATH}\` }`

### Cambios en Código

**Archivo**: `web/src/lib/foundryTools.ts`

1. **Mejoras en `findFoundryBinary()`**:
   - Verificación de cache con validación de existencia
   - Verificación de tipo de archivo (no directorio)
   - Verificación de permisos de ejecución

2. **Mejoras en `executeFoundryCommand()`**:
   - Lógica condicional para `cwd`:
     - Si `options.cwd` está especificado → usar directamente
     - Si no → intentar sin `cwd` primero, luego con `cwd` como fallback
   - Entorno replicado de `health_check`
   - Fallback a `exec()` con shell si `execFileAsync` falla

### Resumen de Sesión 12

| Componente | Tiempo |
|------------|--------|
| Análisis del problema | ~30 min |
| Implementación de estrategias | ~90 min |
| Testing y correcciones | ~60 min |
| Documentación | ~20 min |
| **Total Sesión 12** | **~200 minutos (~3h 20min)** |

### Resumen Total Actualizado

| Componente | Sesión 1-11 | Sesión 12 | Total |
|------------|-------------|-----------|-------|
| Smart Contracts | ~139 min | - | **~139 min** |
| Frontend | ~639 min | - | **~639 min** |
| Backend/APIs | ~343 min | ~200 min | **~543 min** |
| Documentación | ~70 min | ~20 min | **~90 min** |
| **TOTAL PROYECTO** | **~1,196 min** | **~220 min** | **~1,416 min (~23h 36min)** |

### Estadísticas Finales Actualizadas

| Métrica | Valor |
|---------|-------|
| Tiempo total de desarrollo | ~23h 36min |
| Sesiones de desarrollo | 12 |
| Archivos de código creados | 100+ |
| Líneas de código totales | ~19,000+ |
| Tests unitarios | 55 (todos pasando) |
| Páginas del frontend | 7 (incluye /tools) |
| Componentes React | 13+ |
| Hooks personalizados | 1 |
| Contratos Solidity | 1 |
| APIs REST | 8 endpoints (6 MCP + 2 Assistant) |
| Servidor MCP | 1 (11 herramientas Foundry) |
| Tipos de token pharma | 5 |
| Validadores Zod | 8 |
| Herramientas de IA | 9 herramientas |
| Funcionalidades principales | Sistema completo de trazabilidad, múltiples padres, descuento de supply, sistema de recall, MCP Tools, Asistente de IA con MetaMask |

### Lecciones Aprendidas

1. **Importancia del entorno**: Diferencias sutiles en `cwd` y `env` pueden causar fallos
2. **Replicar estrategias exitosas**: Si algo funciona, replicarlo exactamente
3. **Debugging sistemático**: Logging detallado es esencial para diagnosticar problemas complejos
4. **Múltiples estrategias**: Tener fallbacks robustos mejora la confiabilidad

---

## 2.17. Configuración de Claude Desktop y Servidor MCP (Enero 2025)

### Problema Identificado

Claude Desktop no podía ejecutar comandos Foundry (especialmente `forge test`) debido a restricciones de `spawn` con `execFileAsync` y problemas con la resolución del directorio `contracts/`.

### Cambios Implementados

#### 1. Resolución Dinámica de Directorio Contracts

**Archivo**: `backend/src/lib/foundryTools.ts`

- Implementación de función `resolveContractsDir()` que busca dinámicamente el directorio `contracts/` navegando hacia arriba hasta encontrar `foundry.toml`
- Soporte para variable de entorno `CONTRACTS_DIR` para especificación explícita
- Función `getContractsDir()` con cache para evitar búsquedas repetidas
- Validación que el directorio contiene `foundry.toml` antes de usarlo

#### 2. Estrategia de Ejecución Robusta

**Cambio principal**: Replicar la estrategia exitosa de `health_check`

- **Antes**: Usaba `execFileAsync` con `cwd` en opciones, causaba errores `ENOENT` en Claude Desktop
- **Ahora**: Usa `exec()` con comando completo que incluye `cd` antes del comando, evitando problemas con `spawn`
- Especificación explícita de `shell: '/bin/bash'` para asegurar PATH correcto
- Mismo entorno mejorado (`getEnhancedEnv()`) usado en todas las ejecuciones

**Código clave**:
```typescript
// Antes (fallaba)
execFileAsync(forgePath, ['test'], { cwd: '/path/to/contracts' })

// Ahora (funciona)
execAsync(`cd "/path/to/contracts" && ${forgePath} test`, { 
  shell: '/bin/bash',
  env: enhancedEnv 
})
```

#### 3. Configuración de Claude Desktop

**Archivo**: `claude_desktop_config.json` (documentado en `docs/claude-desktop-config.md`)

- Variables de entorno completas: `PATH`, `HOME`, `USER`, `NODE_ENV`, `SHELL`, `CONTRACTS_DIR`
- PATH expandido incluyendo rutas de Foundry, Node.js y sistema
- `cwd` configurado como directorio `backend/` del proyecto

#### 4. Documentación

- Creación de `docs/claude-desktop-config.md` con guía completa de configuración
- Instrucciones paso a paso para instalación
- Sección de solución de problemas detallada
- Explicación de arquitectura técnica

### Resumen de Sesión 13

| Componente | Tiempo |
|------------|--------|
| Análisis del problema | ~30 min |
| Implementación de resolución dinámica | ~45 min |
| Refactorización de estrategia de ejecución | ~60 min |
| Configuración y pruebas | ~40 min |
| Documentación | ~25 min |
| **Total Sesión 13** | **~200 minutos (~3h 20min)** |

### Resumen Total Actualizado

| Componente | Sesión 1-12 | Sesión 13 | Total |
|------------|-------------|-----------|-------|
| Smart Contracts | ~139 min | - | **~139 min** |
| Frontend | ~639 min | - | **~639 min** |
| Backend/APIs | ~543 min | ~200 min | **~743 min** |
| Documentación | ~90 min | ~25 min | **~115 min** |
| **TOTAL PROYECTO** | **~1,416 min** | **~225 min** | **~1,641 min (~27h 21min)** |

### Estadísticas Finales Actualizadas

| Métrica | Valor |
|---------|-------|
| Tiempo total de desarrollo | ~27h 21min |
| Sesiones de desarrollo | 13 |
| Archivos de código creados | 105+ |
| Líneas de código totales | ~20,000+ |
| Tests unitarios | 55 (todos pasando) |
| Páginas del frontend | 7 (incluye /tools) |
| Componentes React | 13+ |
| Hooks personalizados | 1 |
| Contratos Solidity | 1 |
| APIs REST | 8 endpoints (6 MCP + 2 Assistant) |
| Servidor MCP | 1 (11 herramientas Foundry) |
| Tipos de token pharma | 5 |
| Validadores Zod | 8 |
| Herramientas de IA | 9 herramientas |
| Documentación técnica | 5 documentos principales |

### Lecciones Aprendidas

1. **Restricciones de entorno**: Claude Desktop tiene restricciones de `spawn` que requieren estrategias alternativas
2. **Replicar éxito**: Si una función funciona (`health_check`), replicar exactamente su estrategia
3. **Resolución dinámica**: Buscar directorios automáticamente es más robusto que hardcodear rutas
4. **Documentación clara**: Guías paso a paso son esenciales para configuración compleja
5. **Variables de entorno**: Permitir configuración explícita mientras se mantiene detección automática

---

*Documento actualizado como parte de la retrospectiva del proyecto Supply Chain Tracker*
*Última actualización: Enero 2025*
