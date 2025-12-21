# Datos de Prueba para Cast Call y Cast Send

## Información General

- **Contrato**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **RPC URL**: `http://127.0.0.1:8545`
- **Chain ID**: `31337` (0x7a69)

## Cuentas de Anvil (para claves privadas en cast send)

Anvil incluye 20 cuentas predefinidas. Aquí están las primeras 5:

1. **Cuenta 0** (Admin por defecto):
   - Dirección: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
   - Clave privada: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

2. **Cuenta 1**:
   - Dirección: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
   - Clave privada: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`

3. **Cuenta 2**:
   - Dirección: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`
   - Clave privada: `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a`

## Ejemplos para Cast Call (funciones view - solo lectura)

### 1. Obtener la dirección del admin

```json
{
  "address": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "functionSignature": "admin()",
  "args": []
}
```

**Resultado esperado**: Dirección del admin (ej: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`)

---

### 2. Obtener el próximo ID de token

```json
{
  "address": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "functionSignature": "nextTokenId()",
  "args": []
}
```

**Resultado esperado**: Número del próximo token ID (ej: `3` si ya hay 2 tokens creados)

---

### 3. Obtener información de un usuario

```json
{
  "address": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "functionSignature": "getUserInfo(address)",
  "args": ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"],
  "rpcUrl": "http://127.0.0.1:8545"
}
```

**Resultado esperado**: Tupla con (id, userAddress, role, status)

**Importante**: La propiedad `args` debe ser un array con los valores de los parámetros de la función.

---

### 4. Obtener información de un token (si existe)

```json
{
  "address": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "functionSignature": "getToken(uint256)",
  "args": ["1"],
  "rpcUrl": "http://127.0.0.1:8545"
}
```

**Resultado esperado**: Estructura completa del token con id, name, creator, totalSupply, features, etc.

**Importante**: Los valores en `args` deben ser strings. Los números se pasan como strings (ej: `"1"`).

---

### 5. Obtener balance de un token para una dirección

```json
{
  "address": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "functionSignature": "getTokenBalance(uint256,address)",
  "args": ["1", "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"]
}
```

**Resultado esperado**: Cantidad de tokens (BigInt)

**Nota**: Usa `getTokenBalance` en lugar de `balanceOf` según el ABI del contrato.

---

### 6. Verificar si una dirección es admin

```json
{
  "address": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "functionSignature": "isAdmin(address)",
  "args": ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"]
}
```

**Resultado esperado**: `true` o `false`

---

## Ejemplos para Cast Send (funciones que modifican estado)

### 1. Solicitar un rol de usuario (cualquier cuenta)

```json
{
  "address": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "functionSignature": "requestUserRole(string)",
  "args": ["manufacturer"],
  "privateKey": "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "rpcUrl": "http://127.0.0.1:8545"
}
```

**Nota**: 
- Usa una cuenta que no esté registrada. Si usas la cuenta 1, cambia a cuenta 2.
- La firma de función **debe incluir paréntesis con los tipos de parámetros**: `"requestUserRole(string)"`
- Los argumentos van en el array `args`: `["manufacturer"]`

---

### 2. Cambiar estado de usuario (solo admin)

```json
{
  "address": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "functionSignature": "changeStatusUser(address,uint8)",
  "args": [
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "1"
  ],
  "privateKey": "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  "rpcUrl": "http://127.0.0.1:8545"
}
```

**Nota**: 
- Usa la clave privada del admin (cuenta 0)
- Estado: `0` = Pending, `1` = Approved, `2` = Rejected, `3` = Canceled
- La dirección es de la cuenta 1 (que debe haber solicitado un rol primero)

---

### 3. Crear un token (solo usuarios aprobados)

Primero, necesitas tener una cuenta aprobada. Si la cuenta 0 es admin, puedes aprobar otra cuenta primero.

```json
{
  "address": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "functionSignature": "createToken(string,uint256,string,uint8,uint256[],uint256[],bool)",
  "args": [
    "Materia Prima Test",
    "1000",
    "{\"type\":\"organic\",\"labels\":{\"display_name\":\"Materia Prima Orgánica\"}}",
    "0",
    "[]",
    "[]",
    "false"
  ],
  "privateKey": "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "rpcUrl": "http://127.0.0.1:8545"
}
```

**Nota**: 
- Tipo de token: `0` = API_MP, `1` = BOM, `2` = PT_LOTE, `3` = SSCC, `4` = COMPLIANCE_LOG
- Arrays vacíos: `[]` en el JSON, pero cast send necesita formato específico
- **Importante**: Para cast send, los arrays deben pasarse como strings separados por espacios, no como JSON arrays

---

### 4. Transferir tokens (solo usuarios aprobados)

```json
{
  "address": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "functionSignature": "transfer(address,uint256,uint256)",
  "args": [
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "1",
    "100"
  ],
  "privateKey": "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "rpcUrl": "http://127.0.0.1:8545"
}
```

**Nota**: 
- Debe tener balance suficiente del token
- La dirección destino es la cuenta 2

---

## Formato Correcto para Cast Send con Arrays

**Importante**: Cuando una función requiere arrays (`uint256[]`), `cast send` espera los argumentos de forma diferente:

### Ejemplo: createToken con arrays

Si necesitas pasar arrays vacíos, no uses `[]` en JSON. En cambio, usa:

```bash
# Para arrays vacíos, simplemente no pases nada o pasa espacios vacíos
cast send 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  "createToken(string,uint256,string,uint8,uint256[],uint256[],bool)" \
  "Materia Prima" \
  1000 \
  '{"type":"organic"}' \
  0 \
  "" \
  "" \
  false \
  --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d \
  --rpc-url http://127.0.0.1:8545
```

Para arrays con valores:

```bash
cast send 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  "createToken(string,uint256,string,uint8,uint256[],uint256[],bool)" \
  "Lote Test" \
  500 \
  '{"batch":"A001"}' \
  2 \
  "[1]" \
  "[100]" \
  false \
  --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d \
  --rpc-url http://127.0.0.1:8545
```

---

## Estados de Usuario (UserStatus)

- `0` = Pending (Pendiente)
- `1` = Approved (Aprobado)
- `2` = Rejected (Rechazado)
- `3` = Canceled (Cancelado)

## Tipos de Token (TokenType)

- `0` = API_MP (Materia Prima)
- `1` = BOM (Receta/Composición)
- `2` = PT_LOTE (Producto Terminado - Lote)
- `3` = SSCC (Unidad Lógica)
- `4` = COMPLIANCE_LOG (Registro de Cumplimiento)

---

## Notas Importantes

1. **Anvil debe estar corriendo** en `http://127.0.0.1:8545`
2. **El contrato debe estar desplegado** en la dirección especificada
3. **Las cuentas tienen ETH** automáticamente en Anvil
4. **Para cast send**, asegúrate de que la cuenta tenga el rol/permisos necesarios
5. **Los arrays en cast send** pueden requerir formato específico dependiendo de la implementación de tu API

---

## Orden Recomendado para Pruebas

1. **Cast Call**: Verificar admin, nextTokenId, getUserInfo (para verificar estado inicial)
2. **Cast Send**: requestUserRole con cuenta 1
3. **Cast Call**: Verificar que el usuario se registró (getUserInfo)
4. **Cast Send**: changeStatusUser (aprobar cuenta 1) con admin
5. **Cast Call**: Verificar que el usuario está aprobado
6. **Cast Send**: createToken con cuenta 1 (ahora aprobada)
7. **Cast Call**: Verificar token creado (getToken, nextTokenId)
8. **Cast Send**: transfer tokens entre cuentas
