# Sesión: Configuración de Claude Desktop y Servidor MCP Foundry Tools

**Fecha**: 26 de Enero, 2025  
**IA**: Claude (Auto) via Cursor IDE  
**Idioma**: Español

---

## Contexto

El servidor MCP (Model Context Protocol) para herramientas Foundry experimentaba problemas al ejecutar comandos desde Claude Desktop:

1. **Error ENOENT**: `forge test` y otros comandos fallaban con errores de "No such file or directory"
2. **Resolución de directorio**: El código intentaba usar `/usr/lib/contracts` en lugar de la ruta correcta del proyecto
3. **Restricciones de spawn**: Claude Desktop tiene limitaciones para ejecutar procesos externos con `execFileAsync` cuando se usa `cwd`

## Problemas Identificados

### Problema 1: Directorio contracts/ no encontrado

**Error observado**:
```
Command failed: cd "/usr/lib/contracts" && /home/bfuentes/.foundry/bin/forge "test" "-vv"
/bin/bash: line 1: cd: /usr/lib/contracts: No such file or directory
```

**Causa**: El código usaba `join(process.cwd(), '..')` que asumía una estructura fija, pero `process.cwd()` en Claude Desktop no era el directorio esperado.

**Solución**: Implementar búsqueda dinámica del directorio `contracts/` buscando `foundry.toml` hacia arriba desde el directorio actual.

### Problema 2: Restricciones de spawn en Claude Desktop

**Observación**: `health_check` funcionaba correctamente usando `execFileAsync` sin `cwd`, pero `forge test` fallaba cuando usaba `cwd` en las opciones.

**Causa**: Claude Desktop tiene restricciones para ejecutar procesos externos con `execFileAsync` cuando se especifica `cwd` en las opciones, causando errores `ENOENT` para `/bin/sh`.

**Solución**: Cambiar estrategia a usar `exec()` con un comando completo que incluye `cd` antes del comando, evitando usar `cwd` en las opciones.

## Cambios Implementados

### 1. Resolución Dinámica de Directorio Contracts

**Archivo**: `backend/src/lib/foundryTools.ts`

**Función `resolveContractsDir()`**:
```typescript
async function resolveContractsDir(): Promise<string> {
  // 1. Verificar variable de entorno CONTRACTS_DIR si está configurada
  if (process.env.CONTRACTS_DIR) {
    const envContractsDir = resolve(process.env.CONTRACTS_DIR)
    const foundryTomlPath = join(envContractsDir, 'foundry.toml')
    try {
      await access(foundryTomlPath, constants.F_OK)
      return envContractsDir
    } catch {
      // Continuar con búsqueda dinámica
    }
  }
  
  // 2. Búsqueda dinámica navegando hacia arriba
  const currentDir = process.cwd()
  let searchDir = currentDir
  if (currentDir.endsWith('backend') || currentDir.endsWith('backend/')) {
    searchDir = resolve(currentDir, '..')
  }
  
  // 3. Buscar hacia arriba hasta encontrar contracts/foundry.toml
  let dir = resolve(searchDir)
  const root = resolve('/')
  
  while (dir !== root && dir !== dirname(dir)) {
    const contractsPath = join(dir, 'contracts')
    const foundryTomlPath = join(contractsPath, 'foundry.toml')
    
    try {
      await access(foundryTomlPath, constants.F_OK)
      return contractsPath
    } catch {
      // Continuar hacia arriba
    }
    
    dir = dirname(dir)
  }
  
  // 4. Fallback
  const fallbackRoot = currentDir.endsWith('backend') || currentDir.endsWith('backend/')
    ? resolve(currentDir, '..')
    : currentDir
  return join(fallbackRoot, 'contracts')
}
```

**Función `getContractsDir()` con cache**:
```typescript
let CONTRACTS_DIR_CACHE: string | null = null

async function getContractsDir(): Promise<string> {
  if (!CONTRACTS_DIR_CACHE) {
    CONTRACTS_DIR_CACHE = await resolveContractsDir()
  }
  return CONTRACTS_DIR_CACHE
}
```

### 2. Estrategia de Ejecución Robusta

**Cambio en `executeFoundryCommand()`**:

**Antes** (fallaba):
```typescript
const { stdout, stderr } = await execFileAsync(
  resolvedBinaryPath,
  sanitizedArgs,
  {
    cwd,  // ❌ Causa problemas con spawn en Claude Desktop
    timeout: options.timeout || DEFAULT_TIMEOUT,
    env: env,
    maxBuffer: 10 * 1024 * 1024
  }
)
```

**Ahora** (funciona):
```typescript
// Construir comando completo con cd incluido
const escapedCwd = cwd.replace(/'/g, "'\\''")
const escapedArgs = sanitizedArgs.map(arg => {
  const escaped = arg.replace(/"/g, '\\"').replace(/\$/g, '\\$')
  return `"${escaped}"`
}).join(' ')

const fullCommand = `cd "${escapedCwd}" && ${resolvedBinaryPath} ${escapedArgs}`

// Usar exec() sin cwd en opciones (el cd está en el comando mismo)
const { exec } = await import('child_process')
const { promisify } = await import('util')
const execAsync = promisify(exec)

const result = await execAsync(fullCommand, {
  // ✅ NO usar cwd aquí - el cd está en el comando mismo
  shell: '/bin/bash',  // ✅ Shell explícito
  timeout: options.timeout || DEFAULT_TIMEOUT,
  env: env,
  maxBuffer: 10 * 1024 * 1024
})
```

### 3. Configuración de Claude Desktop

**Archivo**: `claude_desktop_config.json`

**Configuración completa**:
```json
{
  "mcpServers": {
    "foundry-tools": {
      "command": "npx",
      "args": [
        "-y",
        "tsx",
        "/home/bfuentes/codecrypto/supply-chain-tracker/backend/src/server/mcp-server.ts"
      ],
      "env": {
        "PATH": "/home/bfuentes/.foundry/bin:/home/bfuentes/.nvm/versions/node/v22.18.0/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin",
        "HOME": "/home/bfuentes",
        "USER": "bfuentes",
        "NODE_ENV": "production",
        "SHELL": "/bin/bash",
        "CONTRACTS_DIR": "/home/bfuentes/codecrypto/supply-chain-tracker/contracts"
      },
      "cwd": "/home/bfuentes/codecrypto/supply-chain-tracker/backend"
    }
  }
}
```

**Variables clave**:
- `PATH`: Incluye rutas de Foundry, Node.js y sistema
- `CONTRACTS_DIR`: Ruta explícita al directorio de contratos (opcional, se detecta automáticamente si no está)
- `cwd`: Directorio `backend/` del proyecto

### 4. Documentación

**Archivo**: `docs/claude-desktop-config.md`

Incluye:
- Guía paso a paso de instalación
- Explicación de variables de entorno
- Lista de herramientas disponibles
- Sección de solución de problemas
- Arquitectura técnica

## Resultados

### Antes
- ❌ `forge test` fallaba con `ENOENT`
- ❌ Directorio incorrecto (`/usr/lib/contracts`)
- ❌ Restricciones de `spawn` con `cwd`

### Después
- ✅ `forge test` funciona correctamente
- ✅ Resolución dinámica del directorio `contracts/`
- ✅ Soporte para variable de entorno `CONTRACTS_DIR`
- ✅ Estrategia robusta que evita problemas con `spawn`
- ✅ Documentación completa

## Comandos de Prueba

Después de la configuración, estos comandos funcionan desde Claude Desktop:

1. **Verificar estado**:
   ```
   health_check
   ```

2. **Ejecutar tests**:
   ```
   forge_test
   ```

3. **Compilar contratos**:
   ```
   forge_build
   ```

## Lecciones Aprendidas

1. **Replicar estrategias exitosas**: `health_check` funcionaba porque no usaba `cwd`, replicar esa estrategia para otros comandos
2. **Resolución dinámica**: Buscar directorios automáticamente es más robusto que hardcodear rutas
3. **Variables de entorno**: Permitir configuración explícita mientras se mantiene detección automática
4. **Documentación clara**: Guías paso a paso son esenciales para configuración compleja
5. **Restricciones de entorno**: Claude Desktop tiene limitaciones específicas que requieren estrategias alternativas

## Archivos Modificados

- `backend/src/lib/foundryTools.ts`:
  - Función `resolveContractsDir()` - búsqueda dinámica
  - Función `getContractsDir()` - wrapper con cache
  - Función `executeFoundryCommand()` - estrategia de ejecución robusta

## Archivos Creados

- `docs/claude-desktop-config.md` - Guía completa de configuración
- `chats/session-2025-01-26-configuracion-claude-desktop-mcp.md` - Este documento

## Archivos Eliminados (movidos a docs/)

- `claude_desktop_config.json` - Movido a documentación (ejemplo en docs/)
- `claude_desktop_config.json.debug` - Movido a documentación (ejemplo en docs/)
- `CLAUDE_DESKTOP_SETUP.md` - Contenido migrado a `docs/claude-desktop-config.md`

---

**Nota**: Esta sesión documenta la solución completa para hacer funcionar el servidor MCP Foundry Tools desde Claude Desktop, resolviendo problemas de ejecución y resolución de directorios.

