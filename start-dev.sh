#!/bin/bash

# Script para levantar el ambiente completo de desarrollo
# Incluye: Anvil, despliegue de contrato, fondeo de cuentas y frontend

set -e  # Salir si hay algún error

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Directorios
SC_DIR="sc"
WEB_DIR="web"
ANVIL_PID_FILE="/tmp/anvil.pid"

# Función para limpiar procesos al salir
cleanup() {
    echo -e "\n${YELLOW}Limpiando procesos...${NC}"
    if [ -f "$ANVIL_PID_FILE" ]; then
        ANVIL_PID=$(cat "$ANVIL_PID_FILE")
        if ps -p "$ANVIL_PID" > /dev/null 2>&1; then
            kill "$ANVIL_PID" 2>/dev/null || true
        fi
        rm -f "$ANVIL_PID_FILE"
    fi
    # Matar procesos de anvil que puedan estar corriendo
    pkill -f "anvil" 2>/dev/null || true
    echo -e "${GREEN}Limpieza completada${NC}"
}

# Registrar cleanup al salir
trap cleanup EXIT INT TERM

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Iniciando ambiente de desarrollo${NC}"
echo -e "${GREEN}========================================${NC}"

# 1. Verificar que Anvil esté instalado
if ! command -v anvil &> /dev/null; then
    echo -e "${RED}Error: Anvil no está instalado${NC}"
    echo "Instala Foundry: curl -L https://foundry.paradigm.xyz | bash"
    exit 1
fi

# 2. Verificar que Forge esté instalado
if ! command -v forge &> /dev/null; then
    echo -e "${RED}Error: Forge no está instalado${NC}"
    echo "Instala Foundry: curl -L https://foundry.paradigm.xyz | bash"
    exit 1
fi

# 3. Matar procesos de Anvil existentes
echo -e "${YELLOW}Verificando procesos de Anvil existentes...${NC}"
pkill -f "anvil" 2>/dev/null || true
sleep 1

# 4. Iniciar Anvil en background
echo -e "${YELLOW}Iniciando Anvil en puerto 8545...${NC}"
cd "$SC_DIR"
anvil --host 0.0.0.0 --port 8545 > /tmp/anvil.log 2>&1 &
ANVIL_PID=$!
echo $ANVIL_PID > "$ANVIL_PID_FILE"
cd ..

# 5. Esperar a que Anvil esté listo
echo -e "${YELLOW}Esperando a que Anvil esté listo...${NC}"
for i in {1..30}; do
    if curl -s http://127.0.0.1:8545 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Anvil está listo${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}Error: Anvil no respondió después de 30 intentos${NC}"
        exit 1
    fi
    sleep 1
done

# 6. Desplegar el contrato
echo -e "${YELLOW}Desplegando contrato SupplyChain...${NC}"
cd "$SC_DIR"

# Ejecutar el deploy y capturar output
DEPLOY_OUTPUT=$(forge script script/Deploy.s.sol:DeployScript --rpc-url http://127.0.0.1:8545 --broadcast 2>&1) || {
    echo -e "${RED}Error al desplegar el contrato${NC}"
    echo "$DEPLOY_OUTPUT"
    exit 1
}

# Intentar múltiples formas de extraer la dirección
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oP 'SupplyChain deployed at:\s*\K0x[a-fA-F0-9]{40}' || echo "")

if [ -z "$CONTRACT_ADDRESS" ]; then
    # Buscar en el log de broadcast
    if [ -f "broadcast/Deploy.s.sol/31337/run-latest.json" ]; then
        CONTRACT_ADDRESS=$(jq -r '.transactions[0].contractAddress' broadcast/Deploy.s.sol/31337/run-latest.json 2>/dev/null | grep -oP '0x[a-fA-F0-9]{40}' | head -1 || echo "")
    fi
fi

if [ -z "$CONTRACT_ADDRESS" ]; then
    # Último intento: buscar cualquier dirección en el output
    CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oE '0x[a-fA-F0-9]{40}' | tail -1 || echo "")
fi

if [ -z "$CONTRACT_ADDRESS" ] || [ "$CONTRACT_ADDRESS" = "null" ]; then
    echo -e "${RED}Error: No se pudo obtener la dirección del contrato desplegado${NC}"
    echo "Output del deploy:"
    echo "$DEPLOY_OUTPUT" | tail -50
    exit 1
fi

echo -e "${GREEN}✓ Contrato desplegado en: $CONTRACT_ADDRESS${NC}"
cd ..

# 7. Actualizar la dirección del contrato en el frontend si es diferente
CURRENT_ADDRESS=$(grep -oP "export const CONTRACT_ADDRESS = '\K0x[a-fA-F0-9]{40}" "$WEB_DIR/src/contracts/SupplyChain.ts" || echo "")
if [ "$CURRENT_ADDRESS" != "$CONTRACT_ADDRESS" ]; then
    echo -e "${YELLOW}Actualizando dirección del contrato en el frontend...${NC}"
    sed -i "s/export const CONTRACT_ADDRESS = '0x[a-fA-F0-9]\{40\}'/export const CONTRACT_ADDRESS = '$CONTRACT_ADDRESS'/" "$WEB_DIR/src/contracts/SupplyChain.ts"
    echo -e "${GREEN}✓ Dirección actualizada: $CONTRACT_ADDRESS${NC}"
else
    echo -e "${GREEN}✓ La dirección del contrato ya está actualizada${NC}"
fi

# 8. Fondear las cuentas
echo -e "${YELLOW}Fondeando cuentas...${NC}"
cd "$SC_DIR"
forge script script/FundAccounts.s.sol:FundAccountsScript --rpc-url http://127.0.0.1:8545 --broadcast > /dev/null 2>&1
cd ..
echo -e "${GREEN}✓ Cuentas fondeadas${NC}"

# 9. Verificar dependencias del frontend
echo -e "${YELLOW}Verificando dependencias del frontend...${NC}"
cd "$WEB_DIR"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Instalando dependencias del frontend...${NC}"
    npm install
fi
cd ..

# 10. Iniciar el frontend
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Ambiente listo!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Contrato: $CONTRACT_ADDRESS${NC}"
echo -e "${GREEN}Anvil: http://127.0.0.1:8545${NC}"
echo -e "${GREEN}Frontend: http://localhost:3000${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${YELLOW}Iniciando frontend...${NC}"
echo -e "${YELLOW}Presiona Ctrl+C para detener todo${NC}"
echo ""

cd "$WEB_DIR"
npm run dev




