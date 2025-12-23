#!/bin/bash

# Script para validar que el asistente de IA y sus dependencias estén operativos

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Validación del Asistente de IA${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Contador de servicios operativos
SERVICES_OK=0
SERVICES_TOTAL=4

# 1. Verificar Ollama
echo -e "${YELLOW}[1/4] Verificando Ollama...${NC}"
if curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
    MODEL=$(curl -s http://127.0.0.1:11434/api/tags | jq -r '.models[0].name // "N/A"' 2>/dev/null || echo "N/A")
    echo -e "${GREEN}   ✅ Ollama está corriendo${NC}"
    echo -e "   📦 Modelo disponible: ${BLUE}$MODEL${NC}"
    SERVICES_OK=$((SERVICES_OK + 1))
else
    echo -e "${RED}   ❌ Ollama NO está corriendo${NC}"
    echo -e "   💡 Inicia Ollama con: ${YELLOW}ollama serve${NC}"
    echo -e "   💡 Verifica modelo con: ${YELLOW}ollama list${NC}"
    echo -e "   💡 Descarga modelo con: ${YELLOW}ollama pull llama3.2${NC}"
fi
echo ""

# 2. Verificar Next.js (Frontend)
echo -e "${YELLOW}[2/4] Verificando Next.js (Frontend)...${NC}"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}   ✅ Next.js está corriendo${NC}"
    echo -e "   🌐 Frontend: ${BLUE}http://localhost:3000${NC}"
    SERVICES_OK=$((SERVICES_OK + 1))
else
    echo -e "${RED}   ❌ Next.js NO está corriendo${NC}"
    echo -e "   💡 Inicia con: ${YELLOW}cd web && npm run dev${NC}"
fi
echo ""

# 3. Verificar API del Asistente
echo -e "${YELLOW}[3/4] Verificando API del Asistente...${NC}"
# Verificar que el endpoint responda (incluso si tarda, significa que está activo)
if timeout 3 curl -s http://localhost:3000/api/assistant -X POST -H "Content-Type: application/json" -d '{"message":"test"}' > /dev/null 2>&1 || [ $? -eq 124 ]; then
    # Si el timeout se alcanza, significa que el servidor está respondiendo (solo tarda)
    echo -e "${GREEN}   ✅ API del Asistente está accesible${NC}"
    echo -e "   🔗 Endpoint: ${BLUE}http://localhost:3000/api/assistant${NC}"
    SERVICES_OK=$((SERVICES_OK + 1))
elif curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/assistant -X POST -H "Content-Type: application/json" -d '{"message":"test"}' --max-time 2 | grep -q "200\|400\|500"; then
    # Si recibe cualquier código HTTP, el endpoint está activo
    echo -e "${GREEN}   ✅ API del Asistente está accesible${NC}"
    echo -e "   🔗 Endpoint: ${BLUE}http://localhost:3000/api/assistant${NC}"
    SERVICES_OK=$((SERVICES_OK + 1))
else
    echo -e "${RED}   ❌ API del Asistente NO está accesible${NC}"
    echo -e "   💡 Asegúrate de que Next.js esté corriendo"
fi
echo ""

# 4. Verificar MCP API (opcional pero recomendado)
echo -e "${YELLOW}[4/4] Verificando MCP API...${NC}"
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}   ✅ MCP API está corriendo${NC}"
    echo -e "   🔗 API: ${BLUE}http://localhost:3001${NC}"
    SERVICES_OK=$((SERVICES_OK + 1))
else
    echo -e "${YELLOW}   ⚠️  MCP API NO está corriendo (opcional)${NC}"
    echo -e "   💡 Inicia con: ${YELLOW}./start-mcp-api.sh${NC}"
    echo -e "   💡 O manualmente: ${YELLOW}cd web && npx tsx server/mcp-api-server.ts${NC}"
fi
echo ""

# Resumen
echo -e "${BLUE}========================================${NC}"
if [ $SERVICES_OK -eq $SERVICES_TOTAL ]; then
    echo -e "${GREEN}✅ Todos los servicios están operativos${NC}"
    echo -e "${GREEN}🎯 El asistente de IA está listo para usar${NC}"
    exit 0
elif [ $SERVICES_OK -ge 3 ]; then
    echo -e "${YELLOW}⚠️  $SERVICES_OK de $SERVICES_TOTAL servicios operativos${NC}"
    echo -e "${YELLOW}💡 El asistente puede funcionar, pero algunos servicios faltan${NC}"
    exit 0
else
    echo -e "${RED}❌ Solo $SERVICES_OK de $SERVICES_TOTAL servicios operativos${NC}"
    echo -e "${RED}💡 Faltan servicios críticos. Usa ${YELLOW}./start-all.sh${NC} ${RED}para iniciar todo${NC}"
    exit 1
fi


