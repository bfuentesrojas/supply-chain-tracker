# Configuración de Claude Desktop para MCP Foundry Tools

Este documento explica cómo configurar Claude Desktop para usar el servidor MCP de Foundry Tools.

## Archivo de Configuración

El archivo de configuración de Claude Desktop se encuentra en:

```bash
~/.config/Claude/claude_desktop_config.json
```

## Configuración Recomendada

Agrega la siguiente configuración a tu archivo `claude_desktop_config.json`:

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

**Nota**: Ajusta las rutas según tu instalación específica (Foundry, Node.js, y proyecto).

## Variables de Entorno Explicadas

### PATH
Incluye todas las rutas necesarias para que Node.js pueda ejecutar binarios:
- `~/.foundry/bin` - Binarios de Foundry (forge, anvil, cast)
- `~/.nvm/versions/node/v*/bin` - Node.js y npm
- Rutas del sistema (`/usr/bin`, `/bin`, etc.) - Necesarias para ejecutar `/bin/sh`

### HOME
Directorio home del usuario. Usado para encontrar archivos de configuración.

### USER
Nombre de usuario del sistema.

### NODE_ENV
Entorno de ejecución de Node.js. `production` para mejor rendimiento.

### SHELL
Shell predeterminado del sistema.

### CONTRACTS_DIR
Ruta explícita al directorio de contratos donde está `foundry.toml`. El servidor MCP también puede detectar esta ruta automáticamente si no está configurada.

### DEBUG_FOUNDRY (opcional)
Si se establece en `"true"`, habilita logging detallado para debugging.

## Instalación

### Paso 1: Verificar requisitos

Asegúrate de tener instalado:
- Foundry (`forge`, `anvil`, `cast`)
- Node.js v18+
- Claude Desktop

### Paso 2: Configurar el archivo

1. Abre o crea el archivo de configuración:
   ```bash
   nano ~/.config/Claude/claude_desktop_config.json
   ```

2. Agrega la configuración `foundry-tools` dentro de `mcpServers` (si ya tienes otros servidores MCP, agrega esta sección al objeto existente).

3. Ajusta las rutas según tu instalación:
   - Ruta de Foundry: `which forge` (típicamente `~/.foundry/bin`)
   - Ruta de Node.js: `which node` (puede estar en `~/.nvm/versions/node/v*/bin`)
   - Ruta del proyecto: ajusta según donde esté tu proyecto

### Paso 3: Reiniciar Claude Desktop

Después de modificar la configuración, **debes reiniciar Claude Desktop** para que los cambios surtan efecto.

## Verificación

Después de reiniciar Claude Desktop:

1. Abre Claude Desktop
2. Deberías ver el servidor `foundry-tools` listado como disponible
3. Prueba ejecutando un comando como:
   - `forge_test` - Ejecutar tests
   - `forge_build` - Compilar contratos
   - `health_check` - Verificar estado de herramientas

## Herramientas Disponibles

El servidor MCP expone las siguientes herramientas Foundry:

1. **forge_build** - Compila smart contracts
2. **forge_test** - Ejecuta tests con verbosidad configurable
3. **forge_script** - Ejecuta scripts de Foundry
4. **anvil_start** - Inicia servidor Anvil
5. **anvil_stop** - Detiene servidor Anvil
6. **anvil_restart** - Reinicia servidor Anvil
7. **cast_call** - Ejecuta llamadas de solo lectura a contratos
8. **cast_send** - Envía transacciones a contratos
9. **cast_balance** - Consulta balance de una cuenta
10. **cast_fund** - Fondea una cuenta con ETH
11. **health_check** - Verifica estado de herramientas Foundry

## Solución de Problemas

### El servidor no aparece

1. Verifica que el archivo JSON es válido:
   ```bash
   python3 -m json.tool ~/.config/Claude/claude_desktop_config.json
   ```

2. Verifica que las rutas existen:
   ```bash
   test -f /home/bfuentes/codecrypto/supply-chain-tracker/backend/src/server/mcp-server.ts && echo "OK" || echo "Archivo no existe"
   test -d /home/bfuentes/codecrypto/supply-chain-tracker/contracts && echo "OK" || echo "Directorio no existe"
   ```

3. Verifica que npx y tsx están disponibles:
   ```bash
   which npx
   which tsx
   ```

### Errores de ejecución (ENOENT)

Si encuentras errores `ENOENT` al ejecutar comandos:

1. El servidor MCP usa `exec()` con `cd` en el comando para evitar problemas con `spawn` y `cwd` en Claude Desktop
2. Verifica que el PATH incluye todas las rutas necesarias
3. Habilita `DEBUG_FOUNDRY=true` en las variables de entorno para ver logs detallados
4. Verifica que Foundry está instalado:
   ```bash
   forge --version
   anvil --version
   cast --version
   ```

### Error: Directorio contracts no encontrado

Si el servidor no puede encontrar el directorio `contracts/`:

1. Verifica que `CONTRACTS_DIR` está configurado correctamente en las variables de entorno
2. El servidor también puede detectar automáticamente el directorio buscando `foundry.toml` hacia arriba desde el `cwd`
3. Asegúrate de que `cwd` apunta al directorio `backend/` del proyecto

## Arquitectura Técnica

El servidor MCP (`backend/src/server/mcp-server.ts`) implementa:

- **Resolución dinámica de directorios**: Detecta automáticamente el directorio `contracts/` buscando `foundry.toml` hacia arriba desde el directorio actual, o usa `CONTRACTS_DIR` si está configurado
- **Ejecución robusta**: Usa `exec()` con comandos completos (incluyendo `cd`) en lugar de `execFile` con `cwd` para evitar problemas con restricciones de `spawn` en Claude Desktop
- **PATH mejorado**: Construye un PATH completo que incluye rutas de Foundry y del sistema para asegurar que todos los binarios sean encontrados
- **Validación de instalación**: Función `validateFoundryInstallation()` que verifica que todas las herramientas estén disponibles al inicio

## Personalización

Si tu instalación es diferente, ajusta estas rutas:

- **Foundry**: Actualiza la ruta en `PATH` (típicamente `~/.foundry/bin`)
- **Node.js**: Actualiza la ruta en `PATH` (puede estar en `~/.nvm/versions/node/v*/bin` o `/usr/bin`)
- **Proyecto**: Actualiza la ruta del script MCP en `args` y `CONTRACTS_DIR` en `env`
- **Usuario**: Actualiza `HOME` y `USER` en `env`

