// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SupplyChain
 * @dev Contrato para gestionar la cadena de suministros con tokens, usuarios y transferencias
 * @notice Este contrato permite crear tokens, gestionar usuarios y realizar transferencias
 */
contract SupplyChain {
    // ============ Enums ============
    
    /// @dev Estados posibles de un usuario
    enum UserStatus {
        Pending,    // Pendiente de aprobación
        Approved,   // Aprobado
        Rejected,   // Rechazado
        Canceled    // Cancelado
    }

    /// @dev Estados posibles de una transferencia
    enum TransferStatus {
        Pending,    // Pendiente
        Accepted,   // Aceptada
        Rejected    // Rechazada
    }

    /// @dev Tipos de token
    enum TokenType {
        API_MP,          // Materia prima / API
        BOM,             // Receta / composición
        PT_LOTE,         // Producto terminado - lote
        SSCC,            // Unidad logística
        COMPLIANCE_LOG   // Evidencia: TempLog, CAPA, Recall
    }

    // ============ Structs ============
    
    /// @dev Estructura para almacenar información de un token
    struct Token {
        uint256 id;
        address creator;
        string name;
        uint256 totalSupply;
        string features;      // JSON string con características
        TokenType tokenType;  // Tipo de token
        uint256[] parentIds;  // IDs de los tokens padres (vacío si no tiene)
        uint256[] parentAmounts;  // Cantidades de cada token padre (vacío si no tiene)
        uint256 dateCreated;
        bool recall;          // Indica si el token está retirado (recall)
    }

    /// @dev Estructura para almacenar balances de token (auxiliar para retornos)
    struct TokenBalance {
        uint256 tokenId;
        uint256 balance;
    }

    /// @dev Estructura para almacenar información de una transferencia
    struct Transfer {
        uint256 id;
        address from;
        address to;
        uint256 tokenId;
        uint256 dateCreated;
        uint256 amount;
        TransferStatus status;
    }

    /// @dev Estructura para almacenar información de un usuario
    struct User {
        uint256 id;
        address userAddress;
        string role;
        UserStatus status;
    }

    // ============ State Variables ============
    
    /// @dev Dirección del administrador del contrato
    address public admin;
    
    /// @dev Contadores para IDs
    uint256 public nextTokenId = 1;
    uint256 public nextTransferId = 1;
    uint256 public nextUserId = 1;
    
    /// @dev Mappings para tokens (sin el balance interno para evitar problemas con structs)
    mapping(uint256 => Token) private _tokens;
    mapping(uint256 => mapping(address => uint256)) private _tokenBalances;
    
    /// @dev Mappings para transferencias
    mapping(uint256 => Transfer) public transfers;
    
    /// @dev Mappings para usuarios
    mapping(uint256 => User) public users;
    mapping(address => uint256) public addressToUserId;

    /// @dev Arrays para rastrear tokens y transferencias por usuario
    mapping(address => uint256[]) private _userTokenIds;
    mapping(address => uint256[]) private _userTransferIds;

    // ============ Events ============
    
    /// @dev Emitido cuando se crea un nuevo token
    event TokenCreated(
        uint256 indexed tokenId,
        address indexed creator,
        string name,
        uint256 totalSupply
    );

    /// @dev Emitido cuando se solicita una transferencia
    event TransferRequested(
        uint256 indexed transferId,
        address indexed from,
        address indexed to,
        uint256 tokenId,
        uint256 amount
    );

    /// @dev Emitido cuando una transferencia es aceptada
    event TransferAccepted(uint256 indexed transferId);

    /// @dev Emitido cuando una transferencia es rechazada
    event TransferRejected(uint256 indexed transferId);

    /// @dev Emitido cuando un usuario solicita un rol
    event UserRoleRequested(address indexed user, string role);

    /// @dev Emitido cuando cambia el estado de un usuario
    event UserStatusChanged(address indexed user, UserStatus status);

    // ============ Modifiers ============
    
    /// @dev Solo el administrador puede ejecutar
    modifier onlyAdmin() {
        _onlyAdmin();
        _;
    }

    /// @dev Solo usuarios aprobados pueden ejecutar
    modifier onlyApprovedUser() {
        _onlyApprovedUser();
        _;
    }

    /// @dev Verifica que el token exista
    modifier tokenExists(uint256 tokenId) {
        _tokenExists(tokenId);
        _;
    }

    /// @dev Verifica que la transferencia exista
    modifier transferExists(uint256 transferId) {
        _transferExists(transferId);
        _;
    }

    /// @dev Función interna para verificar que es admin
    function _onlyAdmin() internal view {
        require(msg.sender == admin, "Solo el admin puede ejecutar esta funcion");
    }

    /// @dev Función interna para verificar que el usuario está aprobado
    function _onlyApprovedUser() internal view {
        uint256 userId = addressToUserId[msg.sender];
        require(userId != 0, "Usuario no registrado");
        require(users[userId].status == UserStatus.Approved, "Usuario no aprobado");
    }

    /// @dev Función interna para verificar que el token existe
    function _tokenExists(uint256 tokenId) internal view {
        require(tokenId > 0 && tokenId < nextTokenId, "Token no existe");
    }

    /// @dev Función interna para verificar que la transferencia existe
    function _transferExists(uint256 transferId) internal view {
        require(transferId > 0 && transferId < nextTransferId, "Transferencia no existe");
    }

    // ============ Constructor ============
    
    /// @dev Dirección del admin configurada
    address constant ADMIN_ADDRESS = 0xeD252BAc2D88971cb5B393B0760f05AF27413b91;
    
    /// @dev Inicializa el contrato estableciendo el admin configurado
    constructor() {
        admin = ADMIN_ADDRESS;
        
        // Registrar al admin como usuario aprobado
        users[nextUserId] = User({
            id: nextUserId,
            userAddress: ADMIN_ADDRESS,
            role: "admin",
            status: UserStatus.Approved
        });
        addressToUserId[ADMIN_ADDRESS] = nextUserId;
        nextUserId++;
    }

    // ============ User Management Functions ============
    
    /**
     * @dev Solicita un rol para el usuario que llama la función
     * @param role El rol solicitado (ej: "manufacturer", "distributor", "retailer")
     */
    function requestUserRole(string memory role) public {
        require(bytes(role).length > 0, "El rol no puede estar vacio");
        require(addressToUserId[msg.sender] == 0, "Usuario ya registrado");

        users[nextUserId] = User({
            id: nextUserId,
            userAddress: msg.sender,
            role: role,
            status: UserStatus.Pending
        });
        
        addressToUserId[msg.sender] = nextUserId;
        nextUserId++;

        emit UserRoleRequested(msg.sender, role);
    }

    /**
     * @dev Cambia el estado de un usuario (solo admin)
     * @param userAddress Dirección del usuario
     * @param newStatus Nuevo estado del usuario
     */
    function changeStatusUser(address userAddress, UserStatus newStatus) public onlyAdmin {
        uint256 userId = addressToUserId[userAddress];
        require(userId != 0, "Usuario no encontrado");
        require(userAddress != admin, "No se puede cambiar el estado del admin");

        users[userId].status = newStatus;

        emit UserStatusChanged(userAddress, newStatus);
    }

    /**
     * @dev Obtiene la información de un usuario
     * @param userAddress Dirección del usuario
     * @return User Estructura con la información del usuario
     */
    function getUserInfo(address userAddress) public view returns (User memory) {
        uint256 userId = addressToUserId[userAddress];
        require(userId != 0, "Usuario no encontrado");
        return users[userId];
    }

    /**
     * @dev Verifica si una dirección es el administrador
     * @param userAddress Dirección a verificar
     * @return bool True si es admin, false en caso contrario
     */
    function isAdmin(address userAddress) public view returns (bool) {
        return userAddress == admin;
    }

    // ============ Token Management Functions ============
    
    /**
     * @dev Crea un nuevo token
     * @param name Nombre del token
     * @param totalSupply Cantidad total de tokens a crear
     * @param features Características del token en formato JSON
     * @param tokenType Tipo de token
     * @param parentIds Array de IDs de tokens padres (vacío si no tiene)
     * @param parentAmounts Array de cantidades de cada token padre (vacío si no tiene)
     */
    function createToken(
        string memory name,
        uint256 totalSupply,
        string memory features,
        TokenType tokenType,
        uint256[] memory parentIds,
        uint256[] memory parentAmounts,
        bool isRecall
    ) public onlyApprovedUser {
        require(bytes(name).length > 0, "El nombre no puede estar vacio");
        require(totalSupply > 0, "El supply debe ser mayor a 0");
        require(parentIds.length == parentAmounts.length, "parentIds y parentAmounts deben tener la misma longitud");
        
        // Verificar que todos los parentIds existan y no estén en recall
        for (uint256 i = 0; i < parentIds.length; i++) {
            require(parentIds[i] > 0 && parentIds[i] < nextTokenId, "Token padre no existe");
            require(parentAmounts[i] > 0, "La cantidad del padre debe ser mayor a 0");
            
            // Verificar que el token padre no esté en recall
            Token memory parentToken = _tokens[parentIds[i]];
            require(!parentToken.recall, "No se puede usar un token retirado (recall) como padre");
        }
        
        // Validar que isRecall solo sea true para COMPLIANCE_LOG
        if (isRecall) {
            require(tokenType == TokenType.COMPLIANCE_LOG, "El recall solo es valido para tokens de tipo COMPLIANCE_LOG");
            require(parentIds.length == 1, "Un recall debe tener exactamente un padre");
        }

        // Si es un PT_LOTE, verificar y descontar componentes de la receta
        if (tokenType == TokenType.PT_LOTE) {
            require(parentIds.length == 1, "Un lote debe tener exactamente un padre (receta)");
            
            uint256 recipeId = parentIds[0];
            Token memory recipe = _tokens[recipeId];
            
            // Verificar que el padre sea una receta (BOM)
            require(recipe.tokenType == TokenType.BOM, "El padre de un lote debe ser una receta (BOM)");
            
            // Obtener la cantidad del padre (parentAmount)
            // Nota: parentAmount viene del frontend multiplicado por 1000 (para mantener decimales)
            // Para PT_LOTE, parentAmount debe ser entero, así que dividimos por 1000
            uint256 parentAmountRaw = parentAmounts[0];
            require(parentAmountRaw > 0, "La cantidad del padre debe ser mayor a 0");
            
            // Convertir de BigInt con 3 decimales a entero (dividir por 1000)
            // Ejemplo: 10000 (10.000) / 1000 = 10
            uint256 parentAmount = parentAmountRaw / 1000;
            require(parentAmount > 0, "La cantidad del padre debe ser mayor a 0 despues de la conversion");
            
            // Calcular la cantidad total de unidades de producto terminado: totalSupply × parentAmount
            // Ejemplo: 1000 lotes × 10 unidades/lote = 10000 unidades totales
            uint256 totalUnits = totalSupply * parentAmount;
            
            // Verificar balances y descontar componentes de la receta
            // Los componentes se calculan: cantidad_componente_por_unidad × totalUnits
            _consumeRecipeComponents(recipe, totalUnits, msg.sender);
        }

        // Si es un SSCC (unidad lógica), verificar y descontar unidades del lote padre
        if (tokenType == TokenType.SSCC) {
            require(parentIds.length == 1, "Una unidad logistica debe tener exactamente un padre (lote)");
            
            uint256 lotId = parentIds[0];
            Token memory lot = _tokens[lotId];
            
            // Verificar que el padre sea un lote (PT_LOTE)
            require(lot.tokenType == TokenType.PT_LOTE, "El padre de una unidad logistica debe ser un lote (PT_LOTE)");
            
            // Obtener la cantidad del padre (parentAmount)
            // Nota: parentAmount viene del frontend multiplicado por 1000 (para mantener decimales)
            // Para SSCC, parentAmount debe ser entero, así que dividimos por 1000
            uint256 parentAmountRaw = parentAmounts[0];
            require(parentAmountRaw > 0, "La cantidad del lote padre debe ser mayor a 0");
            
            // Convertir de BigInt con 3 decimales a entero (dividir por 1000)
            // Ejemplo: 1000 (1.000) / 1000 = 1
            uint256 parentAmount = parentAmountRaw / 1000;
            require(parentAmount > 0, "La cantidad del lote padre debe ser mayor a 0 despues de la conversion");
            
            // Calcular la cantidad total a consumir: supply de SSCC × cantidad del padre
            // Ejemplo: 10 unidades SSCC × 1 lote/unidad = 10 lotes totales
            uint256 totalAmountToConsume = totalSupply * parentAmount;
            
            // Verificar que el usuario tenga suficiente balance del lote padre
            // Validar: supply de SSCC × cantidad del padre ≤ balance del lote padre
            uint256 availableBalance = _tokenBalances[lotId][msg.sender];
            require(
                availableBalance >= totalAmountToConsume,
                "Balance insuficiente: el supply de la unidad logistica multiplicado por la cantidad del padre excede el balance disponible del lote"
            );
            
            // Descontar las unidades del balance del usuario
            // Fórmula: balance -= (supply de SSCC × cantidad del padre)
            _tokenBalances[lotId][msg.sender] -= totalAmountToConsume;
        }

        uint256 tokenId = nextTokenId;
        
        _tokens[tokenId] = Token({
            id: tokenId,
            creator: msg.sender,
            name: name,
            totalSupply: totalSupply,
            features: features,
            tokenType: tokenType,
            parentIds: parentIds,
            parentAmounts: parentAmounts,
            dateCreated: block.timestamp,
            recall: isRecall
        });

        // Asignar todo el supply al creador
        _tokenBalances[tokenId][msg.sender] = totalSupply;
        
        // Registrar el token para el usuario
        _userTokenIds[msg.sender].push(tokenId);

        nextTokenId++;

        // Si es un recall, marcar toda la cadena de suministro relacionada
        if (isRecall && parentIds.length > 0) {
            uint256 parentTokenId = parentIds[0];
            _markSupplyChainAsRecall(parentTokenId);
        }

        emit TokenCreated(tokenId, msg.sender, name, totalSupply);
    }

    /**
     * @dev Marca toda la cadena de suministro relacionada como recall
     * @param tokenId ID del token padre del recall
     */
    function _markSupplyChainAsRecall(uint256 tokenId) internal {
        // Marcar el token actual como recall
        _tokens[tokenId].recall = true;
        
        // Marcar todos los padres (hacia arriba en la cadena)
        _markParentsAsRecall(tokenId);
        
        // Marcar todos los hijos (hacia abajo en la cadena)
        _markChildrenAsRecall(tokenId);
    }
    
    /**
     * @dev Marca recursivamente todos los tokens padres como recall
     * @param tokenId ID del token
     */
    function _markParentsAsRecall(uint256 tokenId) internal {
        Token storage token = _tokens[tokenId];
        
        // Recorrer todos los padres
        for (uint256 i = 0; i < token.parentIds.length; i++) {
            uint256 parentId = token.parentIds[i];
            
            // Si el padre no está ya marcado como recall, marcarlo y continuar recursivamente
            if (!_tokens[parentId].recall) {
                _tokens[parentId].recall = true;
                _markParentsAsRecall(parentId);
            }
        }
    }
    
    /**
     * @dev Marca recursivamente todos los tokens hijos como recall
     * @param tokenId ID del token
     */
    function _markChildrenAsRecall(uint256 tokenId) internal {
        // Buscar todos los tokens que tienen este token como padre
        for (uint256 i = 1; i < nextTokenId; i++) {
            Token storage childToken = _tokens[i];
            
            // Verificar si este token tiene el tokenId como padre
            for (uint256 j = 0; j < childToken.parentIds.length; j++) {
                if (childToken.parentIds[j] == tokenId) {
                    // Si el hijo no está ya marcado como recall, marcarlo y continuar recursivamente
                    if (!childToken.recall) {
                        childToken.recall = true;
                        _markChildrenAsRecall(i);
                    }
                    break; // Solo necesitamos encontrar una vez
                }
            }
        }
    }

    /**
     * @dev Consume componentes de una receta al crear un lote
     * @param recipe Receta (BOM) que contiene los componentes
     * @param lotAmount Cantidad de unidades del lote a crear
     * @param consumer Dirección que consume los componentes
     */
    function _consumeRecipeComponents(Token memory recipe, uint256 lotAmount, address consumer) internal {
        require(recipe.parentIds.length == recipe.parentAmounts.length, "Receta invalida: parentIds y parentAmounts no coinciden");
        
        // Nota: componentAmountPerUnit está almacenado con 3 decimales (multiplicado por 1000)
        // Ejemplo: 500 representa 0.5 unidades
        // lotAmount es un entero (cantidad de unidades totales)
        // totalComponentNeeded = (componentAmountPerUnit * lotAmount) / 1000
        
        // Verificar que hay suficientes componentes antes de descontar
        for (uint256 i = 0; i < recipe.parentIds.length; i++) {
            uint256 componentId = recipe.parentIds[i];
            uint256 componentAmountPerUnit = recipe.parentAmounts[i]; // Con 3 decimales (ej: 500 = 0.5)
            uint256 totalComponentNeeded = (componentAmountPerUnit * lotAmount) / 1000;
            
            // Obtener el balance disponible del componente
            uint256 availableBalance = _tokenBalances[componentId][consumer];
            
            // Verificar que hay suficiente balance
            require(
                availableBalance >= totalComponentNeeded,
                "Componente insuficiente: no hay suficiente cantidad de componentes para crear el lote"
            );
        }
        
        // Si todas las validaciones pasaron, descontar los componentes
        for (uint256 i = 0; i < recipe.parentIds.length; i++) {
            uint256 componentId = recipe.parentIds[i];
            uint256 componentAmountPerUnit = recipe.parentAmounts[i]; // Con 3 decimales (ej: 500 = 0.5)
            uint256 totalComponentNeeded = (componentAmountPerUnit * lotAmount) / 1000;
            
            // Descontar del balance del consumidor
            _tokenBalances[componentId][consumer] -= totalComponentNeeded;
        }
    }


    /**
     * @dev Obtiene la información de un token
     * @param tokenId ID del token
     * @return Token Estructura con la información del token
     */
    function getToken(uint256 tokenId) public view tokenExists(tokenId) returns (Token memory) {
        return _tokens[tokenId];
    }

    /**
     * @dev Obtiene el balance de un usuario para un token específico
     * @param tokenId ID del token
     * @param userAddress Dirección del usuario
     * @return uint256 Balance del usuario
     */
    function getTokenBalance(uint256 tokenId, address userAddress) public view tokenExists(tokenId) returns (uint256) {
        return _tokenBalances[tokenId][userAddress];
    }

    // ============ Transfer Management Functions ============
    
    /**
     * @dev Crea una solicitud de transferencia
     * @param to Dirección del destinatario
     * @param tokenId ID del token a transferir
     * @param amount Cantidad a transferir
     */
    function transfer(address to, uint256 tokenId, uint256 amount) public onlyApprovedUser tokenExists(tokenId) {
        require(to != address(0), "Direccion destino invalida");
        require(to != msg.sender, "No puedes transferir a ti mismo");
        require(amount > 0, "La cantidad debe ser mayor a 0");
        require(_tokenBalances[tokenId][msg.sender] >= amount, "Balance insuficiente");
        
        // Verificar que el token no esté en recall
        require(!_tokens[tokenId].recall, "No se puede transferir un token retirado (recall)");
        
        // Verificar que el destinatario sea un usuario aprobado
        uint256 toUserId = addressToUserId[to];
        require(toUserId != 0, "Destinatario no registrado");
        require(users[toUserId].status == UserStatus.Approved, "Destinatario no aprobado");

        uint256 transferId = nextTransferId;

        transfers[transferId] = Transfer({
            id: transferId,
            from: msg.sender,
            to: to,
            tokenId: tokenId,
            dateCreated: block.timestamp,
            amount: amount,
            status: TransferStatus.Pending
        });

        // Registrar la transferencia para ambos usuarios
        _userTransferIds[msg.sender].push(transferId);
        _userTransferIds[to].push(transferId);

        nextTransferId++;

        emit TransferRequested(transferId, msg.sender, to, tokenId, amount);
    }

    /**
     * @dev Acepta una transferencia pendiente
     * @param transferId ID de la transferencia
     */
    function acceptTransfer(uint256 transferId) public transferExists(transferId) {
        Transfer storage t = transfers[transferId];
        
        require(t.to == msg.sender, "Solo el destinatario puede aceptar");
        require(t.status == TransferStatus.Pending, "Transferencia no esta pendiente");
        require(_tokenBalances[t.tokenId][t.from] >= t.amount, "El remitente ya no tiene balance suficiente");

        // Realizar la transferencia
        _tokenBalances[t.tokenId][t.from] -= t.amount;
        _tokenBalances[t.tokenId][t.to] += t.amount;
        
        t.status = TransferStatus.Accepted;

        // Si el destinatario no tiene este token registrado, agregarlo
        bool hasToken = false;
        uint256[] storage userTokens = _userTokenIds[t.to];
        for (uint256 i = 0; i < userTokens.length; i++) {
            if (userTokens[i] == t.tokenId) {
                hasToken = true;
                break;
            }
        }
        if (!hasToken) {
            _userTokenIds[t.to].push(t.tokenId);
        }

        emit TransferAccepted(transferId);
    }

    /**
     * @dev Rechaza una transferencia pendiente
     * @param transferId ID de la transferencia
     */
    function rejectTransfer(uint256 transferId) public transferExists(transferId) {
        Transfer storage t = transfers[transferId];
        
        require(t.to == msg.sender, "Solo el destinatario puede rechazar");
        require(t.status == TransferStatus.Pending, "Transferencia no esta pendiente");

        t.status = TransferStatus.Rejected;

        emit TransferRejected(transferId);
    }

    /**
     * @dev Obtiene la información de una transferencia
     * @param transferId ID de la transferencia
     * @return Transfer Estructura con la información de la transferencia
     */
    function getTransfer(uint256 transferId) public view transferExists(transferId) returns (Transfer memory) {
        return transfers[transferId];
    }

    // ============ Auxiliary Functions ============
    
    /**
     * @dev Obtiene los IDs de tokens que posee un usuario
     * @param userAddress Dirección del usuario
     * @return uint256[] Array de IDs de tokens
     */
    function getUserTokens(address userAddress) public view returns (uint256[] memory) {
        return _userTokenIds[userAddress];
    }

    /**
     * @dev Obtiene los IDs de transferencias de un usuario
     * @param userAddress Dirección del usuario
     * @return uint256[] Array de IDs de transferencias
     */
    function getUserTransfers(address userAddress) public view returns (uint256[] memory) {
        return _userTransferIds[userAddress];
    }

    /**
     * @dev Obtiene el total de tokens creados
     * @return uint256 Número total de tokens
     */
    function getTotalTokens() public view returns (uint256) {
        return nextTokenId - 1;
    }

    /**
     * @dev Obtiene el total de transferencias
     * @return uint256 Número total de transferencias
     */
    function getTotalTransfers() public view returns (uint256) {
        return nextTransferId - 1;
    }

    /**
     * @dev Obtiene el total de usuarios
     * @return uint256 Número total de usuarios
     */
    function getTotalUsers() public view returns (uint256) {
        return nextUserId - 1;
    }
}
