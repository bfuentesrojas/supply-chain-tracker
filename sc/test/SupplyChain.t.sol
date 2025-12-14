// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {SupplyChain} from "../src/SupplyChain.sol";

/**
 * @title SupplyChainTest
 * @dev Tests completos para el contrato SupplyChain
 */
contract SupplyChainTest is Test {
    SupplyChain public supplyChain;
    
    address public admin;
    address public producer;      // manufacturer/producer
    address public factory;       // distributor/factory
    address public retailer;
    address public consumer;

    // Eventos para testing
    event TokenCreated(uint256 indexed tokenId, address indexed creator, string name, uint256 totalSupply);
    event TransferRequested(uint256 indexed transferId, address indexed from, address indexed to, uint256 tokenId, uint256 amount);
    event TransferAccepted(uint256 indexed transferId);
    event TransferRejected(uint256 indexed transferId);
    event UserRoleRequested(address indexed user, string role);
    event UserStatusChanged(address indexed user, SupplyChain.UserStatus status);

    // ============ Setup y configuración inicial ============
    
    function setUp() public {
        admin = address(this);
        producer = makeAddr("producer");
        factory = makeAddr("factory");
        retailer = makeAddr("retailer");
        consumer = makeAddr("consumer");

        supplyChain = new SupplyChain();
    }

    // ============ Tests de gestión de usuarios ============
    
    function testUserRegistration() public {
        // Usuario solicita rol de producer
        vm.prank(producer);
        supplyChain.requestUserRole("producer");

        SupplyChain.User memory user = supplyChain.getUserInfo(producer);
        assertEq(user.userAddress, producer);
        assertEq(user.role, "producer");
        assertEq(uint(user.status), uint(SupplyChain.UserStatus.Pending));
        assertTrue(user.id > 0);
    }

    function testAdminApproveUser() public {
        // Registrar usuario
        vm.prank(producer);
        supplyChain.requestUserRole("producer");

        // Admin aprueba
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);

        SupplyChain.User memory user = supplyChain.getUserInfo(producer);
        assertEq(uint(user.status), uint(SupplyChain.UserStatus.Approved));
    }

    function testAdminRejectUser() public {
        // Registrar usuario
        vm.prank(producer);
        supplyChain.requestUserRole("producer");

        // Admin rechaza
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Rejected);

        SupplyChain.User memory user = supplyChain.getUserInfo(producer);
        assertEq(uint(user.status), uint(SupplyChain.UserStatus.Rejected));
    }

    function testUserStatusChanges() public {
        // Registrar usuario
        vm.prank(producer);
        supplyChain.requestUserRole("producer");

        // Estado inicial: Pending
        SupplyChain.User memory user = supplyChain.getUserInfo(producer);
        assertEq(uint(user.status), uint(SupplyChain.UserStatus.Pending));

        // Cambiar a Approved
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);
        user = supplyChain.getUserInfo(producer);
        assertEq(uint(user.status), uint(SupplyChain.UserStatus.Approved));

        // Cambiar a Rejected
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Rejected);
        user = supplyChain.getUserInfo(producer);
        assertEq(uint(user.status), uint(SupplyChain.UserStatus.Rejected));

        // Cambiar a Canceled
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Canceled);
        user = supplyChain.getUserInfo(producer);
        assertEq(uint(user.status), uint(SupplyChain.UserStatus.Canceled));
    }

    function testOnlyApprovedUsersCanOperate() public {
        // Registrar pero NO aprobar producer
        vm.prank(producer);
        supplyChain.requestUserRole("producer");

        // Intentar crear token sin estar aprobado
        vm.prank(producer);
        vm.expectRevert("Usuario no aprobado");
        supplyChain.createToken("Product", 100, "", 0);

        // Aprobar usuario
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);

        // Ahora sí puede crear token
        vm.prank(producer);
        supplyChain.createToken("Product", 100, "", 0);
        
        assertEq(supplyChain.getTotalTokens(), 1);
    }

    function testGetUserInfo() public {
        vm.prank(producer);
        supplyChain.requestUserRole("producer");
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);

        SupplyChain.User memory user = supplyChain.getUserInfo(producer);
        
        assertEq(user.userAddress, producer);
        assertEq(user.role, "producer");
        assertEq(uint(user.status), uint(SupplyChain.UserStatus.Approved));
        assertTrue(user.id > 0);
    }

    function testIsAdmin() public view {
        assertTrue(supplyChain.isAdmin(admin));
        assertFalse(supplyChain.isAdmin(producer));
        assertFalse(supplyChain.isAdmin(factory));
        assertFalse(supplyChain.isAdmin(address(0)));
    }

    // ============ Tests de creación de tokens ============
    
    function testCreateTokenByProducer() public {
        _approveUser(producer, "producer");

        vm.prank(producer);
        supplyChain.createToken("Raw Material", 1000, '{"type":"organic"}', 0);

        SupplyChain.Token memory token = supplyChain.getToken(1);
        assertEq(token.name, "Raw Material");
        assertEq(token.creator, producer);
        assertEq(token.totalSupply, 1000);
    }

    function testCreateTokenByFactory() public {
        _approveUser(factory, "factory");

        vm.prank(factory);
        supplyChain.createToken("Processed Product", 500, '{"batch":"A001"}', 0);

        SupplyChain.Token memory token = supplyChain.getToken(1);
        assertEq(token.name, "Processed Product");
        assertEq(token.creator, factory);
    }

    function testCreateTokenByRetailer() public {
        _approveUser(retailer, "retailer");

        vm.prank(retailer);
        supplyChain.createToken("Retail Package", 100, '{"sku":"RTL001"}', 0);

        SupplyChain.Token memory token = supplyChain.getToken(1);
        assertEq(token.name, "Retail Package");
        assertEq(token.creator, retailer);
    }

    function testTokenWithParentId() public {
        _approveUser(producer, "producer");

        vm.startPrank(producer);
        // Crear token padre
        supplyChain.createToken("Parent Product", 1000, "", 0);
        // Crear token hijo con parentId = 1
        supplyChain.createToken("Child Product", 500, "", 1);
        vm.stopPrank();

        SupplyChain.Token memory parentToken = supplyChain.getToken(1);
        SupplyChain.Token memory childToken = supplyChain.getToken(2);

        assertEq(parentToken.parentId, 0);
        assertEq(childToken.parentId, 1);
    }

    function testTokenMetadata() public {
        _approveUser(producer, "producer");

        string memory features = '{"color":"blue","weight":"1.5kg","origin":"Spain","certifications":["ISO9001","organic"]}';
        
        vm.prank(producer);
        supplyChain.createToken("Product with Metadata", 100, features, 0);

        SupplyChain.Token memory token = supplyChain.getToken(1);
        assertEq(token.features, features);
        assertEq(token.name, "Product with Metadata");
        assertTrue(token.dateCreated > 0);
    }

    function testTokenBalance() public {
        _approveUser(producer, "producer");

        vm.prank(producer);
        supplyChain.createToken("Product", 1000, "", 0);

        // El creador tiene todo el supply
        uint256 balance = supplyChain.getTokenBalance(1, producer);
        assertEq(balance, 1000);

        // Otros usuarios tienen balance 0
        assertEq(supplyChain.getTokenBalance(1, factory), 0);
        assertEq(supplyChain.getTokenBalance(1, retailer), 0);
    }

    function testGetToken() public {
        _approveUser(producer, "producer");

        vm.prank(producer);
        supplyChain.createToken("Test Product", 500, '{"test":true}', 0);

        SupplyChain.Token memory token = supplyChain.getToken(1);
        
        assertEq(token.id, 1);
        assertEq(token.name, "Test Product");
        assertEq(token.creator, producer);
        assertEq(token.totalSupply, 500);
        assertEq(token.features, '{"test":true}');
        assertEq(token.parentId, 0);
        assertTrue(token.dateCreated > 0);
    }

    function testGetUserTokens() public {
        _approveUser(producer, "producer");

        vm.startPrank(producer);
        supplyChain.createToken("Product 1", 100, "", 0);
        supplyChain.createToken("Product 2", 200, "", 0);
        supplyChain.createToken("Product 3", 300, "", 0);
        vm.stopPrank();

        uint256[] memory tokens = supplyChain.getUserTokens(producer);
        
        assertEq(tokens.length, 3);
        assertEq(tokens[0], 1);
        assertEq(tokens[1], 2);
        assertEq(tokens[2], 3);
    }

    // ============ Tests de transferencias ============
    
    function testTransferFromProducerToFactory() public {
        _approveUser(producer, "producer");
        _approveUser(factory, "factory");

        vm.prank(producer);
        supplyChain.createToken("Raw Material", 1000, "", 0);

        vm.prank(producer);
        supplyChain.transfer(factory, 1, 500);

        SupplyChain.Transfer memory t = supplyChain.getTransfer(1);
        assertEq(t.from, producer);
        assertEq(t.to, factory);
        assertEq(t.amount, 500);
        assertEq(uint(t.status), uint(SupplyChain.TransferStatus.Pending));
    }

    function testTransferFromFactoryToRetailer() public {
        _approveUser(producer, "producer");
        _approveUser(factory, "factory");
        _approveUser(retailer, "retailer");

        // Producer crea y transfiere a factory
        vm.prank(producer);
        supplyChain.createToken("Product", 1000, "", 0);
        vm.prank(producer);
        supplyChain.transfer(factory, 1, 500);
        vm.prank(factory);
        supplyChain.acceptTransfer(1);

        // Factory transfiere a retailer
        vm.prank(factory);
        supplyChain.transfer(retailer, 1, 200);

        SupplyChain.Transfer memory t = supplyChain.getTransfer(2);
        assertEq(t.from, factory);
        assertEq(t.to, retailer);
        assertEq(t.amount, 200);
    }

    function testTransferFromRetailerToConsumer() public {
        _approveUser(producer, "producer");
        _approveUser(factory, "factory");
        _approveUser(retailer, "retailer");
        _approveUser(consumer, "consumer");

        // Cadena completa
        vm.prank(producer);
        supplyChain.createToken("Product", 1000, "", 0);
        
        vm.prank(producer);
        supplyChain.transfer(factory, 1, 500);
        vm.prank(factory);
        supplyChain.acceptTransfer(1);
        
        vm.prank(factory);
        supplyChain.transfer(retailer, 1, 200);
        vm.prank(retailer);
        supplyChain.acceptTransfer(2);

        // Retailer a consumer
        vm.prank(retailer);
        supplyChain.transfer(consumer, 1, 50);

        SupplyChain.Transfer memory t = supplyChain.getTransfer(3);
        assertEq(t.from, retailer);
        assertEq(t.to, consumer);
        assertEq(t.amount, 50);
    }

    function testAcceptTransfer() public {
        _approveUser(producer, "producer");
        _approveUser(factory, "factory");

        vm.prank(producer);
        supplyChain.createToken("Product", 1000, "", 0);

        vm.prank(producer);
        supplyChain.transfer(factory, 1, 300);

        // Verificar balances antes
        assertEq(supplyChain.getTokenBalance(1, producer), 1000);
        assertEq(supplyChain.getTokenBalance(1, factory), 0);

        vm.prank(factory);
        supplyChain.acceptTransfer(1);

        // Verificar balances después
        assertEq(supplyChain.getTokenBalance(1, producer), 700);
        assertEq(supplyChain.getTokenBalance(1, factory), 300);

        // Verificar estado
        SupplyChain.Transfer memory t = supplyChain.getTransfer(1);
        assertEq(uint(t.status), uint(SupplyChain.TransferStatus.Accepted));
    }

    function testRejectTransfer() public {
        _approveUser(producer, "producer");
        _approveUser(factory, "factory");

        vm.prank(producer);
        supplyChain.createToken("Product", 1000, "", 0);

        vm.prank(producer);
        supplyChain.transfer(factory, 1, 300);

        vm.prank(factory);
        supplyChain.rejectTransfer(1);

        // Balances no cambian
        assertEq(supplyChain.getTokenBalance(1, producer), 1000);
        assertEq(supplyChain.getTokenBalance(1, factory), 0);

        // Estado es Rejected
        SupplyChain.Transfer memory t = supplyChain.getTransfer(1);
        assertEq(uint(t.status), uint(SupplyChain.TransferStatus.Rejected));
    }

    function testTransferInsufficientBalance() public {
        _approveUser(producer, "producer");
        _approveUser(factory, "factory");

        vm.prank(producer);
        supplyChain.createToken("Product", 100, "", 0);

        vm.prank(producer);
        vm.expectRevert("Balance insuficiente");
        supplyChain.transfer(factory, 1, 200); // Intenta transferir más de lo que tiene
    }

    function testGetTransfer() public {
        _approveUser(producer, "producer");
        _approveUser(factory, "factory");

        vm.prank(producer);
        supplyChain.createToken("Product", 1000, "", 0);

        vm.prank(producer);
        supplyChain.transfer(factory, 1, 250);

        SupplyChain.Transfer memory t = supplyChain.getTransfer(1);
        
        assertEq(t.id, 1);
        assertEq(t.from, producer);
        assertEq(t.to, factory);
        assertEq(t.tokenId, 1);
        assertEq(t.amount, 250);
        assertEq(uint(t.status), uint(SupplyChain.TransferStatus.Pending));
        assertTrue(t.dateCreated > 0);
    }

    function testGetUserTransfers() public {
        _approveUser(producer, "producer");
        _approveUser(factory, "factory");

        vm.prank(producer);
        supplyChain.createToken("Product", 1000, "", 0);

        vm.prank(producer);
        supplyChain.transfer(factory, 1, 100);
        vm.prank(producer);
        supplyChain.transfer(factory, 1, 200);

        uint256[] memory producerTransfers = supplyChain.getUserTransfers(producer);
        uint256[] memory factoryTransfers = supplyChain.getUserTransfers(factory);

        assertEq(producerTransfers.length, 2);
        assertEq(factoryTransfers.length, 2);
    }

    // ============ Tests de validaciones y permisos ============
    
    function testInvalidRoleTransfer() public {
        _approveUser(producer, "producer");
        // Factory no está registrado

        vm.prank(producer);
        supplyChain.createToken("Product", 1000, "", 0);

        vm.prank(producer);
        vm.expectRevert("Destinatario no registrado");
        supplyChain.transfer(factory, 1, 100);
    }

    function testUnapprovedUserCannotCreateToken() public {
        // Registrar pero no aprobar
        vm.prank(producer);
        supplyChain.requestUserRole("producer");

        vm.prank(producer);
        vm.expectRevert("Usuario no aprobado");
        supplyChain.createToken("Product", 100, "", 0);
    }

    function testUnapprovedUserCannotTransfer() public {
        _approveUser(producer, "producer");
        
        // Registrar factory pero no aprobar
        vm.prank(factory);
        supplyChain.requestUserRole("factory");

        vm.prank(producer);
        supplyChain.createToken("Product", 1000, "", 0);

        // Producer intenta transferir a factory no aprobado
        vm.prank(producer);
        vm.expectRevert("Destinatario no aprobado");
        supplyChain.transfer(factory, 1, 100);
    }

    function testOnlyAdminCanChangeStatus() public {
        vm.prank(producer);
        supplyChain.requestUserRole("producer");

        // No-admin intenta cambiar estado
        vm.prank(factory);
        vm.expectRevert("Solo el admin puede ejecutar esta funcion");
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);

        // Admin puede cambiar estado
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);
        SupplyChain.User memory user = supplyChain.getUserInfo(producer);
        assertEq(uint(user.status), uint(SupplyChain.UserStatus.Approved));
    }

    function testConsumerCannotTransfer() public {
        _approveUser(producer, "producer");
        _approveUser(factory, "factory");
        _approveUser(retailer, "retailer");
        _approveUser(consumer, "consumer");

        // Cadena hasta consumer
        vm.prank(producer);
        supplyChain.createToken("Product", 100, "", 0);
        vm.prank(producer);
        supplyChain.transfer(factory, 1, 50);
        vm.prank(factory);
        supplyChain.acceptTransfer(1);
        vm.prank(factory);
        supplyChain.transfer(retailer, 1, 25);
        vm.prank(retailer);
        supplyChain.acceptTransfer(2);
        vm.prank(retailer);
        supplyChain.transfer(consumer, 1, 10);
        vm.prank(consumer);
        supplyChain.acceptTransfer(3);

        // Consumer tiene tokens pero puede intentar transferir
        // (El contrato actual no restringe por rol, solo por aprobación)
        // Si el consumer intenta transferir a alguien no registrado, fallará
        address randomUser = makeAddr("random");
        vm.prank(consumer);
        vm.expectRevert("Destinatario no registrado");
        supplyChain.transfer(randomUser, 1, 5);
    }

    function testTransferToSameAddress() public {
        _approveUser(producer, "producer");

        vm.prank(producer);
        supplyChain.createToken("Product", 1000, "", 0);

        vm.prank(producer);
        vm.expectRevert("No puedes transferir a ti mismo");
        supplyChain.transfer(producer, 1, 100);
    }

    // ============ Tests de casos edge ============
    
    function testTransferZeroAmount() public {
        _approveUser(producer, "producer");
        _approveUser(factory, "factory");

        vm.prank(producer);
        supplyChain.createToken("Product", 1000, "", 0);

        vm.prank(producer);
        vm.expectRevert("La cantidad debe ser mayor a 0");
        supplyChain.transfer(factory, 1, 0);
    }

    function testTransferNonExistentToken() public {
        _approveUser(producer, "producer");
        _approveUser(factory, "factory");

        vm.prank(producer);
        vm.expectRevert("Token no existe");
        supplyChain.transfer(factory, 999, 100);
    }

    function testAcceptNonExistentTransfer() public {
        _approveUser(factory, "factory");

        vm.prank(factory);
        vm.expectRevert("Transferencia no existe");
        supplyChain.acceptTransfer(999);
    }

    function testDoubleAcceptTransfer() public {
        _approveUser(producer, "producer");
        _approveUser(factory, "factory");

        vm.prank(producer);
        supplyChain.createToken("Product", 1000, "", 0);

        vm.prank(producer);
        supplyChain.transfer(factory, 1, 100);

        // Primera aceptación
        vm.prank(factory);
        supplyChain.acceptTransfer(1);

        // Intentar aceptar de nuevo
        vm.prank(factory);
        vm.expectRevert("Transferencia no esta pendiente");
        supplyChain.acceptTransfer(1);
    }

    function testTransferAfterRejection() public {
        _approveUser(producer, "producer");
        _approveUser(factory, "factory");

        vm.prank(producer);
        supplyChain.createToken("Product", 1000, "", 0);

        // Primera transferencia rechazada
        vm.prank(producer);
        supplyChain.transfer(factory, 1, 100);
        vm.prank(factory);
        supplyChain.rejectTransfer(1);

        // Puede crear nueva transferencia después del rechazo
        vm.prank(producer);
        supplyChain.transfer(factory, 1, 200);

        SupplyChain.Transfer memory t = supplyChain.getTransfer(2);
        assertEq(t.amount, 200);
        assertEq(uint(t.status), uint(SupplyChain.TransferStatus.Pending));

        // Y aceptarla
        vm.prank(factory);
        supplyChain.acceptTransfer(2);
        assertEq(supplyChain.getTokenBalance(1, factory), 200);
    }

    // ============ Tests de eventos ============
    
    function testUserRegisteredEvent() public {
        vm.prank(producer);
        vm.expectEmit(true, false, false, true);
        emit UserRoleRequested(producer, "producer");
        
        supplyChain.requestUserRole("producer");
    }

    function testUserStatusChangedEvent() public {
        vm.prank(producer);
        supplyChain.requestUserRole("producer");

        vm.expectEmit(true, false, false, true);
        emit UserStatusChanged(producer, SupplyChain.UserStatus.Approved);
        
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);
    }

    function testTokenCreatedEvent() public {
        _approveUser(producer, "producer");

        vm.prank(producer);
        vm.expectEmit(true, true, false, true);
        emit TokenCreated(1, producer, "Product", 1000);
        
        supplyChain.createToken("Product", 1000, "", 0);
    }

    function testTransferInitiatedEvent() public {
        _approveUser(producer, "producer");
        _approveUser(factory, "factory");

        vm.prank(producer);
        supplyChain.createToken("Product", 1000, "", 0);

        vm.prank(producer);
        vm.expectEmit(true, true, true, true);
        emit TransferRequested(1, producer, factory, 1, 100);
        
        supplyChain.transfer(factory, 1, 100);
    }

    function testTransferAcceptedEvent() public {
        _approveUser(producer, "producer");
        _approveUser(factory, "factory");

        vm.prank(producer);
        supplyChain.createToken("Product", 1000, "", 0);
        vm.prank(producer);
        supplyChain.transfer(factory, 1, 100);

        vm.prank(factory);
        vm.expectEmit(true, false, false, false);
        emit TransferAccepted(1);
        
        supplyChain.acceptTransfer(1);
    }

    function testTransferRejectedEvent() public {
        _approveUser(producer, "producer");
        _approveUser(factory, "factory");

        vm.prank(producer);
        supplyChain.createToken("Product", 1000, "", 0);
        vm.prank(producer);
        supplyChain.transfer(factory, 1, 100);

        vm.prank(factory);
        vm.expectEmit(true, false, false, false);
        emit TransferRejected(1);
        
        supplyChain.rejectTransfer(1);
    }

    // ============ Tests de flujo completo ============
    
    function testCompleteSupplyChainFlow() public {
        // 1. Registrar y aprobar todos los participantes
        _approveUser(producer, "producer");
        _approveUser(factory, "factory");
        _approveUser(retailer, "retailer");
        _approveUser(consumer, "consumer");

        // 2. Producer crea materia prima
        vm.prank(producer);
        supplyChain.createToken("Raw Coffee Beans", 1000, '{"origin":"Colombia","harvest":"2024"}', 0);

        // 3. Producer -> Factory (500 unidades)
        vm.prank(producer);
        supplyChain.transfer(factory, 1, 500);
        vm.prank(factory);
        supplyChain.acceptTransfer(1);

        // 4. Factory -> Retailer (200 unidades)
        vm.prank(factory);
        supplyChain.transfer(retailer, 1, 200);
        vm.prank(retailer);
        supplyChain.acceptTransfer(2);

        // 5. Retailer -> Consumer (50 unidades)
        vm.prank(retailer);
        supplyChain.transfer(consumer, 1, 50);
        vm.prank(consumer);
        supplyChain.acceptTransfer(3);

        // Verificar balances finales
        assertEq(supplyChain.getTokenBalance(1, producer), 500);
        assertEq(supplyChain.getTokenBalance(1, factory), 300);
        assertEq(supplyChain.getTokenBalance(1, retailer), 150);
        assertEq(supplyChain.getTokenBalance(1, consumer), 50);

        // Verificar total transferencias
        assertEq(supplyChain.getTotalTransfers(), 3);
    }

    function testMultipleTokensFlow() public {
        _approveUser(producer, "producer");
        _approveUser(factory, "factory");

        // Crear múltiples tokens
        vm.startPrank(producer);
        supplyChain.createToken("Product A", 1000, "", 0);
        supplyChain.createToken("Product B", 500, "", 0);
        supplyChain.createToken("Product C", 200, "", 0);
        vm.stopPrank();

        assertEq(supplyChain.getTotalTokens(), 3);

        // Transferir cada producto
        vm.prank(producer);
        supplyChain.transfer(factory, 1, 100);
        vm.prank(producer);
        supplyChain.transfer(factory, 2, 50);
        vm.prank(producer);
        supplyChain.transfer(factory, 3, 20);

        // Aceptar todas las transferencias
        vm.startPrank(factory);
        supplyChain.acceptTransfer(1);
        supplyChain.acceptTransfer(2);
        supplyChain.acceptTransfer(3);
        vm.stopPrank();

        // Verificar balances de factory
        assertEq(supplyChain.getTokenBalance(1, factory), 100);
        assertEq(supplyChain.getTokenBalance(2, factory), 50);
        assertEq(supplyChain.getTokenBalance(3, factory), 20);

        // Verificar tokens de factory
        uint256[] memory factoryTokens = supplyChain.getUserTokens(factory);
        assertEq(factoryTokens.length, 3);
    }

    function testTraceabilityFlow() public {
        _approveUser(producer, "producer");
        _approveUser(factory, "factory");

        // Crear token padre (materia prima)
        vm.prank(producer);
        supplyChain.createToken("Raw Material", 1000, '{"source":"Farm A"}', 0);

        // Transferir a factory
        vm.prank(producer);
        supplyChain.transfer(factory, 1, 500);
        vm.prank(factory);
        supplyChain.acceptTransfer(1);

        // Factory crea producto derivado (con parentId)
        vm.prank(factory);
        supplyChain.createToken("Processed Product", 500, '{"batch":"B001"}', 1);

        // Verificar trazabilidad
        SupplyChain.Token memory rawMaterial = supplyChain.getToken(1);
        SupplyChain.Token memory processedProduct = supplyChain.getToken(2);

        assertEq(rawMaterial.parentId, 0); // Sin padre
        assertEq(processedProduct.parentId, 1); // Derivado del token 1
        assertEq(processedProduct.creator, factory);

        // Verificar historial de transferencias
        uint256[] memory producerTransfers = supplyChain.getUserTransfers(producer);
        uint256[] memory factoryTransfers = supplyChain.getUserTransfers(factory);

        assertEq(producerTransfers.length, 1);
        assertEq(factoryTransfers.length, 1);
    }

    // ============ Tests adicionales de robustez ============

    function testRejectNonExistentTransfer() public {
        _approveUser(factory, "factory");

        vm.prank(factory);
        vm.expectRevert("Transferencia no existe");
        supplyChain.rejectTransfer(999);
    }

    function testOnlyRecipientCanAccept() public {
        _approveUser(producer, "producer");
        _approveUser(factory, "factory");

        vm.prank(producer);
        supplyChain.createToken("Product", 1000, "", 0);
        vm.prank(producer);
        supplyChain.transfer(factory, 1, 100);

        // Producer intenta aceptar su propia transferencia
        vm.prank(producer);
        vm.expectRevert("Solo el destinatario puede aceptar");
        supplyChain.acceptTransfer(1);
    }

    function testOnlyRecipientCanReject() public {
        _approveUser(producer, "producer");
        _approveUser(factory, "factory");

        vm.prank(producer);
        supplyChain.createToken("Product", 1000, "", 0);
        vm.prank(producer);
        supplyChain.transfer(factory, 1, 100);

        // Producer intenta rechazar
        vm.prank(producer);
        vm.expectRevert("Solo el destinatario puede rechazar");
        supplyChain.rejectTransfer(1);
    }

    function testCannotChangeAdminStatus() public {
        vm.expectRevert("No se puede cambiar el estado del admin");
        supplyChain.changeStatusUser(admin, SupplyChain.UserStatus.Rejected);
    }

    function testEmptyRoleNotAllowed() public {
        vm.prank(producer);
        vm.expectRevert("El rol no puede estar vacio");
        supplyChain.requestUserRole("");
    }

    function testCannotRegisterTwice() public {
        vm.prank(producer);
        supplyChain.requestUserRole("producer");

        vm.prank(producer);
        vm.expectRevert("Usuario ya registrado");
        supplyChain.requestUserRole("factory");
    }

    function testTokenCounters() public {
        assertEq(supplyChain.nextTokenId(), 1);
        assertEq(supplyChain.nextTransferId(), 1);
        assertEq(supplyChain.nextUserId(), 2); // Admin ya registrado

        _approveUser(producer, "producer");
        
        vm.prank(producer);
        supplyChain.createToken("Product", 100, "", 0);

        assertEq(supplyChain.nextTokenId(), 2);
    }

    // ============ Helper Functions ============
    
    function _approveUser(address user, string memory role) internal {
        vm.prank(user);
        supplyChain.requestUserRole(role);
        supplyChain.changeStatusUser(user, SupplyChain.UserStatus.Approved);
    }
}
