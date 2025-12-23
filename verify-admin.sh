#!/bin/bash

# Script para verificar el estado del admin en el contrato

set -e

CONTRACT_ADDRESS=$(grep -oP "export const CONTRACT_ADDRESS = '\K0x[a-fA-F0-9]{40}" web/src/contracts/SupplyChain.ts || echo "")
ADMIN_ADDRESS="0xeD252BAc2D88971cb5B393B0760f05AF27413b91"
RPC_URL="http://127.0.0.1:8545"

if [ -z "$CONTRACT_ADDRESS" ]; then
    echo "❌ Error: No se pudo obtener la dirección del contrato"
    exit 1
fi

echo "=========================================="
echo "Verificación del Admin en el Contrato"
echo "=========================================="
echo ""
echo "Contrato: $CONTRACT_ADDRESS"
echo "Admin esperado: $ADMIN_ADDRESS"
echo "RPC: $RPC_URL"
echo ""

# Verificar que Anvil esté corriendo
if ! curl -s $RPC_URL > /dev/null 2>&1; then
    echo "❌ Error: Anvil no está corriendo en $RPC_URL"
    echo "   Ejecuta: anvil"
    exit 1
fi

echo "✅ Anvil está corriendo"
echo ""

# Verificar la dirección del admin en el contrato
echo "1. Verificando dirección del admin en el contrato..."
ADMIN_IN_CONTRACT=$(cast call $CONTRACT_ADDRESS "admin()(address)" --rpc-url $RPC_URL 2>&1 || echo "ERROR")

if [[ "$ADMIN_IN_CONTRACT" == *"ERROR"* ]] || [[ "$ADMIN_IN_CONTRACT" == *"error"* ]]; then
    echo "   ❌ Error al obtener el admin del contrato"
    echo "   $ADMIN_IN_CONTRACT"
    echo ""
    echo "   Posible causa: El contrato no está desplegado en esta dirección"
    exit 1
fi

echo "   Admin en contrato: $ADMIN_IN_CONTRACT"
if [ "${ADMIN_IN_CONTRACT,,}" == "${ADMIN_ADDRESS,,}" ]; then
    echo "   ✅ La dirección del admin coincide"
else
    echo "   ⚠️  La dirección del admin NO coincide"
    echo "   Esperado: $ADMIN_ADDRESS"
    echo "   Encontrado: $ADMIN_IN_CONTRACT"
fi
echo ""

# Verificar si el admin está registrado como usuario
echo "2. Verificando si el admin está registrado como usuario..."
USER_ID=$(cast call $CONTRACT_ADDRESS "addressToUserId(address)(uint256)" $ADMIN_ADDRESS --rpc-url $RPC_URL 2>&1 || echo "ERROR")

if [[ "$USER_ID" == *"ERROR"* ]] || [[ "$USER_ID" == *"error"* ]]; then
    echo "   ❌ Error al obtener el userId del admin"
    echo "   $USER_ID"
    echo ""
    echo "   Posible causa: El admin no está registrado como usuario"
    exit 1
fi

if [ "$USER_ID" == "0" ]; then
    echo "   ❌ El admin NO está registrado como usuario (userId = 0)"
    echo ""
    echo "   SOLUCIÓN: El admin debería registrarse automáticamente en el constructor."
    echo "   Esto indica que el contrato no se desplegó correctamente."
    echo "   Redespliega el contrato con: cd sc && forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast"
    exit 1
else
    echo "   ✅ El admin está registrado como usuario (userId = $USER_ID)"
fi
echo ""

# Obtener información del usuario admin
echo "3. Obteniendo información del usuario admin..."
USER_INFO=$(cast call $CONTRACT_ADDRESS "getUserInfo(address)(uint256,address,string,uint8)" $ADMIN_ADDRESS --rpc-url $RPC_URL 2>&1 || echo "ERROR")

if [[ "$USER_INFO" == *"ERROR"* ]] || [[ "$USER_INFO" == *"error"* ]]; then
    echo "   ❌ Error al obtener información del usuario"
    echo "   $USER_INFO"
    exit 1
fi

# Parsear la información (formato: userId address role status)
USER_DATA=($USER_INFO)
USER_ID_FROM_INFO=${USER_DATA[0]}
USER_ADDRESS=${USER_DATA[1]}
USER_ROLE=${USER_DATA[2]}
USER_STATUS=${USER_DATA[3]}

echo "   ID: $USER_ID_FROM_INFO"
echo "   Dirección: $USER_ADDRESS"
echo "   Rol: $USER_ROLE"
echo "   Estado: $USER_STATUS"

if [ "$USER_ROLE" != "admin" ]; then
    echo "   ⚠️  El rol del admin no es 'admin', es: $USER_ROLE"
fi

if [ "$USER_STATUS" != "1" ]; then
    echo "   ⚠️  El estado del admin no es 'Approved' (1), es: $USER_STATUS"
fi
echo ""

echo "=========================================="
echo "✅ Verificación completada"
echo "=========================================="
