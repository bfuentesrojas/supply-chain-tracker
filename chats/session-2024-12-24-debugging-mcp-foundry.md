# Sesión: Debugging y Optimización del Servidor MCP Foundry
**Fecha**: 24 de Diciembre, 2024  
**Duración**: ~3h 20min  
**Modelo IA**: Claude Opus 4.5 (Cursor IDE)

## Resumen

Solución de errores recurrentes `ENOENT` en el servidor MCP para Foundry Tools. Implementación de múltiples estrategias de debugging y ejecución de comandos hasta encontrar la solución que replica exactamente el comportamiento exitoso de `health_check`.

## Problema Identificado

El servidor MCP reportaba errores `ENOENT` al ejecutar comandos `forge_test` y `forge_build` desde Claude Desktop, aunque el archivo existía y `health_check` funcionaba correctamente.

**Observación crítica**:
- ✅ `health_check` funciona usando `execFileAsync` sin `cwd`
- ❌ `forge_test`/`forge_build` fallaban con múltiples estrategias

**Error típico**:
```
Comando no encontrado: forge. El archivo existe (/home/bfuentes/.foundry/bin/forge) 
pero execFile falló con ENOENT.
Error shell: spawn /bin/sh ENOENT
```

## Estrategias Implementadas

### 1. Logging Detallado
- Sistema de logging con `DEBUG_FOUNDRY=true`
- Logs de rutas, PATH, argumentos, estadísticas de binarios
- Diagnóstico mejorado de errores ENOENT

### 2. Verificación Robusta de Rutas
- Resolución de symlinks con `realpath()`
- Verificación de tipo de archivo (no directorio)
- Verificación de permisos de ejecución
- Validación del cache antes de usar

### 3. Múltiples Estrategias de Ejecución

#### Estrategia 1: spawn() directamente
- Intentó usar `spawn()` en lugar de `execFile()`
- Falló con `spawn /bin/sh ENOENT` (shell no disponible desde Claude Desktop)

#### Estrategia 2: execFileAsync con /usr/bin/env
- Intento de usar `/usr/bin/env` como wrapper
- Falló con `spawn /usr/bin/env ENOENT`

#### Estrategia 3: exec() con shell
- Fallback a `exec()` con shell
- Falló con `spawn /bin/sh ENOENT`

#### Estrategia Final: Replicar health_check
- **Solución exitosa**: Replicar exactamente el entorno de `health_check`
- Lógica condicional para `cwd`:
  - Si se especifica `cwd` explícitamente → usarlo directamente
  - Si NO se especifica → intentar sin `cwd` primero (como `health_check`)
- Mismo `env` que `health_check`

## Cambios Implementados

### Archivo: `web/src/lib/foundryTools.ts`

1. **Mejoras en `findFoundryBinary()`**:
   - Verificación de cache con validación de existencia
   - Verificación de tipo de archivo
   - Verificación de permisos de ejecución

2. **Mejoras en `executeFoundryCommand()`**:
   ```typescript
   // Lógica condicional para cwd
   if (options.cwd || cwd !== SC_DIR) {
     // cwd explícito - usar directamente
     execFileAsync(resolvedBinaryPath, sanitizedArgs, { cwd, env: healthCheckEnv, ... })
   } else {
     // Sin cwd explícito - intentar sin cwd primero (como health_check)
     try {
       execFileAsync(resolvedBinaryPath, sanitizedArgs, { env: healthCheckEnv, ... })
     } catch {
       // Fallback con cwd
       execFileAsync(resolvedBinaryPath, sanitizedArgs, { cwd, env: healthCheckEnv, ... })
     }
   }
   ```

3. **Entorno replicado**:
   ```typescript
   const healthCheckEnv = {
     ...process.env,
     PATH: `${process.env.HOME}/.foundry/bin:${process.env.PATH || ''}`
   }
   ```

## Comparación de Estrategias

| Estrategia | Resultado | Notas |
|-----------|-----------|-------|
| `execFileAsync` con `cwd` | ❌ ENOENT | Falla desde Claude Desktop |
| `spawn()` directamente | ❌ spawn /bin/sh ENOENT | Shell no disponible |
| `/usr/bin/env` wrapper | ❌ spawn /usr/bin/env ENOENT | Mismo problema |
| `exec()` con shell | ❌ spawn /bin/sh ENOENT | Shell no disponible |
| Replicar `health_check` | ✅ Funciona | Sin `cwd` o con `cwd` según necesidad |

## Archivos Modificados

- `web/src/lib/foundryTools.ts`: Lógica condicional de `cwd`, verificación robusta de rutas
- `~/.config/Claude/claude_desktop_config.json`: `DEBUG_FOUNDRY=true` agregado

## Tiempo Estimado

| Tarea | Tiempo |
|-------|--------|
| Análisis del problema | 30 min |
| Implementación estrategia 1 (spawn) | 30 min |
| Implementación estrategia 2 (/usr/bin/env) | 20 min |
| Implementación estrategia 3 (exec) | 20 min |
| Implementación estrategia final (replicar health_check) | 40 min |
| Testing y correcciones | 60 min |
| Documentación | 20 min |
| **Total** | **~220 minutos (~3h 40min)** |

## Resultado

El servidor MCP ahora puede:
- ✅ Ejecutar `forge_test` correctamente
- ✅ Ejecutar `forge_build` correctamente
- ✅ Ejecutar todos los comandos Foundry desde Claude Desktop
- ✅ Manejar diferentes contextos de ejecución (con/sin `cwd`)

## Lecciones Aprendidas

1. **Replicar estrategias exitosas**: Si `health_check` funciona, replicar su entorno exactamente
2. **Importancia del entorno**: Diferencias sutiles en `cwd` y `env` pueden causar fallos
3. **Debugging sistemático**: Logging detallado es esencial para diagnosticar problemas complejos
4. **Múltiples intentos**: Probar diferentes estrategias hasta encontrar la que funciona
5. **Contexto de ejecución**: Claude Desktop tiene restricciones de entorno que afectan la ejecución de procesos

---

*Última actualización: Diciembre 2024*
