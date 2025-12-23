# Guía de Uso - Supply Chain Tracker

## 🚀 Inicio Rápido

### 1. Iniciar el Ambiente Completo

La forma más fácil de iniciar todo el ambiente es usar el script unificado:

```bash
./start-all.sh
```

Este script automáticamente:
1. Inicia el servidor MCP API (puerto 3001)
2. Compila los smart contracts
3. Inicia Anvil (blockchain local)
4. Despliega el contrato
5. Fondea las cuentas de prueba
6. Inicia el frontend (puerto 3000)

### 2. Configurar MetaMask

1. **Agregar la red Anvil Local**:
   - Abre MetaMask
   - Ve a Configuración → Redes → Agregar Red
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Símbolo: `ETH`

2. **Importar cuenta de prueba**:
   - Ve a MetaMask → Importar cuenta
   - Usa la clave privada de la cuenta admin:
     ```
     0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
     ```
   - Esta cuenta tiene el rol de **Admin** automáticamente

### 3. Acceder a la Aplicación

Abre tu navegador y ve a: **http://localhost:3000**

## 📋 Primeros Pasos

### Para Usuarios Nuevos (No Admin)

1. **Conectar tu wallet en MetaMask**
   - Asegúrate de estar en la red Anvil Local (Chain ID: 31337)

2. **Solicitar un Rol**
   - La aplicación detectará que no tienes un rol asignado
   - Ve a **Dashboard** o **Productos**
   - Verás un formulario para solicitar un rol
   - Selecciona tu rol:
     - 🏭 **Fabricante**: Si produces productos
     - 🚚 **Distribuidor**: Si transportas productos
     - 🏪 **Minorista**: Si vendes productos
     - 👤 **Consumidor**: Si eres el usuario final

3. **Esperar Aprobación**
   - El Admin debe aprobar tu solicitud
   - Una vez aprobado, podrás usar todas las funcionalidades según tu rol

### Para el Admin

La cuenta admin (`0xeD252BAc2D88971cb5B393B0760f05AF27413b91`) ya está registrada automáticamente. Solo necesitas:

1. Conectar tu wallet (la cuenta admin)
2. Ir a **Admin** (`/admin`) para aprobar usuarios
3. Comenzar a gestionar la cadena de suministro

## 🎯 Funcionalidades por Rol

### 👑 Admin

**Funcionalidades disponibles:**
- ✅ Ver todos los usuarios del sistema
- ✅ Aprobar/rechazar/suspender usuarios
- ✅ Ver todas las estadísticas (tokens, usuarios, transferencias)
- ✅ Crear cualquier tipo de token
- ✅ Transferir tokens a cualquier usuario (sin restricciones de cadena de suministro)
- ✅ Gestionar recalls (retirar productos del mercado)

**Flujo típico:**
1. Aprobar usuarios que solicitan roles
2. Crear productos iniciales si es necesario
3. Monitorear la cadena de suministro

### 🏭 Fabricante

**Funcionalidades disponibles:**
- ✅ Crear materias primas (API_MP)
- ✅ Crear recetas (BOM) usando materias primas
- ✅ Crear lotes (PT_LOTE) usando recetas
- ✅ Transferir productos a distribuidores
- ✅ Ver tus productos y su trazabilidad

**Flujo típico:**
1. Crear materias primas: `/products` → Crear Token → Tipo: API_MP
2. Crear receta (BOM): Selecciona las materias primas como padres
3. Crear lote (PT_LOTE): Selecciona la receta como padre (el sistema descontará automáticamente las materias primas)
4. Transferir a distribuidor: Selecciona un distribuidor aprobado

### 🚚 Distribuidor

**Funcionalidades disponibles:**
- ✅ Recibir productos de fabricantes
- ✅ Transferir productos a minoristas
- ✅ Ver productos recibidos y enviados
- ✅ Crear unidades logísticas (SSCC) para agrupar productos

**Flujo típico:**
1. Aceptar transferencias pendientes desde fabricantes
2. Crear unidades logísticas (SSCC) para agrupar productos
3. Transferir a minoristas aprobados

### 🏪 Minorista

**Funcionalidades disponibles:**
- ✅ Recibir productos de distribuidores
- ✅ Transferir productos a consumidores
- ✅ Ver productos recibidos y enviados

**Flujo típico:**
1. Aceptar transferencias pendientes desde distribuidores
2. Transferir a consumidores aprobados

### 👤 Consumidor

**Funcionalidades disponibles:**
- ✅ Recibir productos de minoristas
- ✅ Ver la trazabilidad completa de productos
- ✅ Ver historial de transferencias
- ❌ **NO puede crear tokens**
- ❌ **NO puede transferir tokens**

**Flujo típico:**
1. Aceptar transferencias pendientes desde minoristas
2. Verificar la trazabilidad de productos recibidos en `/track`

## 📦 Tipos de Tokens

### 1. API_MP (Materia Prima)
- **Qué es**: Materias primas o ingredientes activos
- **Ejemplo**: Paracetamol USP, Excipiente X
- **Características**:
  - Puede tener múltiples padres opcionales
  - Es el inicio de la cadena de suministro

### 2. BOM (Bill of Materials / Receta)
- **Qué es**: Receta que define qué componentes necesita un producto
- **Ejemplo**: Receta de Paracetamol 500mg
- **Características**:
  - Debe tener como padres las materias primas (API_MP) con cantidades
  - Define cuántas unidades de cada materia prima se necesitan por unidad de producto

### 3. PT_LOTE (Producto Terminado - Lote)
- **Qué es**: Lote de productos terminados
- **Ejemplo**: Lote #12345 de Paracetamol 500mg
- **Características**:
  - **Requiere exactamente UN padre** que sea una receta (BOM)
  - El sistema descontará automáticamente las materias primas necesarias de tu balance
  - Valida que tengas suficientes componentes antes de crear el lote

### 4. SSCC (Unidad Logística)
- **Qué es**: Unidad de empaque/logística (pallets, cajas, etc.)
- **Ejemplo**: Pallet SSCC123456789012345678
- **Características**:
  - **Requiere exactamente UN padre** que sea un lote (PT_LOTE)
  - El sistema descontará automáticamente unidades del lote

### 5. COMPLIANCE_LOG (Registro de Cumplimiento)
- **Qué es**: Registros de temperatura, CAPA, o recalls
- **Ejemplo**: Log de temperatura, Recall por contaminación
- **Características**:
  - Puede tener múltiples padres
  - **Puede marcar recall** para retirar productos del mercado
  - Si marca recall, retira toda la cadena de suministro relacionada

## 🔄 Flujo Completo de Ejemplo

### Escenario: Fabricar y distribuir Paracetamol

1. **Fabricante crea Materias Primas**:
   - API_MP: "Paracetamol USP"
   - API_MP: "Almidón"

2. **Fabricante crea Receta (BOM)**:
   - BOM: "Receta Paracetamol 500mg"
   - Padres: 10 unidades de "Paracetamol USP" + 5 unidades de "Almidón"

3. **Fabricante crea Lote**:
   - PT_LOTE: "Lote #12345"
   - Padre: "Receta Paracetamol 500mg"
   - Cantidad: 1000 unidades
   - El sistema descontará automáticamente: 10,000 unidades de Paracetamol USP y 5,000 unidades de Almidón

4. **Fabricante transfiere a Distribuidor**:
   - Selecciona el lote
   - Selecciona un distribuidor aprobado
   - El distribuidor debe aceptar la transferencia

5. **Distribuidor crea Unidad Logística (SSCC)**:
   - SSCC: "Pallet ABC123..."
   - Padre: Lote recibido
   - El sistema descontará unidades del lote

6. **Distribuidor transfiere a Minorista**:
   - Selecciona el SSCC o el lote
   - Selecciona un minorista aprobado

7. **Minorista transfiere a Consumidor**:
   - Selecciona el producto
   - Selecciona un consumidor aprobado

8. **Consumidor verifica trazabilidad**:
   - Va a `/track?id=<token-id>`
   - Ve toda la cadena: desde materias primas hasta el producto final

## 🚨 Sistema de Recall (Retiro de Productos)

### Cuándo usar Recall

Cuando necesites retirar productos del mercado por problemas de calidad o seguridad.

### Cómo crear un Recall

1. Ve a `/products` o `/tokens/create`
2. Selecciona tipo: **COMPLIANCE_LOG**
3. Marca el checkbox **"Recall"**
4. Selecciona el producto padre que quieres retirar
5. Confirma la creación (aparecerá una advertencia)

### Efectos del Recall

- ✅ Marca el producto como "Retirado"
- ✅ Marca toda la cadena de suministro relacionada como retirada
- ✅ Bloquea futuras transferencias del producto
- ✅ Bloquea usar el producto como padre en nuevos tokens
- ✅ Muestra badge "Retirado" en todas las vistas

### Para Consumidores

Si recibes un producto retirado:
- Verás un badge "Retirado" con un icono de información
- Al hacer clic, verás instrucciones sobre qué hacer con el producto

## 🛠️ Herramientas MCP (`/tools`)

Página para desarrolladores que permite:

- **Health Check**: Verificar estado de Anvil y herramientas
- **Forge Build**: Compilar contratos
- **Forge Test**: Ejecutar tests
- **Anvil Start/Stop/Restart**: Gestionar Anvil
- **Fondear Cuentas**: Enviar ETH a cuentas de prueba

## 💡 Consejos y Mejores Prácticas

1. **Siempre verifica el balance** antes de crear lotes
   - El sistema valida automáticamente, pero es bueno verificar primero

2. **Usa nombres descriptivos** para tus tokens
   - Ejemplo: "Paracetamol 500mg - Lote #12345" en lugar de "Lote1"

3. **Completa el JSON de features** correctamente
   - Es obligatorio y contiene información importante del producto
   - Sigue las validaciones GS1 cuando aplique

4. **Revisa la trazabilidad** antes de aceptar transferencias
   - Usa `/track?id=<token-id>` para ver toda la cadena

5. **Para Admin**: Aprueba usuarios rápidamente para mantener el flujo

## ❓ Preguntas Frecuentes

### ¿Por qué no puedo transferir un token?

Posibles razones:
- El token está marcado como "Retirado" (recall)
- No tienes balance suficiente del token
- El destinatario no tiene el rol correcto según la cadena de suministro
- El destinatario no está aprobado

### ¿Cómo sé cuánto balance tengo de un token?

En la página `/products` o `/dashboard`, verás tu lista de tokens con sus balances.

### ¿Qué pasa si intento crear un lote sin componentes suficientes?

El sistema te mostrará un mensaje de error indicando:
- Qué componente falta
- Cuánto tienes disponible
- Cuánto necesitas

### ¿Puedo cambiar mi rol después de ser aprobado?

No directamente. Debes contactar al Admin para que cambie tu rol manualmente.

### ¿Cómo veo la trazabilidad completa de un producto?

1. Ve a `/track`
2. Ingresa el ID del token
3. O haz clic en cualquier token desde `/products` o `/dashboard`

---

**¿Necesitas más ayuda?** Revisa el README.md para más detalles técnicos o consulta la documentación del código.



