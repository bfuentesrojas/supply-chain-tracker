# Resultados Esperados para Cast Call y Cast Send

## Función `admin()`

### Resultado Esperado (si el contrato está desplegado):

```
0x000000000000000000000000ed252bac2d88971cb5b393b0760f05af27413b91
```

**Explicación:**
- Es un valor ABI-encoded de tipo `address`
- Los primeros 12 bytes son ceros (padding)
- Los últimos 20 bytes son la dirección del admin: `0xed252bac2d88971cb5b393b0760f05af27413b91`
- Esta dirección está definida en el contrato como `ADMIN_ADDRESS`

### Resultado Actual (si el contrato NO está desplegado):

```
0x
```

O con warning:
```
Warning: Contract code is empty
Result: 0x
```

Esto significa que **el contrato no está desplegado** en esa dirección.

---

## Función `nextTokenId()`

### Resultado Esperado (si el contrato está desplegado):

```
0x0000000000000000000000000000000000000000000000000000000000000001
```

O si ya hay tokens creados:
```
0x0000000000000000000000000000000000000000000000000000000000000003
```

**Explicación:**
- Es un valor ABI-encoded de tipo `uint256`
- El valor `1` significa que el próximo token ID será 1 (ningún token creado aún)
- El valor `3` significa que ya hay 2 tokens (IDs 1 y 2), y el próximo será 3

**Para decodificar el resultado:**

Puedes usar `cast` para decodificar:
```bash
cast --to-dec 0x0000000000000000000000000000000000000000000000000000000000000001
# Resultado: 1
```

---

## Función `getUserInfo(address)`

### Ejemplo de llamada:
```json
{
  "address": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "functionSignature": "getUserInfo(address)",
  "args": ["0xeD252BAc2D88971cb5B393B0760f05AF27413b91"]
}
```

### Resultado Esperado (ABI-encoded tuple):

```
0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000ed252bac2d88971cb5b393b0760f05af27413b91000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000561646d696e000000000000000000000000000000000000000000000000000000
```

**Estructura del resultado (User struct):**
- `id`: uint256 (ej: 1)
- `userAddress`: address (ej: 0xed252bac2d88971cb5b393b0760f05af27413b91)
- `role`: string (ej: "admin")
- `status`: uint8 (0=Pending, 1=Approved, 2=Rejected, 3=Canceled)

**Nota:** Este resultado está codificado en ABI. Para decodificarlo, necesitarías el ABI del contrato.

---

## Función `getToken(uint256)`

### Ejemplo de llamada:
```json
{
  "address": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "functionSignature": "getToken(uint256)",
  "args": ["1"]
}
```

### Resultado Esperado (ABI-encoded tuple):

Un resultado largo en formato ABI que contiene:
- `id`: uint256
- `creator`: address
- `name`: string
- `totalSupply`: uint256
- `features`: string
- `tokenType`: uint8
- `parentIds`: uint256[]
- `parentAmounts`: uint256[]
- `dateCreated`: uint256
- `recall`: bool

---

## Cómo Decodificar Resultados

### Para valores simples (uint256, address):

```bash
# Decodificar uint256
cast --to-dec 0x0000000000000000000000000000000000000000000000000000000000000001

# Decodificar address
cast --to-checksum-address 0x000000000000000000000000ed252bac2d88971cb5b393b0760f05af27413b91
```

### Para estructuras complejas (tuples):

Necesitas usar `cast abi-decode` con el ABI del contrato:

```bash
cast abi-decode "getUserInfo(address)" 0x0000000000000000000000000000000000000000000000000000000000000020...
```

---

## Verificar si el Contrato está Desplegado

Si recibes `0x` como resultado o el warning "Contract code is empty", significa que el contrato no está desplegado.

### Solución:

1. **Verificar si Anvil está corriendo:**
```bash
curl -X POST http://127.0.0.1:8545 -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

2. **Desplegar el contrato:**
```bash
cd sc
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

3. **Verificar la dirección del contrato desplegado** (aparecerá en el output del deploy)

4. **Actualizar la dirección** en el frontend o en tus llamadas

---

## Resumen de Resultados por Función

| Función | Tipo de Retorno | Resultado Esperado (desplegado) | Resultado si NO desplegado |
|---------|----------------|--------------------------------|---------------------------|
| `admin()` | address | `0x000...ed252bac2d88971cb5b393b0760f05af27413b91` | `0x` (empty) |
| `nextTokenId()` | uint256 | `0x000...0000000000000000000000000001` (1 en decimal) | `0x` (empty) |
| `getUserInfo(address)` | tuple | ABI-encoded User struct | Error o `0x` |
| `getToken(uint256)` | tuple | ABI-encoded Token struct | Error o `0x` |
| `isAdmin(address)` | bool | `0x000...0000000000000000000000000001` (true) o `0x000...0000000000000000000000000000` (false) | `0x` (empty) |
