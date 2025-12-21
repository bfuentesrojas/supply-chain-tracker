#!/bin/bash

# Script para iniciar el servidor de APIs MCP en el puerto 3002

set -e

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Iniciando MCP API Server${NC}"
echo -e "${GREEN}========================================${NC}"

# Verificar que estamos en el directorio correcto
if [ ! -d "web" ]; then
    echo -e "${RED}Error: No se encuentra el directorio web/${NC}"
    echo "Ejecuta este script desde la raíz del proyecto"
    exit 1
fi

# Verificar que node_modules existe
if [ ! -d "web/node_modules" ]; then
    echo -e "${YELLOW}Instalando dependencias...${NC}"
    cd web
    npm install
    cd ..
fi

# Iniciar el servidor en el puerto 3002
echo -e "${GREEN}Iniciando servidor en http://localhost:3002${NC}"
echo -e "${YELLOW}Presiona Ctrl+C para detener${NC}"
echo ""

cd web
npm run dev:mcp-api

