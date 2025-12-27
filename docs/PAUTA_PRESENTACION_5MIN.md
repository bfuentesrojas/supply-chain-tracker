# Pauta de Presentación - Supply Chain Tracker
**Duración: 5 minutos**

---

## Minuto 0:00-0:30 - Introducción

### Presentación breve
"Buenos días/tardes, soy [Tu nombre] y presento **Supply Chain Tracker**, una dApp de trazabilidad farmacéutica basada en blockchain que garantiza transparencia, seguridad y cumplimiento regulatorio en la cadena de suministro."

### Problema que resuelve
"El sector farmacéutico enfrenta desafíos críticos en trazabilidad:
- Sistemas tradicionales centralizados sin garantías de inmutabilidad
- Procesos de recall lentos y costosos cuando hay problemas de calidad
- Falta de transparencia en el origen y composición de productos
- Dificultad para rastrear componentes desde materia prima hasta consumidor final

**Supply Chain Tracker resuelve esto con:**
- Trazabilidad completa e inmutable en blockchain
- Recall automatizado que marca toda la cadena relacionada
- Transparencia total para actores autorizados
- Gestión automática de componentes con descuento de supply"

### Proyecto de referencia
"El proyecto se basa en la arquitectura de **TimberChain/GrainChain**, pero con adaptaciones específicas para el sector farmacéutico."

### Innovaciones agregadas vs esqueleto base
**IMPORTANTE - DESTACAR:**
1. **Sistema de múltiples padres**: Tokens pueden tener múltiples padres con cantidades asociadas (permite modelar recetas complejas)
2. **Descuento automático de supply**: Al crear un lote (PT_LOTE), el sistema valida y descuenta automáticamente los componentes de la receta
3. **Sistema de recall recursivo**: Cuando se crea un recall, marca automáticamente toda la cadena de suministro relacionada (padres e hijos)
4. **Jerarquía visual mejorada**: Visualización de jerarquías complejas con múltiples padres usando BFS
5. **Validaciones GS1**: Implementación de validaciones para códigos GTIN, GLN y SSCC
6. **Asistente de IA integrado**: Chat flotante con capacidades de consulta y acción sobre el contrato usando lenguaje natural (Ollama)
7. **Sistema MCP para herramientas Foundry**: Integración con Claude Desktop para ejecutar herramientas Foundry directamente

---

## Minuto 0:30-1:30 - Explicación Técnica

### Arquitectura del sistema (mostrar diagrama)
[Mostrar diagrama de docs/diagramas.md si está disponible]

**Componentes principales:**
1. **Capa de Smart Contracts**: Un único contrato `SupplyChain.sol` que gestiona:
   - Usuarios y roles (Fabricante, Distribuidor, Minorista, Consumidor, Admin)
   - Tokens con tipos específicos (API_MP, BOM, PT_LOTE, SSCC, COMPLIANCE_LOG)
   - Transferencias con aprobación
   - Sistema de recall

2. **Capa de Backend**:
   - Servidor MCP API (puerto 3001) para herramientas Foundry
   - API de asistente de IA (/api/assistant) para consultas y acciones

3. **Capa de Frontend**: Next.js con múltiples páginas:
   - Dashboard con estadísticas por rol
   - Gestión de tokens
   - Trazabilidad completa con jerarquía visual
   - Panel de administración
   - Herramientas Foundry integradas

4. **Integración Web3**: MetaMask para gestión de wallets

5. **Servicio de IA**: Ollama para procesamiento de lenguaje natural

### Tecnologías utilizadas
- **Blockchain**: Ethereum (Anvil local, compatible con testnets)
- **Smart Contracts**: Solidity ^0.8.24, Foundry
- **Backend**: Node.js, Express.js, TypeScript
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **IA**: Ollama (LLM local), Claude Desktop con MCP
- **Testing**: 55 tests unitarios (smart contracts), 12 tests (backend), 10 tests (frontend)

### Smart contracts principales
- **SupplyChain.sol**: Contrato único que gestiona toda la lógica:
  - Struct Token con arrays de `parentIds[]` y `parentAmounts[]` (múltiples padres)
  - Enum TokenType para tipos específicos
  - Función `createToken` con validaciones por tipo
  - Función `_consumeRecipeComponents` para descuento automático de supply
  - Sistema de recall con marcado recursivo de cadena completa

### Funcionalidades únicas implementadas

**1. Sistema de múltiples padres:**
- Permite que un token tenga múltiples padres con cantidades específicas
- Esencial para modelar recetas (BOM) con múltiples componentes

**2. Descuento automático de supply:**
- Al crear un PT_LOTE desde una receta (BOM), el sistema:
  - Valida que hay suficientes componentes disponibles
  - Calcula cantidades necesarias: `cantidadPorUnidad * cantidadLote`
  - Descuenta automáticamente los balances de todos los componentes
  - Revierte la transacción si falta algún componente

**3. Sistema de recall recursivo:**
- Cuando se crea un COMPLIANCE_LOG tipo Recall:
  - Marca el token padre como retirado
  - Marca recursivamente todos los hijos del token
  - Bloquea transferencias futuras de tokens retirados
  - Bloquea uso de tokens retirados como padres

**4. Validaciones GS1:**
- Validación de códigos GTIN (13 dígitos)
- Validación de SSCC (18 dígitos)
- Verificación de dígito de control

**5. Asistente de IA integrado:**
- Chat flotante disponible en todas las páginas
- Consultas en lenguaje natural sobre tokens, usuarios, transferencias
- Acciones sobre el contrato (crear tokens, transferir, aprobar usuarios)
- Integración con MetaMask para confirmación de transacciones

---

## Minuto 1:30-4:00 - Demostración Práctica

### 1. Navegar por el Dashboard (0:30)
**Mostrar:**
- Dashboard inicial con estadísticas generales
- Panel adaptado por rol (Admin vs Fabricante vs Consumidor)
- Lista de tokens con indicadores visuales (recall, tipo)
- Totalizadores personalizados por rol

**Decir:**
"El dashboard muestra estadísticas personalizadas según el rol del usuario. Para un admin, vemos totales globales. Para un fabricante, vemos sus tokens y transferencias."

### 2. Ejecutar caso de uso principal: Crear lote con validación de componentes (1:30)
**Flujo a mostrar:**

**Paso 1: Crear Materia Prima (API_MP)**
- Ir a /tokens/create
- Seleccionar tipo API_MP
- Completar formulario (Paracetamol API, 10000 unidades)
- Mostrar transacción en MetaMask
- Confirmar creación

**Paso 2: Crear Receta (BOM)**
- Seleccionar tipo BOM
- Agregar múltiples padres (Paracetamol API: 0.5, Excipiente: 0.45)
- Mostrar que acepta decimales
- Crear receta

**Paso 3: Crear Lote (PT_LOTE) - FUNCIONALIDAD CLAVE**
- Seleccionar tipo PT_LOTE
- Seleccionar receta como padre
- Especificar cantidad de lote: 1000 unidades
- **DESTACAR**: El sistema calcula automáticamente:
  - Paracetamol API necesario: 0.5 * 1000 = 500 unidades
  - Excipiente necesario: 0.45 * 1000 = 450 unidades
- Mostrar validación previa de componentes disponibles
- Confirmar creación
- **IMPORTANTE**: Mencionar que el sistema descuenta automáticamente los componentes

**Paso 4: Verificar descuento**
- Volver a la lista de tokens
- Verificar que el balance de Paracetamol API se redujo en 500
- Verificar que el balance de Excipiente se redujo en 450

**Decir:**
"Esta es una de las innovaciones clave: el sistema valida y descuenta automáticamente los componentes al crear un lote, asegurando trazabilidad completa de materias primas."

### 3. Mostrar transacción en blockchain (0:30)
**Mostrar:**
- Abrir Anvil/explorador local si está disponible
- O mostrar el hash de transacción
- Explicar que todos los datos están on-chain
- Mencionar que el contrato almacena:
  - Token IDs, tipos, supply
  - Parent relationships (arrays)
  - Balances por usuario
  - Transferencias

**Decir:**
"Todas las transacciones quedan registradas en blockchain. Podemos verificar que los datos son inmutables y transparentes."

### 4. Demostrar funcionalidad de Recall (0:30)
**Flujo:**
- Crear un COMPLIANCE_LOG tipo Recall
- Seleccionar un token como padre
- Confirmar creación
- **DESTACAR**: Mostrar que se marca automáticamente:
  - El token padre como "Retirado"
  - Todos los hijos del token (si los hay)
- Intentar transferir un token retirado (debe fallar)

**Decir:**
"El sistema de recall es recursivo: marca automáticamente toda la cadena de suministro relacionada, bloqueando transferencias futuras. Esto es crítico en farmacéutica para retiros de mercado."

### 5. Mostrar trazabilidad completa (0:30)
**Mostrar:**
- Ir a /track
- Buscar un token específico
- Mostrar jerarquía visual:
  - Árbol con múltiples padres en el mismo nivel (BFS)
  - Componentes de BOM mostrados como sub-nivel
  - Tokens compliance como sub-nivel
- Mostrar timeline de transferencias
- Mostrar información detallada del token

**Decir:**
"La vista de trazabilidad muestra la jerarquía completa del token, desde materias primas hasta producto terminado, con todas las transferencias en orden cronológico."

### 6. Mostrar Asistente de IA (opcional, si hay tiempo) (0:20)
**Mostrar:**
- Abrir chat flotante
- Hacer consulta: "¿Cuántos tokens tengo?"
- Hacer consulta: "Lista usuarios pendientes"
- Mostrar que puede ejecutar acciones (si hay tiempo)

**Decir:**
"El asistente de IA permite consultas y acciones sobre el contrato usando lenguaje natural, facilitando la interacción con el sistema."

---

## Minuto 4:00-5:00 - Conclusiones

### Resultados obtenidos
"El proyecto implementa un sistema completo de trazabilidad farmacéutica con:
- ✅ 5 tipos de tokens específicos del dominio (API_MP, BOM, PT_LOTE, SSCC, COMPLIANCE_LOG)
- ✅ 55 tests unitarios pasando en smart contracts
- ✅ Sistema funcional end-to-end desde creación hasta consumo
- ✅ 7 innovaciones clave vs el esqueleto base
- ✅ Interfaz de usuario completa con múltiples páginas
- ✅ Integración de IA para facilitar uso del sistema"

### Lecciones aprendidas
"Durante el desarrollo aprendí:
1. **Arquitectura de datos on-chain**: Cómo diseñar estructuras de datos eficientes para blockchain, especialmente arrays de padres con cantidades
2. **Aritmética BigInt**: Manejo cuidadoso de decimales usando multiplicación/división por 1000 para preservar 3 decimales
3. **Validaciones en múltiples capas**: Validaciones en frontend (UX) y en smart contract (seguridad)
4. **Integración de IA**: Cómo integrar LLMs locales (Ollama) con blockchain para crear asistentes conversacionales
5. **Model Context Protocol**: Integración de herramientas de desarrollo (Foundry) con Claude Desktop para productividad"

### Posibles mejoras futuras
"El sistema podría mejorarse con:
1. **Indexación de eventos**: Usar The Graph para indexar eventos y hacer queries más eficientes
2. **IPFS para metadata**: Almacenar JSON grandes de features en IPFS, guardando solo hash on-chain
3. **Cache con React Query**: Implementar cache del lado del cliente para reducir llamadas al contrato
4. **Paginación on-chain**: Paginar transferencias directamente en el contrato
5. **Optimizaciones de gas**: Reducir costos de transacción con técnicas avanzadas
6. **Deploy a testnets**: Desplegar a Sepolia/Goerli para pruebas en red pública
7. **Mobile app**: Aplicación móvil para escanear códigos QR de tokens"

### Valor agregado de la implementación
**INNOVACIONES CLAVE:**
1. **Descuento automático de supply**: Asegura trazabilidad completa de componentes sin intervención manual
2. **Sistema de múltiples padres**: Permite modelar recetas complejas de forma natural
3. **Recall recursivo**: Automatiza el proceso crítico de retiro de productos en farmacéutica
4. **Validaciones GS1**: Cumplimiento con estándares de la industria farmacéutica
5. **Asistente de IA**: Reduce barrera de entrada para usuarios no técnicos
6. **Jerarquía visual mejorada**: BFS permite visualizar relaciones complejas claramente
7. **Integración MCP**: Facilita desarrollo y debugging con herramientas Foundry

**VALOR DE NEGOCIO:**
- Trazabilidad completa e inmutable
- Reducción de tiempo en recalls (automático vs manual)
- Transparencia para cumplimiento regulatorio
- Reducción de fraude (registros on-chain no modificables)
- Mejora en eficiencia operacional (validaciones automáticas)

**CÓDIGO Y CALIDAD:**
- 77 tests unitarios (55 smart contracts + 12 backend + 10 frontend)
- Documentación completa
- Código estructurado y mantenible
- Integración de herramientas modernas (IA, MCP)

---

## Notas Adicionales para la Presentación

### Tips para la demo
1. **Preparar datos de prueba**: Tener tokens ya creados para agilizar la demo
2. **Tener MetaMask listo**: Cuenta conectada con fondos
3. **Anvil corriendo**: Asegurar que la blockchain local está activa
4. **Navegador limpio**: Abrir en ventana de incógnito o navegador limpio para evitar distracciones
5. **Screenshots de respaldo**: Tener screenshots listos por si algo falla en vivo

### Puntos a enfatizar
- ✅ Sistema funcional completo (no solo prototipo)
- ✅ Innovaciones reales vs esqueleto base
- ✅ Casos de uso del mundo real (farmacéutica)
- ✅ Calidad del código (tests, documentación)
- ✅ Tecnologías modernas (Next.js 14, Foundry, IA)

### Manejo de preguntas
**Pregunta típica: "¿Por qué blockchain?"**
"Blockchain garantiza inmutabilidad y transparencia. En farmacéutica, cuando hay un recall, necesitamos certeza absoluta de que los registros no pueden ser modificados. Además, permite transparencia sin necesidad de un intermediario centralizado."

**Pregunta típica: "¿Costos de gas?"**
"El sistema está diseñado para optimizar gas. Para producción, se podría implementar capa 2 (Polygon, Arbitrum) o usar IPFS para metadata grande. Además, muchas operaciones son view functions sin costo."

**Pregunta típica: "¿Escalabilidad?"**
"El sistema usa eventos para datos históricos. Para mejorar escalabilidad, se podría usar The Graph para indexar eventos. La estructura de datos está optimizada para minimizar lecturas on-chain."

---

## Timing Sugerido (Resumen)

- **0:00-0:30**: Introducción y problema (30 seg)
- **0:30-1:30**: Arquitectura y tecnologías (60 seg)
- **1:30-2:30**: Demo creación de lote (60 seg)
- **2:30-3:00**: Demo recall (30 seg)
- **3:00-3:30**: Demo trazabilidad (30 seg)
- **3:30-4:00**: Demo IA (opcional) o verificación blockchain (30 seg)
- **4:00-5:00**: Conclusiones y Q&A (60 seg)

**Total: 5 minutos**

---

*Documento generado para presentación del proyecto Supply Chain Tracker*

