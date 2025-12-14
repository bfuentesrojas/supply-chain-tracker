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

### Resumen Total del Proyecto
| Componente | Sesión 1 | Sesión 2 | Sesión 3 | Sesión 4 | Total |
|------------|----------|----------|----------|----------|-------|
| Smart Contracts | ~18 min | ~45 min | ~3 min | - | **~66 min** |
| Frontend | ~48 min | ~33 min | ~25 min | ~135 min | **~241 min** |
| Documentación | ~5 min | ~5 min | ~5 min | ~10 min | **~25 min** |
| **TOTAL PROYECTO** | **~71 min** | **~83 min** | **~33 min** | **~145 min** | **~332 min (~5h 32min)** |

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

| Métrica | Sesión 1 | Sesión 2 | Sesión 3 | Sesión 4 | Total |
|---------|----------|----------|----------|----------|-------|
| Prompts del usuario | 2 | 4 | 3 | ~20 | ~29 |
| Archivos creados/modificados | 20+ | 15+ | 8 | 25+ | 50+ |
| Líneas de código generadas | ~3,500 | ~2,000 | ~400 | ~4,000 | ~9,900 |
| Tests implementados | 24 | 50 | 50 | 50 | 50 (final) |

---

## 2.5. Funcionalidades Implementadas

### Smart Contract (SupplyChain.sol)
- Gestión de usuarios con estados (Pending, Approved, Rejected, Canceled)
- Gestión de tokens con características JSON
- Sistema de transferencias con aprobación
- Control de acceso basado en roles
- Admin hardcodeado para red local

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

### Características de Trazabilidad
- Vista de jerarquía completa (árbol visual)
- Timeline de transferencias cronológico
- Detección automática de Token IDs en features (links navegables)
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
| Tiempo total de desarrollo | ~5h 32min |
| Sesiones de desarrollo | 4 |
| Archivos de código creados | 50+ |
| Líneas de código totales | ~9,900+ |
| Tests unitarios | 50 |
| Páginas del frontend | 6 |
| Componentes React | 10+ |
| Hooks personalizados | 1 |
| Contratos Solidity | 1 |
| Tipos de token pharma | 5 |
| Validadores Zod | 8 |

---

*Documento actualizado como parte de la retrospectiva del proyecto Supply Chain Tracker*
*Última actualización: 11 de Diciembre, 2024*
