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

*Documento actualizado como parte de la retrospectiva del proyecto Supply Chain Tracker*
*Última actualización: Enero 2025*
