# Supply Chain Tracker - dApp

Aplicación descentralizada (dApp) para gestionar de manera completa una cadena de suministros farmacéutica utilizando tecnología blockchain. Implementa trazabilidad completa de productos desde materia prima hasta el consumidor final.

## 🎯 Caso de Uso

Sistema de trazabilidad para cadena de suministro farmacéutica en Chile (MVP), que permite:
- Registro de materias primas (API/excipientes)
- Composición de productos (BOM)
- Gestión de lotes de producción
- Control logístico con códigos SSCC
- Registros de cumplimiento (temperatura, CAPA, recalls)

## 🛠️ Tecnologías

### Smart Contracts
- **Solidity** ^0.8.24
- **Foundry** - Framework de desarrollo y testing
- **Anvil** - Nodo local de Ethereum

### Frontend
- **Next.js** 14 - Framework React con App Router
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos utilitarios
- **ethers.js** v6 - Interacción con Ethereum
- **Zod** - Validación de esquemas

## 📁 Estructura del Proyecto

```
supply-chain-tracker/
├── sc/                              # Smart Contracts
│   ├── src/
│   │   └── SupplyChain.sol          # Contrato principal
│   ├── script/
│   │   ├── Deploy.s.sol             # Script de despliegue
│   │   └── FundAccounts.s.sol       # Script para fondear cuentas
│   ├── test/
│   │   └── SupplyChain.t.sol        # Tests del contrato (50 tests)
│   └── foundry.toml                 # Configuración de Foundry
├── web/                             # Frontend Next.js
│   ├── src/
│   │   ├── app/                     # Páginas (App Router)
│   │   │   ├── admin/               # Panel de administración
│   │   │   ├── dashboard/           # Dashboard principal
│   │   │   ├── products/            # Gestión de tokens
│   │   │   ├── tokens/create/       # Wizard de creación
│   │   │   └── track/               # Trazabilidad completa
│   │   ├── components/              # Componentes React
│   │   │   ├── AccessGate.tsx       # Control de acceso
│   │   │   ├── Navbar.tsx           # Navegación
│   │   │   └── tokens/              # Componentes del wizard
│   │   ├── types/                   # Tipos TypeScript
│   │   │   └── pharma.ts            # Tipos para tokens pharma
│   │   ├── validators/              # Validadores Zod
│   │   │   └── pharma.ts            # Validaciones GS1 y regulatorias
│   │   ├── builders/                # Constructores de features
│   │   │   └── pharma.ts            # Builders por tipo de token
│   │   ├── schemas/                 # Schemas JSON
│   │   │   └── features.schema.json # Schema de validación de features
│   │   └── lib/
│   │       ├── errorHandler.ts       # Manejador de errores Web3/MetaMask
│   │       └── schemaValidator.ts   # Validador de JSON schema
│   │   ├── contexts/                # Contextos React
│   │   │   └── Web3Context.tsx      # Provider Web3
│   │   ├── hooks/                   # Custom hooks
│   │   │   └── useSupplyChain.ts    # Hook del contrato
│   │   ├── contracts/               # ABI y configuración
│   │   └── lib/                     # Utilidades
│   ├── package.json
│   └── tailwind.config.js
├── chats/                           # Logs de sesiones IA
├── IA.md                            # Retrospectiva del uso de IA
└── README.md
```

## 🚀 Instalación

### Requisitos previos
- Node.js >= 18
- npm >= 9
- Git
- Foundry (forge, anvil, cast)
- MetaMask

### 1. Clonar el repositorio
```bash
git clone <url-del-repo>
cd supply-chain-tracker
```

### 2. Configurar Smart Contracts
```bash
cd sc
forge install
forge build
forge test
```

### 3. Configurar Frontend
```bash
cd web
npm install
```

## 💻 Uso

### 1. Iniciar nodo local (Anvil)
```bash
# En una terminal
anvil
```

### 2. Desplegar contratos
```bash
cd sc
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

### 3. Fondear cuentas de prueba (opcional)
```bash
# Desde sc/
forge script script/FundAccounts.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

# O directamente con cast:
cast send <direccion> --value 10ether --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --rpc-url http://127.0.0.1:8545
```

### 4. Actualizar dirección del contrato
Copiar la dirección del contrato desplegado y actualizar en:
`web/src/contracts/SupplyChain.ts` → `CONTRACT_ADDRESS`

### 5. Iniciar frontend
```bash
cd web
npm run dev
```
Abrir http://localhost:3000

### 6. Configurar MetaMask
1. Agregar red Anvil Local:
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Símbolo: `ETH`
2. Importar cuenta de prueba usando clave privada de Anvil

## 📋 Funcionalidades

### Roles de Usuario
| Rol | Descripción | Permisos |
|-----|-------------|----------|
| 🏭 Fabricante | Produce productos | Crear tokens, transferir a distribuidores |
| 🚚 Distribuidor | Transporta productos | Recibir, transferir a minoristas |
| 🏪 Minorista | Vende al consumidor | Recibir, transferir a consumidores |
| 👤 Consumidor | Usuario final | Recibir tokens, verificar trazabilidad (sin crear ni transferir) |
| 👑 Admin | Administrador | Aprobar usuarios, transferir a cualquier rol |

### Tipos de Token Pharma
| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| API_MP | Materia Prima / API | Paracetamol USP |
| BOM | Bill of Materials | Receta del producto |
| PT_LOTE | Producto Terminado | Lote de comprimidos |
| SSCC | Unidad Logística | Pallet con productos |
| COMPLIANCE_LOG | Registros | TempLog, CAPA, Recall |

### Páginas

#### 🏠 Home (`/`)
Landing page con información del proyecto.

#### 📊 Dashboard (`/dashboard`)
- **Totalizadores personalizados por rol**:
  - **Admin**: Total Tokens, Total Usuarios, Total Transferencias, Mi Estado
  - **Fabricante/Distribuidor/Retailer**: Mis Tokens, Transferencias Enviadas, Transferencias Recibidas, Mi Estado
  - **Consumidor**: Mis Tokens, Transferencias Recibidas, Mi Estado
- Tokens del usuario
- Transferencias pendientes

#### 📦 Productos (`/products`)
- Lista de tokens propios
- Crear tokens (formulario simple con validación JSON obligatoria)
- **Transferir tokens con combobox de destinatarios filtrado por rol según cadena de suministro**
- **Validación de balance con popup de error**
- **Restricciones por rol**: Consumidores solo pueden ver sus tokens (sin crear ni transferir)

#### ➕ Crear Token (`/tokens/create`)
Wizard multi-paso para crear tokens farmacéuticos:
1. Selección de tipo
2. Formulario específico con validaciones
3. Revisión del JSON generado
4. Confirmación y creación en blockchain

#### 🔍 Trazabilidad (`/track`)
Vista completa de un token:
- **Información**: Detalles y características con descripción de tipos
- **Jerarquía**: 
  - Árbol visual de tokens padre
  - **Componentes BOM mostrados como sub-nivel bajo cada BOM** (materias primas)
  - **Tokens compliance como sub-nivel** (morado)
- **Transferencias**: Timeline cronológico con perfil de cuentas
- **Botón "Volver"** según historial de navegación

#### ⚙️ Admin (`/admin`)
Panel de administración:
- Lista paginada de usuarios (10/50/100)
- Filtro por estado
- Búsqueda por dirección
- Acciones de cambio de estado

## 🧪 Testing

### Smart Contracts
```bash
cd sc
forge test -vvv
```

### Coverage
```bash
forge coverage
```

### Tests incluidos (50 tests)
- Gestión de usuarios (7 tests)
- Creación de tokens (8 tests)
- Transferencias (8 tests)
- Validaciones y permisos (6 tests)
- Casos edge (5 tests)
- Eventos (6 tests)
- Flujos completos (3 tests)
- Tests de robustez (7 tests)

## 🔐 Cuenta Admin

En la red local de Anvil, el admin está configurado como:
```
Address: 0xeD252BAc2D88971cb5B393B0760f05AF27413b91
```

Para pruebas, asegúrate de fondear esta cuenta y conectarla a MetaMask.

## 📄 Validaciones

### Validaciones GS1
El sistema implementa validaciones para códigos GS1:
- **GTIN** (14 dígitos) - Global Trade Item Number
- **GLN** (13 dígitos) - Global Location Number
- **SSCC** (18 dígitos) - Serial Shipping Container Code

Todas las validaciones incluyen verificación de dígito de control (Modulo 10).

### Validación de Features JSON
- **Schema validation**: Validación en tiempo real del JSON de features según `features.schema.json`
- **Validación por tipo**: Reglas específicas según el tipo de token (API_MP, BOM, PT_LOTE, SSCC, COMPLIANCE_LOG)
- **Feedback visual**: Indicadores de validación en el formulario de creación

## ✨ Mejoras Recientes (Diciembre 2024)

### Validaciones y UX
- ✅ **Validación JSON obligatoria** al crear tokens (campo requerido con validación completa)
- ✅ Validación de balance en transferencias con popup de error
- ✅ **Combobox de destinatarios filtrado por rol según cadena de suministro**:
  - Admin: Todos los usuarios aprobados (excluyendo su cuenta)
  - Fabricante: Solo distribuidores
  - Distribuidor: Solo minoristas
  - Minorista: Solo consumidores
- ✅ **Dashboard personalizado por rol** con totalizadores específicos
- ✅ **Restricciones para consumidores**: Sin acceso a crear tokens ni transferir

### Visualización
- ✅ **Componentes BOM mostrados como sub-nivel bajo cada BOM** en jerarquía
- ✅ Tokens compliance como sub-nivel en jerarquía
- ✅ Botón "Volver" con historial de navegación
- ✅ Descripción de tipos en JSON (ej: "API_MP (Materia Prima)")
- ✅ Perfil de cuenta en transferencias
- ✅ Formato de destinatarios: `#número (rol)` en lugar de dirección

### Formularios
- ✅ ParentId como lista desplegable de tokens propios
- ✅ Ejemplos de nombres acordes a medicamentos
- ✅ Validación en tiempo real del JSON de features

### Correcciones Técnicas
- ✅ Corrección de comparación de estado de usuario en `getUsersByRole`
- ✅ Corrección de estructura JSON de BOM para visualización correcta de componentes

## 🗂️ Documentación Adicional

- `IA.md` - Retrospectiva completa del uso de IA en el desarrollo
- `chats/` - Logs de sesiones de desarrollo con IA

## 📝 Licencia

MIT

---

*Desarrollado con asistencia de Claude (Anthropic) en Cursor IDE*
*Última actualización: Diciembre 2024*
