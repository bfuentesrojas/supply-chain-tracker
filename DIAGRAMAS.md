# Diagramas de Arquitectura y Flujo de Datos - Supply Chain Tracker

## 1. Arquitectura General del Sistema

```mermaid
graph TB
    subgraph "Frontend (Next.js - Puerto 3000)"
        UI[Interfaz de Usuario]
        Pages[Páginas: Dashboard, Products, Track, Admin]
        Components[Componentes React]
        Web3Ctx[Web3Context Provider]
        Hook[useSupplyChain Hook]
    end

    subgraph "Backend APIs"
        AssistantAPI[API Assistant /api/assistant]
        ToolsAPI[API Tools /api/tools]
        MCPAPI[MCP API Server Puerto 3001]
    end

    subgraph "Servidor MCP"
        MCPServer[MCP Server mcp-server.ts]
        FoundryTools[Foundry Tools]
    end

    subgraph "Blockchain (Anvil - Puerto 8545)"
        Contract[SupplyChain.sol]
        Anvil[Anvil Local Node]
    end

    subgraph "Servicios Externos"
        Ollama[Ollama LLM Puerto 11434]
        MetaMask[MetaMask Wallet]
    end

    UI --> Pages
    Pages --> Components
    Components --> Web3Ctx
    Web3Ctx --> Hook
    Hook --> Contract
    Components --> AssistantAPI
    AssistantAPI --> Ollama
    AssistantAPI --> Contract
    Components --> MetaMask
    MetaMask --> Contract
    Pages --> ToolsAPI
    ToolsAPI --> MCPAPI
    MCPAPI --> FoundryTools
    FoundryTools --> Anvil
    MCPServer --> FoundryTools
    Anvil --> Contract
```

## 2. Arquitectura de Smart Contract

```mermaid
classDiagram
    class SupplyChain {
        -mapping(uint256 => Token) tokens
        -mapping(address => uint256) addressToUserId
        -mapping(uint256 => User) users
        -mapping(uint256 => Transfer) transfers
        -mapping(uint256 => mapping(address => uint256)) tokenBalances
        +createToken()
        +transferToken()
        +acceptTransfer()
        +rejectTransfer()
        +registerUser()
        +changeUserStatus()
        +getToken()
        +getUser()
        +getTransfer()
    }

    class Token {
        +uint256 id
        +address creator
        +string name
        +uint256 totalSupply
        +string features
        +TokenType tokenType
        +uint256[] parentIds
        +uint256[] parentAmounts
        +uint256 dateCreated
        +bool recall
    }

    class User {
        +uint256 id
        +address userAddress
        +UserRole role
        +UserStatus status
        +uint256 dateRegistered
    }

    class Transfer {
        +uint256 id
        +uint256 tokenId
        +address from
        +address to
        +uint256 amount
        +TransferStatus status
        +uint256 dateCreated
    }

    class TokenType {
        <<enumeration>>
        API_MP
        BOM
        PT_LOTE
        SSCC
        COMPLIANCE_LOG
    }

    class UserRole {
        <<enumeration>>
        Admin
        Fabricante
        Distribuidor
        Minorista
        Consumidor
    }

    class UserStatus {
        <<enumeration>>
        Pending
        Approved
        Rejected
        Canceled
    }

    class TransferStatus {
        <<enumeration>>
        Pending
        Accepted
        Rejected
    }

    SupplyChain --> Token
    SupplyChain --> User
    SupplyChain --> Transfer
    Token --> TokenType
    User --> UserRole
    User --> UserStatus
    Transfer --> TransferStatus
```

## 3. Flujo de Datos - Creación de Token

```mermaid
sequenceDiagram
    participant U as Usuario
    participant UI as Frontend UI
    participant W3 as Web3Context
    participant H as useSupplyChain
    participant MM as MetaMask
    participant SC as SupplyChain Contract
    participant BC as Blockchain (Anvil)

    U->>UI: Completa formulario de token
    UI->>UI: Valida JSON con schema
    UI->>UI: Valida tipo y padres
    UI->>W3: Solicita conexión
    W3->>MM: requestAccounts()
    MM-->>W3: Cuenta conectada
    W3->>H: getContract()
    H->>SC: createToken(tokenType, name, totalSupply, features, parentIds, parentAmounts)
    SC->>SC: Valida permisos
    SC->>SC: Si PT_LOTE: valida y descuenta componentes
    SC->>SC: Crea token
    SC->>BC: Emite evento TokenCreated
    BC-->>SC: Transacción confirmada
    SC-->>H: Token ID
    H-->>UI: Token creado exitosamente
    UI-->>U: Muestra confirmación
```

## 4. Flujo de Datos - Transferencia de Token

```mermaid
sequenceDiagram
    participant U as Usuario
    participant UI as Frontend UI
    participant H as useSupplyChain
    participant SC as SupplyChain Contract
    participant BC as Blockchain

    U->>UI: Selecciona token y destinatario
    UI->>H: Valida balance disponible
    H->>SC: balanceOf(tokenId, userAddress)
    SC-->>H: Balance disponible
    H-->>UI: Balance válido
    UI->>H: transferToken(tokenId, to, amount)
    H->>SC: transferToken(tokenId, to, amount)
    SC->>SC: Valida permisos y balance
    SC->>SC: Crea Transfer pendiente
    SC->>BC: Emite evento TransferCreated
    BC-->>SC: Transacción confirmada
    SC-->>H: Transfer ID
    H-->>UI: Transferencia creada
    UI-->>U: Muestra estado pendiente
    
    Note over U,BC: Destinatario puede aceptar/rechazar
    U->>UI: Destinatario acepta transferencia
    UI->>H: acceptTransfer(transferId)
    H->>SC: acceptTransfer(transferId)
    SC->>SC: Valida que es el destinatario
    SC->>SC: Actualiza balances
    SC->>BC: Emite evento TransferAccepted
    BC-->>H: Transacción confirmada
    H-->>UI: Transferencia aceptada
    UI-->>U: Muestra confirmación
```

## 5. Flujo de Datos - Asistente de IA

```mermaid
sequenceDiagram
    participant U as Usuario
    participant Chat as FloatingAssistantChat
    participant API as /api/assistant
    participant O as Ollama LLM
    participant Tools as Herramientas IA
    participant SC as Smart Contract
    participant MM as MetaMask

    U->>Chat: Pregunta en lenguaje natural
    Chat->>API: POST /api/assistant { message }
    API->>O: Llamada con tools disponibles
    O->>O: Analiza pregunta
    O->>Tools: Ejecuta herramienta (ej: list_all_users)
    Tools->>SC: Consulta datos
    SC-->>Tools: Datos del contrato
    Tools-->>O: Resultado de herramienta
    O->>O: Genera respuesta
    O-->>API: Respuesta con texto
    API-->>Chat: Respuesta del asistente
    
    alt Acción que requiere transacción
        O->>Tools: Ejecuta acción (ej: change_user_status)
        Tools->>API: Requiere confirmación
        API-->>Chat: Solicita confirmación
        Chat->>U: Modal de confirmación
        U->>Chat: Confirma acción
        Chat->>MM: Solicita firma de transacción
        MM->>U: Aprobación en MetaMask
        U->>MM: Aproba transacción
        MM->>SC: Transacción firmada
        SC-->>MM: Transacción confirmada
        MM-->>Chat: Hash de transacción
        Chat-->>U: Muestra resultado
    end
```

## 6. Arquitectura de Componentes Frontend

```mermaid
graph LR
    subgraph "Layout Principal"
        Layout[app/layout.tsx]
        Navbar[Navbar Component]
        FloatingChat[FloatingAssistantChat]
    end

    subgraph "Páginas"
        Home[app/page.tsx]
        Dashboard[app/dashboard/page.tsx]
        Products[app/products/page.tsx]
        Track[app/track/page.tsx]
        Admin[app/admin/page.tsx]
        CreateToken[app/tokens/create/page.tsx]
        Tools[app/tools/page.tsx]
    end

    subgraph "Componentes"
        AccessGate[AccessGate.tsx]
        CreateWizard[CreateTokenWizard.tsx]
        Forms[Forms: API_MP, BOM, PT_LOTE, SSCC, ComplianceLog]
    end

    subgraph "Contextos y Hooks"
        Web3Context[Web3Context.tsx]
        useSupplyChain[useSupplyChain.ts]
    end

    subgraph "Utilidades"
        ErrorHandler[errorHandler.ts]
        SchemaValidator[schemaValidator.ts]
        FoundryTools[foundryTools.ts]
        Web3Service[web3Service.ts]
    end

    Layout --> Navbar
    Layout --> FloatingChat
    Layout --> Home
    Layout --> Dashboard
    Layout --> Products
    Layout --> Track
    Layout --> Admin
    Layout --> CreateToken
    Layout --> Tools

    Dashboard --> AccessGate
    Products --> AccessGate
    Products --> CreateWizard
    CreateToken --> CreateWizard
    CreateWizard --> Forms

    AccessGate --> Web3Context
    CreateWizard --> Web3Context
    Forms --> Web3Context
    Web3Context --> useSupplyChain
    useSupplyChain --> ErrorHandler
    useSupplyChain --> Web3Service
    CreateWizard --> SchemaValidator
    Tools --> FoundryTools
```

## 7. Flujo de Jerarquía de Tokens

```mermaid
graph TD
    Start[Usuario consulta token] --> GetToken[getToken con tokenId]
    GetToken --> ExtractParents[Extraer parentIds del token]
    ExtractParents --> CheckParents{¿Tiene padres?}
    CheckParents -->|Sí| Recursive[Recursión: getToken para cada padre]
    CheckParents -->|No| BuildTree[Construir árbol de jerarquía]
    Recursive --> ExtractParents
    BuildTree --> ProcessBOM{¿Es BOM?}
    ProcessBOM -->|Sí| ExtractComponents[Extraer componentes del JSON features]
    ProcessBOM -->|No| CheckCompliance{¿Es COMPLIANCE_LOG?}
    ExtractComponents --> AddToTree[Agregar componentes como sub-nivel]
    CheckCompliance -->|Sí| AddToTree
    CheckCompliance -->|No| RenderTree[Renderizar árbol visual]
    AddToTree --> RenderTree
    RenderTree --> Display[Mostrar jerarquía completa]
```

## 8. Sistema de Roles y Permisos

```mermaid
graph TB
    Start[Usuario conecta MetaMask] --> CheckUser[Verificar usuario en contrato]
    CheckUser --> UserExists{¿Usuario existe?}
    UserExists -->|No| Register[Registrar nuevo usuario]
    UserExists -->|Sí| GetStatus[Obtener estado del usuario]
    Register --> Pending[Estado: Pending]
    GetStatus --> Status{Estado del usuario}
    Status -->|Pending| WaitApproval[Esperar aprobación de Admin]
    Status -->|Approved| GetRole[Obtener rol del usuario]
    Status -->|Rejected| Rejected[Acceso denegado]
    Status -->|Canceled| Canceled[Cuenta cancelada]
    
    GetRole --> Role{¿Qué rol?}
    Role -->|Admin| AdminPerms[Permisos completos]
    Role -->|Fabricante| FabricantePerms[Crear tokens, Transferir a Distribuidores]
    Role -->|Distribuidor| DistribuidorPerms[Recibir, Transferir a Minoristas]
    Role -->|Minorista| MinoristaPerms[Recibir, Transferir a Consumidores]
    Role -->|Consumidor| ConsumidorPerms[Solo ver, recibir tokens]
    
    AdminPerms --> Access[Acceso completo]
    FabricantePerms --> Access
    DistribuidorPerms --> Access
    MinoristaPerms --> Access
    ConsumidorPerms --> LimitedAccess[Acceso limitado]
```

## 9. Flujo de Descuento Automático de Supply (PT_LOTE)

```mermaid
sequenceDiagram
    participant U as Usuario
    participant UI as Frontend
    participant H as useSupplyChain
    participant SC as SupplyChain Contract
    participant BC as Blockchain

    U->>UI: Crea PT_LOTE con receta (BOM) como padre
    UI->>UI: Valida que tenga exactamente un padre
    UI->>UI: Valida que el padre sea BOM
    UI->>H: Verifica componentes disponibles
    H->>SC: getToken(parentId) - Obtener receta
    SC-->>H: Receta con componentes
    H->>H: Calcula cantidadNecesaria = cantidadPorUnidad * cantidadLote
    H->>SC: balanceOf(componentId, userAddress) para cada componente
    SC-->>H: Balances disponibles
    H->>H: Valida que todos los balances sean suficientes
    H-->>UI: Componentes suficientes ✅
    UI->>H: createToken(PT_LOTE, ...)
    H->>SC: createToken(...)
    SC->>SC: _consumeRecipeComponents()
    SC->>SC: Para cada componente:
    SC->>SC:   cantidadNecesaria = cantidadPorUnidad * cantidadLote
    SC->>SC:   Valida balance >= cantidadNecesaria
    SC->>SC:   Descuenta balance del usuario
    SC->>SC: Crea token PT_LOTE
    SC->>BC: Emite eventos
    BC-->>SC: Transacción confirmada
    SC-->>H: Token creado
    H-->>UI: Lote creado exitosamente
    UI-->>U: Confirmación
```

## 10. Arquitectura del Servidor MCP

```mermaid
graph TB
    subgraph "Claude Desktop"
        Claude[Claude Desktop]
    end

    subgraph "MCP Server (STDIO)"
        MCPServer[mcp-server.ts]
        Transport[StdioServerTransport]
        Tools[11 Herramientas MCP]
    end

    subgraph "Foundry Tools"
        ForgeBuild[forge_build]
        ForgeTest[forge_test]
        AnvilStart[anvil_start]
        AnvilStop[anvil_stop]
        AnvilRestart[anvil_restart]
        CastCall[cast_call]
        CastSend[cast_send]
        ScriptFund[forge_script_fund]
        ScriptDeploy[forge_script_deploy]
        AnvilFund[anvil_fund]
        HealthCheck[health_check]
    end

    subgraph "Utilidades"
        FoundryToolsLib[foundryTools.ts]
        ExecFile[execFileAsync]
    end

    subgraph "Foundry"
        Forge[forge]
        Anvil[anvil]
        Cast[cast]
    end

    Claude -->|STDIO| MCPServer
    MCPServer --> Transport
    Transport --> Tools
    Tools --> FoundryToolsLib
    FoundryToolsLib --> ExecFile
    ExecFile --> Forge
    ExecFile --> Anvil
    ExecFile --> Cast
```

## 11. Flujo de Datos Completo - Sistema de Trazabilidad

```mermaid
graph TB
    Start[Usuario consulta trazabilidad] --> GetToken[Obtener token por ID]
    GetToken --> GetHierarchy[getTokenHierarchy - Construir jerarquía]
    GetHierarchy --> GetTransfers[getTokenTransfers - Obtener transferencias]
    
    GetHierarchy --> ProcessParents[Procesar parentIds recursivamente]
    ProcessParents --> BuildTree[Construir árbol BFS]
    BuildTree --> ExtractBOM[Extraer componentes BOM del JSON]
    ExtractBOM --> AddComponents[Agregar componentes como sub-nivel]
    AddComponents --> AddCompliance[Agregar tokens compliance como sub-nivel]
    
    GetTransfers --> FilterTransfers[Filtrar transferencias del token]
    FilterTransfers --> SortChronological[Ordenar cronológicamente]
    SortChronological --> GetUserInfo[Obtener información de usuarios from/to]
    GetUserInfo --> BuildTimeline[Construir timeline de transferencias]
    
    BuildTree --> DisplayHierarchy[Mostrar jerarquía visual]
    BuildTimeline --> DisplayTimeline[Mostrar timeline de transferencias]
    
    DisplayHierarchy --> Render[Renderizar vista completa]
    DisplayTimeline --> Render
    Render --> End[Vista de trazabilidad completa]
```

## 12. Arquitectura de Validaciones

```mermaid
graph TB
    Start[Usuario crea token] --> InputJSON[Input: JSON features]
    InputJSON --> SchemaValidation[Schema Validator]
    SchemaValidation --> CheckSchema{¿Cumple schema.json?}
    CheckSchema -->|No| SchemaError[Error: Schema inválido]
    CheckSchema -->|Sí| TypeValidation[Type Validator Zod]
    
    TypeValidation --> CheckType{¿Tipo de token?}
    CheckType -->|API_MP| ValidateAPI[Validar API_MP: GTIN, GLN]
    CheckType -->|BOM| ValidateBOM[Validar BOM: Componentes, cantidades]
    CheckType -->|PT_LOTE| ValidatePT[Validar PT_LOTE: GTIN, lote, fecha]
    CheckType -->|SSCC| ValidateSSCC[Validar SSCC: Código SSCC]
    CheckType -->|COMPLIANCE| ValidateComp[Validar COMPLIANCE: Tipo, datos]
    
    ValidateAPI --> GS1Validation[Validación GS1: Dígito control]
    ValidateBOM --> ComponentValidation[Validar estructura componentes]
    ValidatePT --> GS1Validation
    ValidateSSCC --> GS1Validation
    ValidateComp --> CompTypeValidation[Validar tipo compliance]
    
    GS1Validation --> AllValid{¿Todas válidas?}
    ComponentValidation --> AllValid
    CompTypeValidation --> AllValid
    
    AllValid -->|Sí| ContractValidation[Validaciones en contrato]
    AllValid -->|No| ValidationError[Error: Validación fallida]
    
    ContractValidation --> CheckPermissions[Verificar permisos usuario]
    CheckPermissions --> CheckParents[Verificar padres válidos]
    CheckParents --> CheckBalance[Verificar balances si aplica]
    CheckBalance --> Success[Token creado exitosamente]
```

## 13. Flujo de Sistema de Recall

```mermaid
sequenceDiagram
    participant U as Usuario
    participant UI as Frontend
    participant SC as SupplyChain Contract
    participant BC as Blockchain

    U->>UI: Crea COMPLIANCE_LOG con recall=true
    UI->>UI: Muestra popup de advertencia
    U->>UI: Confirma creación con recall
    UI->>SC: createToken(COMPLIANCE_LOG, recall=true, parentId)
    SC->>SC: Valida que es COMPLIANCE_LOG
    SC->>SC: Valida que tiene exactamente un padre
    SC->>SC: Crea token con recall=true
    SC->>SC: _markSupplyChainAsRecalled(parentId)
    SC->>SC: Recursivamente marca padre como recall
    SC->>SC: Para cada padre:
    SC->>SC:   token.recall = true
    SC->>SC:   Si tiene padres, recursión
    SC->>BC: Emite evento TokenCreated (recall=true)
    SC->>BC: Emite eventos TokenRecalled para cada token
    BC-->>SC: Transacciones confirmadas
    SC-->>UI: Token creado, cadena marcada como retirada
    UI-->>U: Muestra indicador "Retirado" en todos los tokens afectados
```

## 14. Arquitectura de APIs

```mermaid
graph TB
    subgraph "Next.js App Router"
        AssistantRoute[app/api/assistant/route.ts]
        ConfirmRoute[app/api/assistant/confirm/route.ts]
        ToolsRoutes[app/api/tools/*]
    end

    subgraph "Express Server (Puerto 3001)"
        MCPAPIServer[mcp-api-server.ts]
        ExpressRoutes[Express Routes]
    end

    subgraph "MCP Server (STDIO)"
        MCPServer[mcp-server.ts]
        MCPTools[MCP Tools]
    end

    subgraph "Servicios"
        OllamaService[Ollama API]
        FoundryService[Foundry Tools Service]
        ContractService[Smart Contract Service]
    end

    AssistantRoute --> OllamaService
    AssistantRoute --> ContractService
    ConfirmRoute --> ContractService
    ToolsRoutes --> FoundryService
    MCPAPIServer --> ExpressRoutes
    ExpressRoutes --> FoundryService
    MCPServer --> MCPTools
    MCPTools --> FoundryService
    FoundryService --> ContractService
```

## 15. Flujo de Autenticación y Autorización

```mermaid
graph TB
    Start[Usuario abre dApp] --> CheckMM{¿MetaMask instalado?}
    CheckMM -->|No| InstallMM[Mostrar mensaje: Instalar MetaMask]
    CheckMM -->|Sí| RequestConnect[Solicitar conexión]
    RequestConnect --> UserApproves{¿Usuario aprueba?}
    UserApproves -->|No| Rejected[Cancelado]
    UserApproves -->|Sí| GetAccount[Obtener cuenta]
    GetAccount --> CheckNetwork{¿Red correcta? ChainId 31337}
    CheckNetwork -->|No| SwitchNetwork[Cambiar a Anvil Local]
    CheckNetwork -->|Sí| GetUserInfo[getUserInfo con address]
    GetUserInfo --> UserExists{¿Usuario existe?}
    UserExists -->|No| RegisterUser[Registrar nuevo usuario]
    UserExists -->|Sí| GetStatus[Obtener estado]
    RegisterUser --> Pending[Estado: Pending]
    GetStatus --> Status{Estado}
    Status -->|Pending| ShowPending[Mostrar: Esperando aprobación]
    Status -->|Rejected| ShowRejected[Mostrar: Acceso denegado]
    Status -->|Canceled| ShowCanceled[Mostrar: Cuenta cancelada]
    Status -->|Approved| GetRole[Obtener rol]
    GetRole --> SetPermissions[Configurar permisos según rol]
    SetPermissions --> AccessGate[AccessGate valida acceso]
    AccessGate --> CheckPage{¿Página permitida?}
    CheckPage -->|Sí| AllowAccess[Permitir acceso]
    CheckPage -->|No| DenyAccess[Denegar acceso / Redirigir]
```

---

*Diagramas generados para el proyecto Supply Chain Tracker*  
*Última actualización: Enero 2025*
