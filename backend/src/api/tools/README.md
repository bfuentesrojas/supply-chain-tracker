# MCP Foundry Tools API

API server-side para invocar herramientas Foundry (forge, anvil, cast) de forma segura.

## Endpoints

### GET `/api/tools/health`
Verifica el estado de las herramientas Foundry instaladas.

**Respuesta:**
```json
{
  "success": true,
  "tools": {
    "forge": { "available": true, "version": "..." },
    "anvil": { "available": true, "version": "..." },
    "cast": { "available": true, "version": "..." }
  },
  "anvil": {
    "running": true,
    "port": 8545
  },
  "timestamp": "2025-01-..."
}
```

### POST `/api/tools/forge/build`
Compila los smart contracts.

**Body:**
```json
{
  "skipTest": false,
  "extraArgs": []
}
```

**Respuesta:**
```json
{
  "success": true,
  "command": "forge build",
  "stdout": "...",
  "stderr": "",
  "timestamp": "..."
}
```

### POST `/api/tools/forge/test`
Ejecuta tests.

**Body:**
```json
{
  "matchTest": "testCreateToken",
  "verbosity": 2,
  "extraArgs": []
}
```

**Respuesta:**
```json
{
  "success": true,
  "command": "forge test -vv",
  "stdout": "...",
  "stderr": "",
  "summary": {
    "passed": 55,
    "failed": 0,
    "skipped": 0
  },
  "timestamp": "..."
}
```

### POST `/api/tools/anvil/start`
Inicia Anvil en background.

**Body:**
```json
{
  "host": "0.0.0.0",
  "port": 8545,
  "chainId": 31337,
  "blockTime": 1,
  "extraArgs": []
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Anvil iniciado correctamente",
  "pid": 12345,
  "port": 8545,
  "host": "0.0.0.0",
  "timestamp": "..."
}
```

### POST `/api/tools/anvil/stop`
Detiene Anvil si está corriendo.

**Respuesta:**
```json
{
  "success": true,
  "message": "Anvil detenido correctamente",
  "pid": 12345,
  "timestamp": "..."
}
```

### POST `/api/tools/cast/call`
Ejecuta una llamada a un contrato.

**Body:**
```json
{
  "address": "0x...",
  "functionSignature": "admin()",
  "rpcUrl": "http://127.0.0.1:8545",
  "extraArgs": []
}
```

**Respuesta:**
```json
{
  "success": true,
  "command": "cast call ...",
  "address": "0x...",
  "functionSignature": "admin()",
  "result": "0x...",
  "timestamp": "..."
}
```

### POST `/api/tools/cast/send`
Envía una transacción.

**Body:**
```json
{
  "address": "0x...",
  "functionSignature": "transfer(address,uint256)",
  "value": "1ether",
  "privateKey": "0x...",
  "rpcUrl": "http://127.0.0.1:8545",
  "extraArgs": []
}
```

**Respuesta:**
```json
{
  "success": true,
  "command": "cast send ...",
  "address": "0x...",
  "transactionHash": "0x...",
  "timestamp": "..."
}
```

## Seguridad

- **Sanitización**: Todos los argumentos son sanitizados antes de ejecución
- **Allowlist**: Solo comandos permitidos pueden ejecutarse
- **Validación**: Inputs validados con Zod
- **Timeouts**: Comandos tienen timeouts para prevenir bloqueos
- **execFile**: Usa execFile en lugar de exec para mayor seguridad

## Notas

- Los comandos se ejecutan desde el directorio `sc/`
- Anvil se ejecuta en background (detached process)
- Las claves privadas en cast/send deben manejarse con cuidado (considerar keystore en producción)










