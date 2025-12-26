#!/bin/bash

# Script unificado para levantar todo el ambiente usando endpoints MCP
# 1. Levanta MCP API (puerto 3001)
# 2. Compila smart contracts
# 3. Levanta Anvil
# 4. Fondea cuentas
# 5. Levanta frontend (puerto 3000)

set -e  # Salir si hay algún error

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
MCP_API_URL="http://localhost:3001"
MCP_API_PORT=3001
FRONTEND_PORT=3000
ANVIL_PORT=8545
FRONTEND_DIR="frontend"
MCP_API_PID_FILE="/tmp/mcp-api.pid"

# Función para limpiar procesos al salir
cleanup() {
    echo -e "\n${YELLOW}Limpiando procesos...${NC}"
    
    # Detener MCP API
    if [ -f "$MCP_API_PID_FILE" ]; then
        MCP_API_PID=$(cat "$MCP_API_PID_FILE")
        if ps -p "$MCP_API_PID" > /dev/null 2>&1; then
            echo -e "${YELLOW}Deteniendo MCP API (PID: $MCP_API_PID)...${NC}"
            kill "$MCP_API_PID" 2>/dev/null || true
        fi
        rm -f "$MCP_API_PID_FILE"
    fi
    
    # Detener Anvil si está corriendo (solo si MCP API está disponible)
    if curl -s "$MCP_API_URL/health" > /dev/null 2>&1; then
        if curl -s "$MCP_API_URL/anvil/stop" -X POST -H "Content-Type: application/json" -d '{}' > /dev/null 2>&1; then
            echo -e "${YELLOW}Anvil detenido${NC}"
        fi
    fi
    
    echo -e "${GREEN}Limpieza completada${NC}"
}

# Registrar cleanup al salir
trap cleanup EXIT INT TERM

# Función para esperar a que un servicio esté listo
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}Esperando a que $service_name esté listo...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ $service_name está listo${NC}"
            return 0
        fi
        echo -n "."
        sleep 1
        attempt=$((attempt + 1))
    done
    
    echo -e "\n${RED}✗ $service_name no respondió después de $max_attempts intentos${NC}"
    return 1
}

# Función para hacer una petición POST a la API MCP
mcp_api_post() {
    local endpoint=$1
    local data=$2
    local description=$3
    
    echo -e "${BLUE}→ $description${NC}"
    
    response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "$data" \
        "$MCP_API_URL$endpoint" 2>&1)
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        success=$(echo "$body" | grep -o '"success"[[:space:]]*:[[:space:]]*true' || echo "")
        if [ -n "$success" ]; then
            echo -e "${GREEN}✓ $description completado${NC}"
            echo "$body"
            return 0
        else
            error=$(echo "$body" | grep -o '"error"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 || echo "")
            if [ -n "$error" ]; then
                echo -e "${RED}✗ $description falló: $error${NC}"
                return 1
            else
                echo -e "${YELLOW}⚠ $description: respuesta inesperada${NC}"
                echo "$body" | head -20
                return 1
            fi
        fi
    else
        echo -e "${RED}✗ $description falló (HTTP $http_code)${NC}"
        echo "$body" | head -20
        return 1
    fi
}

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Iniciando Ambiente Completo con MCP${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}Error: No se encuentra el directorio $FRONTEND_DIR/${NC}"
    echo "Ejecuta este script desde la raíz del proyecto"
    exit 1
fi

# Verificar dependencias
echo -e "${YELLOW}Verificando dependencias...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js no está instalado${NC}"
    exit 1
fi

if ! command -v curl &> /dev/null; then
    echo -e "${RED}Error: curl no está instalado${NC}"
    exit 1
fi

# Verificar que node_modules existe
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${YELLOW}Instalando dependencias del frontend...${NC}"
    cd "$FRONTEND_DIR"
    npm install
    cd ..
fi

echo -e "${GREEN}✓ Dependencias verificadas${NC}"
echo ""

# Paso 1: Iniciar MCP API Server
echo -e "${GREEN}[1/5] Iniciando MCP API Server (puerto $MCP_API_PORT)...${NC}"
cd "$FRONTEND_DIR/../backend"

# Matar proceso existente si hay uno
if [ -f "$MCP_API_PID_FILE" ]; then
    OLD_PID=$(cat "$MCP_API_PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo -e "${YELLOW}Deteniendo MCP API existente (PID: $OLD_PID)...${NC}"
        kill "$OLD_PID" 2>/dev/null || true
        sleep 1
    fi
fi

# Iniciar MCP API en background
npm run dev:mcp-api > /tmp/mcp-api.log 2>&1 &
MCP_API_PID=$!
echo $MCP_API_PID > "$MCP_API_PID_FILE"
cd ..

echo -e "${GREEN}MCP API iniciado (PID: $MCP_API_PID)${NC}"

# Esperar a que el MCP API esté listo
if ! wait_for_service "$MCP_API_URL/health" "MCP API"; then
    echo -e "${RED}Error: No se pudo iniciar MCP API${NC}"
    echo "Revisa los logs en /tmp/mcp-api.log"
    exit 1
fi

echo ""

# Paso 2: Compilar Smart Contracts
echo -e "${GREEN}[2/5] Compilando Smart Contracts...${NC}"
if ! mcp_api_post "/forge/build" '{"skipTest": false}' "Compilación de contratos"; then
    echo -e "${RED}Error en la compilación${NC}"
    exit 1
fi
echo ""

# Paso 3: Iniciar Anvil
echo -e "${GREEN}[3/5] Iniciando Anvil (puerto $ANVIL_PORT)...${NC}"
ANVIL_DATA='{"host": "0.0.0.0", "port": 8545, "chainId": 31337}'

if ! mcp_api_post "/anvil/start" "$ANVIL_DATA" "Inicio de Anvil"; then
    echo -e "${RED}Error al iniciar Anvil${NC}"
    exit 1
fi

# Esperar a que Anvil esté respondiendo
echo -e "${YELLOW}Esperando a que Anvil responda...${NC}"
sleep 3

# Verificar que Anvil esté corriendo
if ! wait_for_service "http://127.0.0.1:$ANVIL_PORT" "Anvil"; then
    echo -e "${RED}Error: Anvil no está respondiendo${NC}"
    exit 1
fi

echo ""

# Paso 4: Desplegar Contrato
echo -e "${GREEN}[4/6] Desplegando contrato SupplyChain...${NC}"
DEPLOY_DATA='{"rpcUrl": "http://127.0.0.1:8545"}'

DEPLOY_RESPONSE=$(mcp_api_post "/forge/script/deploy" "$DEPLOY_DATA" "Despliegue de contrato")
DEPLOY_SUCCESS=$?

if [ $DEPLOY_SUCCESS -eq 0 ]; then
    # Extraer la dirección del contrato de la respuesta
    CONTRACT_ADDR=$(echo "$DEPLOY_RESPONSE" | grep -o '"contractAddress"[[:space:]]*:[[:space:]]*"0x[a-fA-F0-9]*"' | grep -o '0x[a-fA-F0-9]*' | head -1)
    
    if [ -n "$CONTRACT_ADDR" ]; then
        echo -e "${GREEN}✓ Contrato desplegado en: $CONTRACT_ADDR${NC}"
        
        # Actualizar archivos de configuración
        echo -e "${YELLOW}Actualizando archivos de configuración...${NC}"
        
        # Actualizar SupplyChain.ts
        if [ -f "$FRONTEND_DIR/src/contracts/SupplyChain.ts" ]; then
            sed -i "s|export const CONTRACT_ADDRESS = '0x[a-fA-F0-9]*'|export const CONTRACT_ADDRESS = '$CONTRACT_ADDR'|" "$FRONTEND_DIR/src/contracts/SupplyChain.ts"
            echo -e "${GREEN}✓ Actualizado frontend/src/contracts/SupplyChain.ts${NC}"
        fi
        
        # Actualizar .env.local si existe
        if [ -f "$FRONTEND_DIR/.env.local" ]; then
            sed -i "s|^CONTRACT=.*|CONTRACT=$CONTRACT_ADDR|" "$FRONTEND_DIR/.env.local"
            sed -i "s|^NEXT_PUBLIC_CONTRACT=.*|NEXT_PUBLIC_CONTRACT=$CONTRACT_ADDR|" "$FRONTEND_DIR/.env.local"
            echo -e "${GREEN}✓ Actualizado web/.env.local${NC}"
        fi
        
        # Actualizar .env.local en la raíz si existe
        if [ -f ".env.local" ]; then
            sed -i "s|^CONTRACT=.*|CONTRACT=$CONTRACT_ADDR|" ".env.local"
            echo -e "${GREEN}✓ Actualizado .env.local${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ No se pudo extraer la dirección del contrato de la respuesta${NC}"
    fi
else
    echo -e "${RED}✗ Error al desplegar el contrato${NC}"
    echo -e "${YELLOW}⚠ Continuando sin actualizar configuración...${NC}"
fi
echo ""

# Paso 5: Fondear Cuentas
echo -e "${GREEN}[5/6] Fondeando cuentas de prueba...${NC}"
FUND_DATA='{"rpcUrl": "http://127.0.0.1:8545"}'

if ! mcp_api_post "/forge/script/fund" "$FUND_DATA" "Fondeo de cuentas"; then
    echo -e "${YELLOW}⚠ Advertencia: No se pudieron fondear las cuentas (puede continuar)${NC}"
else
    echo -e "${GREEN}✓ Cuentas fondeadas correctamente${NC}"
fi
echo ""

# Paso 6: Iniciar Frontend
echo -e "${GREEN}[6/6] Iniciando Frontend (puerto $FRONTEND_PORT)...${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Ambiente completo iniciado!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${GREEN}Servicios disponibles:${NC}"
echo -e "  - ${BLUE}Frontend dApp:${NC}      http://localhost:$FRONTEND_PORT"
echo -e "  - ${BLUE}Tools MCP:${NC}          http://localhost:$FRONTEND_PORT/tools"
echo -e "  - ${BLUE}MCP API:${NC}            http://localhost:$MCP_API_PORT"
echo -e "  - ${BLUE}Anvil RPC:${NC}          http://127.0.0.1:$ANVIL_PORT"
echo ""
echo -e "${YELLOW}Presiona Ctrl+C para detener todos los servicios${NC}"
echo ""

cd "$FRONTEND_DIR"
npx next dev -p $FRONTEND_PORT





