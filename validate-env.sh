#!/bin/bash

# Script para validar que el ambiente esté correctamente configurado

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Validando Ambiente${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 1. Verificar que Anvil esté corriendo
echo -e "${BLUE}[1/5] Verificando Anvil...${NC}"
if curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' http://127.0.0.1:8545 > /dev/null 2>&1; then
    CHAIN_ID=$(curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' http://127.0.0.1:8545 | jq -r '.result')
    if [ "$CHAIN_ID" = "0x7a69" ] || [ "$CHAIN_ID" = "\"0x7a69\"" ]; then
        echo -e "${GREEN}✓ Anvil corriendo en puerto 8545 (Chain ID: 31337)${NC}"
    else
        echo -e "${RED}✗ Anvil corriendo pero Chain ID incorrecto: $CHAIN_ID${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Anvil no está corriendo${NC}"
    exit 1
fi
echo ""

# 2. Verificar MCP API
echo -e "${BLUE}[2/5] Verificando MCP API...${NC}"
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ MCP API corriendo en puerto 3001${NC}"
else
    echo -e "${RED}✗ MCP API no está corriendo${NC}"
    exit 1
fi
echo ""

# 3. Verificar dirección del contrato
echo -e "${BLUE}[3/5] Verificando dirección del contrato...${NC}"
CONTRACT_ADDR=$(grep "CONTRACT_ADDRESS" web/src/contracts/SupplyChain.ts | grep -o "0x[a-fA-F0-9]\{40\}" | head -1)

if [ -z "$CONTRACT_ADDR" ]; then
    echo -e "${RED}✗ No se encontró CONTRACT_ADDRESS en SupplyChain.ts${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Dirección del contrato: $CONTRACT_ADDR${NC}"

# Verificar que el contrato esté desplegado
CONTRACT_CODE=$(curl -s -X POST -H "Content-Type: application/json" --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getCode\",\"params\":[\"$CONTRACT_ADDR\",\"latest\"],\"id\":1}" http://127.0.0.1:8545 | jq -r '.result')

if [ "$CONTRACT_CODE" = "0x" ] || [ -z "$CONTRACT_CODE" ]; then
    echo -e "${RED}✗ El contrato NO está desplegado en $CONTRACT_ADDR${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Contrato desplegado correctamente${NC}"
fi
echo ""

# 4. Verificar usuarios en el contrato
echo -e "${BLUE}[4/5] Verificando usuarios en el contrato...${NC}"
TOTAL_USERS=$(cast call "$CONTRACT_ADDR" "getTotalUsers()" --rpc-url http://127.0.0.1:8545 2>/dev/null || echo "0")

if [ "$TOTAL_USERS" = "0" ]; then
    echo -e "${YELLOW}⚠ No hay usuarios registrados aún${NC}"
else
    echo -e "${GREEN}✓ Total de usuarios: $TOTAL_USERS${NC}"
fi
echo ""

# 5. Verificar frontend
echo -e "${BLUE}[5/5] Verificando frontend...${NC}"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend corriendo en puerto 3000${NC}"
else
    echo -e "${YELLOW}⚠ Frontend no está corriendo (puede estar iniciando)${NC}"
fi
echo ""

# Resumen
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Validación Completada${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${GREEN}Servicios disponibles:${NC}"
echo -e "  - ${BLUE}Frontend dApp:${NC}      http://localhost:3000"
echo -e "  - ${BLUE}Tools MCP:${NC}          http://localhost:3000/tools"
echo -e "  - ${BLUE}MCP API:${NC}            http://localhost:3001"
echo -e "  - ${BLUE}Anvil RPC:${NC}          http://127.0.0.1:8545"
echo -e "  - ${BLUE}Contrato:${NC}           $CONTRACT_ADDR"
echo ""



