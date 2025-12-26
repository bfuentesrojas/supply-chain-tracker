# MCP Foundry Tools - Frontend

Interfaz web para invocar herramientas Foundry a través de la API MCP.

## Iniciar los Servicios

### 1. Servidor API MCP (Puerto 3001)
```bash
# Desde la raíz del proyecto
./start-mcp-api.sh

# O manualmente
cd web
npm run dev:mcp-api
```

### 2. Frontend (Puerto 3000)
```bash
# Desde la raíz del proyecto
./start-tools.sh

# O manualmente
cd web
npm run dev
```

## Acceso

Una vez iniciado:
- **API MCP**: http://localhost:3001
- **Frontend Principal (dApp)**: http://localhost:3000
- **Tools MCP**: http://localhost:3000/tools

## Configuración de Puertos

- **3000**: Frontend principal (dApp de tracking + Tools MCP en `/tools`)
- **3001**: API MCP (servidor Express)

## Funcionalidades

### Health Check
- Verifica el estado de todas las herramientas Foundry (forge, anvil, cast)
- Muestra versiones y estado de ejecución

### Forge Build
- Compila los smart contracts
- Opción para compilar con o sin tests

### Forge Test
- Ejecuta tests del contrato
- Configurable verbosity (0-5)
- Filtro por nombre de test

### Anvil Start/Stop
- Inicia Anvil en background
- Configurable puerto y chain ID
- Detiene Anvil si está corriendo

### Cast Call
- Ejecuta llamadas a contratos
- Configurable dirección, función y RPC URL

### Cast Send
- Envía transacciones
- Soporta funciones y valores
- ⚠️ Maneja claves privadas (usar con precaución)

## Notas de Seguridad

- Las claves privadas se envían al servidor (considerar usar keystore en producción)
- Todos los comandos son sanitizados antes de ejecución
- Solo comandos permitidos pueden ejecutarse (allowlist)









