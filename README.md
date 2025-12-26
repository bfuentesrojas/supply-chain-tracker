# Supply Chain Tracker - Sistema de Trazabilidad Farmacéutica

## Descripción

Supply Chain Tracker es una aplicación descentralizada (dApp) que implementa un sistema completo de trazabilidad para cadena de suministro farmacéutica utilizando tecnología blockchain. El sistema permite el seguimiento completo de productos desde la materia prima hasta el consumidor final, garantizando transparencia, seguridad y cumplimiento regulatorio.

La solución aborda el problema de la falta de trazabilidad completa en la industria farmacéutica, permitiendo a los diferentes actores (fabricantes, distribuidores, minoristas y consumidores) rastrear el origen, la composición y el historial completo de cualquier producto a través de una cadena de bloques inmutable.

El sistema implementa una jerarquía de tokens que refleja la estructura real de la cadena de suministro: materias primas (API_MP), recetas de composición (BOM), lotes de producto terminado (PT_LOTE), unidades logísticas (SSCC) y registros de cumplimiento (COMPLIANCE_LOG), incluyendo capacidad de recall para retirar productos del mercado cuando sea necesario.

## Problema que Resuelve

El sector farmacéutico enfrenta desafíos críticos en la trazabilidad de productos que afectan la seguridad del paciente y el cumplimiento regulatorio. Los sistemas tradicionales carecen de transparencia, están centralizados y no garantizan la inmutabilidad de los registros. Cuando ocurren problemas de calidad o seguridad (como contaminación o efectos adversos), el proceso de recall es lento y costoso.

Este sistema resuelve estos problemas mediante:

- **Trazabilidad completa e inmutable**: Cada producto tiene un historial completo registrado en blockchain que no puede ser modificado
- **Transparencia en la cadena de suministro**: Todos los actores autorizados pueden verificar el origen y el historial de los productos
- **Recall automatizado**: Cuando se detecta un problema, se marca automáticamente toda la cadena de suministro relacionada, bloqueando transferencias futuras
- **Cumplimiento regulatorio**: Registros de cumplimiento (temperatura, CAPA, recalls) vinculados a productos específicos
- **Gestión de componentes**: Sistema automático de descuento de componentes al crear lotes, asegurando la trazabilidad de materias primas

## Tecnologías Utilizadas

- **Blockchain**: Ethereum (Anvil local para desarrollo, compatible con testnets)
- **Smart Contracts**: Solidity ^0.8.24
- **Backend**: Node.js con Express.js, TypeScript
- **Frontend**: Next.js 14 (React) con TypeScript
- **Base de datos**: Blockchain (sin base de datos tradicional, todo en-chain)
- **IA/Herramientas**: Ollama (LLM local), Claude Desktop con Model Context Protocol (MCP), asistente de IA integrado

## Arquitectura del Sistema

[Ver diagramas completos en docs/diagramas.md](docs/diagramas.md)

El sistema sigue una arquitectura descentralizada compuesta por:

1. **Capa de Smart Contracts**: Contrato único `SupplyChain.sol` que gestiona usuarios, tokens, transferencias y recall
2. **Capa de Backend**: 
   - Servidor MCP API (puerto 3001) para herramientas Foundry
   - API de asistente de IA (/api/assistant) para consultas y acciones
3. **Capa de Frontend**: Aplicación Next.js con múltiples páginas (Dashboard, Productos, Trazabilidad, Admin)
4. **Integración Web3**: MetaMask para gestión de wallets y firma de transacciones
5. **Servicio de IA**: Ollama para procesamiento de lenguaje natural y asistente conversacional

## Instalación y Configuración

### Requisitos Previos

- Node.js v18+
- npm o yarn
- Foundry (forge, anvil, cast)
- MetaMask instalado
- Ollama (para el asistente de IA, opcional)

### Instalación de Dependencias

```bash
# Instalar dependencias del backend
cd backend
npm install

# Instalar dependencias del frontend
cd ../frontend
npm install

# Compilar smart contracts
cd ../contracts
forge install
forge build
```

### Configuración

1. El proyecto usa Anvil (blockchain local) por defecto, no requiere configuración adicional
2. Para usar testnets (Sepolia, Goerli), configurar en `.env.local`:
   ```
   RPC_URL=https://sepolia.infura.io/v3/YOUR_API_KEY
   NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/YOUR_API_KEY
   ```

### Ejecución

**Opción 1: Script automatizado (Recomendado)**

```bash
# Desde la raíz del proyecto
./start-all.sh
```

Este script:
- Inicia el servidor MCP API (puerto 3001)
- Compila smart contracts
- Inicia Anvil (blockchain local en puerto 8545)
- Despliega el contrato automáticamente
- Fondea cuentas de prueba
- Inicia el frontend (puerto 3000)

**Opción 2: Manual**

```bash
# Terminal 1: Backend
cd backend
npm run start:mcp-api

# Terminal 2: Anvil
anvil

# Terminal 3: Desplegar contrato
cd contracts
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

# Terminal 4: Frontend
cd frontend
npm run dev

# Terminal 5: Ollama (opcional, para asistente de IA)
ollama serve
```

## Smart Contracts Desplegados

- **Red**: Anvil Local (desarrollo) / Ethereum Testnets (producción)
- **Chain ID**: 31337 (local) / 11155111 (Sepolia) / 5 (Goerli)
- **Contrato Principal**: Se despliega automáticamente con `start-all.sh`, dirección actualizada en `frontend/src/contracts/SupplyChain.ts`
- **Explorador**: 
  - Local: No disponible (red local)
  - Sepolia: [Etherscan Sepolia](https://sepolia.etherscan.io)
  - Goerli: [Etherscan Goerli](https://goerli.etherscan.io)

## Casos de Uso

1. **Registro de materias primas**: Fabricante registra materias primas (API/excipientes) con certificados de calidad
2. **Creación de recetas (BOM)**: Fabricante define la composición de productos usando materias primas registradas
3. **Producción de lotes**: Fabricante crea lotes de producto terminado, consumiendo automáticamente los componentes de la receta
4. **Transferencia a distribuidor**: Fabricante transfiere lotes a distribuidores autorizados
5. **Creación de unidades logísticas (SSCC)**: Distribuidor crea unidades logísticas desde lotes recibidos
6. **Transferencia a minorista**: Distribuidor transfiere unidades logísticas a minoristas
7. **Transferencia a consumidor**: Minorista transfiere productos al consumidor final
8. **Registros de cumplimiento**: Creación de logs de temperatura, CAPA y otros registros regulatorios
9. **Recall de productos**: Sistema de retiro de productos del mercado con marcado automático de toda la cadena

[Ver casos de prueba detallados en docs/casos-de-prueba-e2e.md](docs/casos-de-prueba-e2e.md)

## Capturas de Pantalla

La carpeta [screenshots/](screenshots/) contiene 37 capturas de pantalla que documentan un flujo completo end-to-end del sistema, desde la creación de materias primas hasta el recall de productos. Las imágenes están organizadas secuencialmente según el siguiente flujo:

### Flujo Documentado

1. **Dashboard inicial** - Vista general del sistema
2. **Creación de materias primas (API_MP)** - Registro de Paracetamol API y Excipiente
3. **Gestión de materias primas** - Lista y visualización de tokens creados
4. **Creación de receta (BOM)** - Definición de receta de composición
5. **Creación de lote (PT_LOTE)** - Producción de lote con validación de componentes
6. **Transferencias** - Flujo completo de transferencias entre actores:
   - Fabricante → Distribuidor
   - Distribuidor → Minorista
   - Minorista → Consumidor
7. **Creación de unidades logísticas (SSCC)** - Empaquetado y distribución
8. **Trazabilidad completa** - Visualización de jerarquía y historial de transferencias
9. **Registros de cumplimiento (COMPLIANCE_LOG)** - Logs regulatorios
10. **Sistema de recall** - Retiro de productos y marcado de cadena completa
11. **Validaciones de seguridad** - Intentos de transferir tokens en recall (fallo esperado)
12. **Múltiples lotes** - Producción de múltiples lotes desde la misma receta
13. **Estadísticas finales** - Dashboard con métricas del sistema

Estas capturas proporcionan una guía visual completa para entender el funcionamiento del sistema y pueden ser utilizadas como documentación de referencia para usuarios y desarrolladores.

## Diagramas Técnicos

[Ver documentación de diagramas](docs/diagramas.md)

## Video Demostración

🎥 [Ver video] *(Nota: Agregar enlace al video demostrativo)*

## Innovaciones Implementadas

- **Sistema de múltiples padres**: Tokens pueden tener múltiples padres con cantidades asociadas, permitiendo modelar recetas complejas
- **Descuento automático de componentes**: Al crear un lote (PT_LOTE), el sistema valida y descuenta automáticamente los componentes de la receta
- **Sistema de recall recursivo**: Cuando se crea un recall, se marca automáticamente toda la cadena de suministro relacionada (padres e hijos)
- **Jerarquía visual mejorada**: Visualización de jerarquías complejas con múltiples padres en el mismo nivel usando BFS
- **Asistente de IA integrado**: Chat flotante con capacidades de consulta y acción sobre el contrato, integrado con Ollama y soporte para confirmaciones de transacciones
- **Validaciones GS1**: Implementación de validaciones para códigos GTIN, GLN y SSCC con verificación de dígito de control
- **Dashboard personalizado por rol**: Interfaces adaptadas según el rol del usuario (admin, fabricante, distribuidor, minorista, consumidor)
- **Restricciones de transferencia por cadena de suministro**: Filtrado automático de destinatarios según la cadena de suministro (fabricante → distribuidor → minorista → consumidor)
- **Suite completa de tests unitarios**: 77 tests totales (55 smart contracts + 12 backend + 10 frontend) con cobertura completa
- **Documentación mejorada**: JSDoc completo en funciones críticas del backend y frontend, con ejemplos de uso

## 🧪 Testing

### Smart Contracts
```bash
cd contracts
forge test -vvv
```

### Coverage
```bash
forge coverage
```

### Tests Smart Contracts (55 tests)
- Gestión de usuarios (7 tests)
- Creación de tokens (8 tests)
- Transferencias (8 tests)
- Validaciones y permisos (6 tests)
- Casos edge (5 tests)
- Eventos (6 tests)
- Flujos completos (3 tests)
- Tests de robustez (7 tests)
- **Descuento de supply para PT_LOTE (5 tests)**:
  - Consumo correcto de componentes
  - Validación de componentes insuficientes
  - Validación de padre BOM requerido
  - Validación de padre único requerido
  - Consumo de múltiples componentes
- **Sistema de Recall (tests incluidos en creación de tokens)**:
  - Validación de recall solo para COMPLIANCE_LOG
  - Validación de padre único para recall
  - Marcado de cadena de suministro como retirada

### Backend Tests
```bash
cd backend
npm test
npm run test:watch
npm run test:coverage
```

### Tests Backend (12 tests)
- **foundryTools.ts**:
  - `sanitizeArgs`: 6 tests (sanitización de argumentos, preservación de firmas, validación de errores)
  - `validateCommand`: 6 tests (validación de comandos permitidos y rechazo de no permitidos)

### Frontend Tests
```bash
cd frontend
npm test
npm run test:watch
npm run test:coverage
```

### Tests Frontend (10 tests)
- **AccessGate.test.tsx**: 5 tests (renderizado sin conexión, contenido con usuario aprobado, formulario de registro, aprobación pendiente, red incorrecta)
- **FloatingAssistantChat.test.tsx**: 5 tests (renderizado del botón, apertura del chat, manejo de errores, envío de mensajes, modal de confirmación)

**Total: 77 tests unitarios** (55 smart contracts + 12 backend + 10 frontend)

## Uso de Herramientas de IA

El proyecto ha sido desarrollado con asistencia significativa de IA utilizando:

- **Claude (Anthropic) en Cursor IDE**: Desarrollo principal del código, debugging y refactorización
- **Claude Desktop con Model Context Protocol (MCP)**: Integración para ejecutar herramientas Foundry (forge, anvil, cast) directamente desde Claude Desktop
  - Servidor MCP personalizado en `backend/src/server/mcp-server.ts`
  - Configuración disponible en `docs/claude-desktop-config.md`
  - 11 herramientas Foundry expuestas como herramientas MCP
- **Ollama**: LLM local para el asistente de IA integrado en la aplicación
- **Asistente de IA integrado**: Chat flotante que permite consultas y acciones sobre el contrato usando lenguaje natural

[Ver retrospectiva completa del uso de IA en docs/IA.md](docs/IA.md)  
[Ver guía de configuración de Claude Desktop en docs/claude-desktop-config.md](docs/claude-desktop-config.md)

## Autor

- **Nombre:** [Tu nombre]
- **Email:** [tu-email@example.com]
- **LinkedIn:** [tu-perfil]

## Licencia

MIT License
