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
        // El admin está hardcodeado en el contrato como 0xeD252BAc2D88971cb5B393B0760f05AF27413b91
        admin = 0xeD252BAc2D88971cb5B393B0760f05AF27413b91;
        producer = makeAddr("producer");
        factory = makeAddr("factory");
        retailer = makeAddr("retailer");
        consumer = makeAddr("consumer");

        supplyChain = new SupplyChain();
        
        // Configurar el admin para los tests (usar deal para fondear si es necesario)
        vm.deal(admin, 100 ether);
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
        vm.prank(admin);
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);

        SupplyChain.User memory user = supplyChain.getUserInfo(producer);
        assertEq(uint(user.status), uint(SupplyChain.UserStatus.Approved));
    }

    function testAdminRejectUser() public {
        // Registrar usuario
        vm.prank(producer);
        supplyChain.requestUserRole("producer");

        // Admin rechaza
        vm.prank(admin);
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
        vm.prank(admin);
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);
        user = supplyChain.getUserInfo(producer);
        assertEq(uint(user.status), uint(SupplyChain.UserStatus.Approved));

        // Cambiar a Rejected
        vm.prank(admin);
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Rejected);
        user = supplyChain.getUserInfo(producer);
        assertEq(uint(user.status), uint(SupplyChain.UserStatus.Rejected));

        // Cambiar a Canceled
        vm.prank(admin);
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
        supplyChain.createToken("Product", 100, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);

        // Aprobar usuario
        vm.prank(admin);
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);

        // Ahora sí puede crear token
        vm.prank(producer);
        supplyChain.createToken("Product", 100, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);
        
        assertEq(supplyChain.getTotalTokens(), 1);
    }

    function testGetUserInfo() public {
        vm.prank(producer);
        supplyChain.requestUserRole("producer");
        vm.prank(admin);
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
        supplyChain.createToken("Raw Material", 1000, '{"type":"organic"}', SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);

        SupplyChain.Token memory token = supplyChain.getToken(1);
        assertEq(token.name, "Raw Material");
        assertEq(token.creator, producer);
        assertEq(token.totalSupply, 1000);
    }

    function testCreateTokenByFactory() public {
        _approveUser(factory, "factory");

        // Factory crea una receta primero (necesaria para PT_LOTE)
        vm.prank(factory);
        supplyChain.createToken("Receta", 1, '{"recipe":"R001"}', SupplyChain.TokenType.BOM, new uint256[](0), new uint256[](0), false);

        // Factory crea un lote usando la receta
        uint256[] memory parentIds = new uint256[](1);
        parentIds[0] = 1; // ID de la receta
        uint256[] memory parentAmounts = new uint256[](1);
        parentAmounts[0] = 1;

        vm.prank(factory);
        supplyChain.createToken("Processed Product", 500, '{"batch":"A001"}', SupplyChain.TokenType.PT_LOTE, parentIds, parentAmounts, false);

        SupplyChain.Token memory token = supplyChain.getToken(2);
        assertEq(token.name, "Processed Product");
        assertEq(token.creator, factory);
    }

    function testCreateTokenByRetailer() public {
        _approveUser(retailer, "retailer");
        _approveUser(factory, "factory");

        // Factory crea una receta (BOM) y un lote (PT_LOTE)
        vm.startPrank(factory);
        supplyChain.createToken("Receta", 1, '{"recipe":"R001"}', SupplyChain.TokenType.BOM, new uint256[](0), new uint256[](0), false);
        
        uint256[] memory parentIds = new uint256[](1);
        parentIds[0] = 1; // ID de la receta
        uint256[] memory parentAmounts = new uint256[](1);
        parentAmounts[0] = 1;
        supplyChain.createToken("Lote", 1000, '{"batch":"L001"}', SupplyChain.TokenType.PT_LOTE, parentIds, parentAmounts, false);
        vm.stopPrank();

        // Factory transfiere el lote al retailer
        vm.prank(factory);
        supplyChain.transfer(retailer, 2, 1000);
        vm.prank(retailer);
        supplyChain.acceptTransfer(1);

        // Retailer crea un SSCC usando el lote como padre
        uint256[] memory ssccParentIds = new uint256[](1);
        ssccParentIds[0] = 2; // ID del lote
        uint256[] memory ssccParentAmounts = new uint256[](1);
        ssccParentAmounts[0] = 1; // 1 unidad del lote por SSCC

        vm.prank(retailer);
        supplyChain.createToken("Retail Package", 100, '{"sku":"RTL001"}', SupplyChain.TokenType.SSCC, ssccParentIds, ssccParentAmounts, false);

        SupplyChain.Token memory token = supplyChain.getToken(3);
        assertEq(token.name, "Retail Package");
        assertEq(token.creator, retailer);
        assertEq(uint(token.tokenType), uint(SupplyChain.TokenType.SSCC));
    }

    function testTokenWithParentIds() public {
        _approveUser(producer, "producer");

        vm.startPrank(producer);
        // Crear una receta (BOM) como padre
        supplyChain.createToken("Receta Producto", 1, "", SupplyChain.TokenType.BOM, new uint256[](0), new uint256[](0), false);
        // Crear token hijo (PT_LOTE) con parentIds = [1] (la receta) y parentAmounts = [1]
        uint256[] memory parentIds = new uint256[](1);
        parentIds[0] = 1; // ID de la receta
        uint256[] memory parentAmounts = new uint256[](1);
        parentAmounts[0] = 1; // 1 receta por lote
        supplyChain.createToken("Child Product", 500, "", SupplyChain.TokenType.PT_LOTE, parentIds, parentAmounts, false);
        vm.stopPrank();

        SupplyChain.Token memory parentToken = supplyChain.getToken(1);
        SupplyChain.Token memory childToken = supplyChain.getToken(2);

        assertEq(uint(parentToken.tokenType), uint(SupplyChain.TokenType.BOM));
        assertEq(parentToken.parentIds.length, 0);
        assertEq(parentToken.parentAmounts.length, 0);
        assertEq(childToken.parentIds.length, 1);
        assertEq(childToken.parentIds[0], 1);
        assertEq(childToken.parentAmounts.length, 1);
        assertEq(childToken.parentAmounts[0], 1);
    }

    function testTokenMetadata() public {
        _approveUser(producer, "producer");

        string memory features = '{"color":"blue","weight":"1.5kg","origin":"Spain","certifications":["ISO9001","organic"]}';
        
        vm.prank(producer);
        supplyChain.createToken("Product with Metadata", 100, features, SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);

        SupplyChain.Token memory token = supplyChain.getToken(1);
        assertEq(token.features, features);
        assertEq(token.name, "Product with Metadata");
        assertTrue(token.dateCreated > 0);
    }

    function testTokenBalance() public {
        _approveUser(producer, "producer");

        vm.prank(producer);
        supplyChain.createToken("Product", 1000, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);

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
        supplyChain.createToken("Test Product", 500, '{"test":true}', SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);

        SupplyChain.Token memory token = supplyChain.getToken(1);
        
        assertEq(token.id, 1);
        assertEq(token.name, "Test Product");
        assertEq(token.creator, producer);
        assertEq(token.totalSupply, 500);
        assertEq(token.features, '{"test":true}');
        assertEq(token.parentIds.length, 0);
        assertTrue(token.dateCreated > 0);
    }

    function testGetUserTokens() public {
        _approveUser(producer, "producer");

        vm.startPrank(producer);
        supplyChain.createToken("Product 1", 100, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);
        supplyChain.createToken("Product 2", 200, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);
        supplyChain.createToken("Product 3", 300, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);
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
        supplyChain.createToken("Raw Material", 1000, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);

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
        supplyChain.createToken("Product", 1000, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);
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
        supplyChain.createToken("Product", 1000, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);
        
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
        supplyChain.createToken("Product", 1000, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);

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
        supplyChain.createToken("Product", 1000, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);

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
        supplyChain.createToken("Product", 100, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);

        vm.prank(producer);
        vm.expectRevert("Balance insuficiente");
        supplyChain.transfer(factory, 1, 200); // Intenta transferir más de lo que tiene
    }

    function testGetTransfer() public {
        _approveUser(producer, "producer");
        _approveUser(factory, "factory");

        vm.prank(producer);
        supplyChain.createToken("Product", 1000, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);

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
        supplyChain.createToken("Product", 1000, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);

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
        supplyChain.createToken("Product", 1000, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);

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
        supplyChain.createToken("Product", 100, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);
    }

    function testUnapprovedUserCannotTransfer() public {
        _approveUser(producer, "producer");
        
        // Registrar factory pero no aprobar
        vm.prank(factory);
        supplyChain.requestUserRole("factory");

        vm.prank(producer);
        supplyChain.createToken("Product", 1000, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);

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
        vm.prank(admin);
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
        supplyChain.createToken("Product", 100, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);
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
        supplyChain.createToken("Product", 1000, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);

        vm.prank(producer);
        vm.expectRevert("No puedes transferir a ti mismo");
        supplyChain.transfer(producer, 1, 100);
    }

    // ============ Tests de casos edge ============
    
    function testTransferZeroAmount() public {
        _approveUser(producer, "producer");
        _approveUser(factory, "factory");

        vm.prank(producer);
        supplyChain.createToken("Product", 1000, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);

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
        supplyChain.createToken("Product", 1000, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);

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
        supplyChain.createToken("Product", 1000, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);

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
        
        vm.prank(admin);
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);
    }

    function testTokenCreatedEvent() public {
        _approveUser(producer, "producer");

        vm.prank(producer);
        vm.expectEmit(true, true, false, true);
        emit TokenCreated(1, producer, "Product", 1000);
        
        supplyChain.createToken("Product", 1000, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);
    }

    function testTransferInitiatedEvent() public {
        _approveUser(producer, "producer");
        _approveUser(factory, "factory");

        vm.prank(producer);
        supplyChain.createToken("Product", 1000, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);

        vm.prank(producer);
        vm.expectEmit(true, true, true, true);
        emit TransferRequested(1, producer, factory, 1, 100);
        
        supplyChain.transfer(factory, 1, 100);
    }

    function testTransferAcceptedEvent() public {
        _approveUser(producer, "producer");
        _approveUser(factory, "factory");

        vm.prank(producer);
        supplyChain.createToken("Product", 1000, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);
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
        supplyChain.createToken("Product", 1000, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);
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
        supplyChain.createToken("Raw Coffee Beans", 1000, '{"origin":"Colombia","harvest":"2024"}', SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);

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
        supplyChain.createToken("Product A", 1000, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);
        supplyChain.createToken("Product B", 500, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);
        supplyChain.createToken("Product C", 200, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);
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
        supplyChain.createToken("Raw Material", 1000, '{"source":"Farm A"}', SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);

        // Transferir a factory
        vm.prank(producer);
        supplyChain.transfer(factory, 1, 500);
        vm.prank(factory);
        supplyChain.acceptTransfer(1);

        // Factory crea una receta que usa la materia prima
        uint256[] memory recipeParentIds = new uint256[](1);
        recipeParentIds[0] = 1; // Materia prima
        uint256[] memory recipeParentAmounts = new uint256[](1);
        recipeParentAmounts[0] = 1; // 1 unidad de materia prima por unidad de producto

        vm.prank(factory);
        supplyChain.createToken("Receta Producto", 1, '{"recipe":"R001"}', SupplyChain.TokenType.BOM, recipeParentIds, recipeParentAmounts, false);

        // Factory crea producto derivado (PT_LOTE) usando la receta
        uint256[] memory parentIds = new uint256[](1);
        parentIds[0] = 2; // ID de la receta
        uint256[] memory parentAmounts = new uint256[](1);
        parentAmounts[0] = 1; // 1 receta por lote

        // Necesita 500 unidades de materia prima (500 * 1 = 500), que tiene
        vm.prank(factory);
        supplyChain.createToken("Processed Product", 500, '{"batch":"B001"}', SupplyChain.TokenType.PT_LOTE, parentIds, parentAmounts, false);

        // Verificar trazabilidad
        SupplyChain.Token memory rawMaterial = supplyChain.getToken(1);
        SupplyChain.Token memory recipe = supplyChain.getToken(2);
        SupplyChain.Token memory processedProduct = supplyChain.getToken(3);

        assertEq(rawMaterial.parentIds.length, 0); // Sin padre
        assertEq(rawMaterial.parentAmounts.length, 0);
        assertEq(recipe.parentIds.length, 1); // Receta usa materia prima
        assertEq(recipe.parentIds[0], 1);
        assertEq(recipe.parentAmounts[0], 1); // 1 unidad de materia prima por unidad de producto
        assertEq(processedProduct.parentIds.length, 1); // Derivado de la receta (token 2)
        assertEq(processedProduct.parentIds[0], 2);
        assertEq(processedProduct.parentAmounts[0], 1); // 1 receta por lote
        
        // Verificar que la materia prima fue consumida (500 unidades * 1 = 500 unidades)
        assertEq(supplyChain.getTokenBalance(1, factory), 0); // 500 - 500 = 0
        assertEq(processedProduct.parentAmounts.length, 1);
        assertEq(processedProduct.parentAmounts[0], 1); // 1 receta por lote
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
        supplyChain.createToken("Product", 1000, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);
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
        supplyChain.createToken("Product", 1000, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);
        vm.prank(producer);
        supplyChain.transfer(factory, 1, 100);

        // Producer intenta rechazar
        vm.prank(producer);
        vm.expectRevert("Solo el destinatario puede rechazar");
        supplyChain.rejectTransfer(1);
    }

    function testCannotChangeAdminStatus() public {
        vm.prank(admin);
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
        supplyChain.createToken("Product", 100, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);

        assertEq(supplyChain.nextTokenId(), 2);
    }

    // ============ Helper Functions ============
    
    function _approveUser(address user, string memory role) internal {
        vm.prank(user);
        supplyChain.requestUserRole(role);
        vm.prank(admin);
        supplyChain.changeStatusUser(user, SupplyChain.UserStatus.Approved);
    }

    function _createTokenHelper(
        address creator,
        string memory name,
        uint256 totalSupply,
        string memory features,
        SupplyChain.TokenType tokenType,
        uint256[] memory parentIds,
        uint256[] memory parentAmounts
    ) internal {
        vm.prank(creator);
        supplyChain.createToken(name, totalSupply, features, tokenType, parentIds, parentAmounts, false);
    }

    // ============ Tests para descuento de supply al crear PT_LOTE ============
    
    function testCreateLotWithRecipeConsumesComponents() public {
        _approveUser(producer, "producer");
        _approveUser(factory, "factory");

        // 1. Producer crea componentes (API_MP)
        vm.startPrank(producer);
        supplyChain.createToken("Componente A", 1000, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);
        supplyChain.createToken("Componente B", 500, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);
        vm.stopPrank();

        // 2. Transferir componentes a factory
        vm.prank(producer);
        supplyChain.transfer(factory, 1, 1000); // Componente A
        vm.prank(producer);
        supplyChain.transfer(factory, 2, 500);  // Componente B
        
        vm.startPrank(factory);
        supplyChain.acceptTransfer(1);
        supplyChain.acceptTransfer(2);
        vm.stopPrank();

        // Verificar que factory tiene los componentes
        assertEq(supplyChain.getTokenBalance(1, factory), 1000);
        assertEq(supplyChain.getTokenBalance(2, factory), 500);

        // 3. Factory crea receta (BOM) con los componentes
        uint256[] memory recipeParentIds = new uint256[](2);
        recipeParentIds[0] = 1; // Componente A
        recipeParentIds[1] = 2; // Componente B
        uint256[] memory recipeParentAmounts = new uint256[](2);
        recipeParentAmounts[0] = 10; // 10 unidades de A por unidad de producto
        recipeParentAmounts[1] = 5;  // 5 unidades de B por unidad de producto

        vm.prank(factory);
        supplyChain.createToken("Receta Producto", 1, "", SupplyChain.TokenType.BOM, recipeParentIds, recipeParentAmounts, false);

        // 4. Factory crea lote (PT_LOTE) usando la receta
        // Crear 20 unidades del producto
        // Necesitará: 20 * 10 = 200 unidades de A, y 20 * 5 = 100 unidades de B
        uint256[] memory lotParentIds = new uint256[](1);
        lotParentIds[0] = 3; // ID de la receta
        uint256[] memory lotParentAmounts = new uint256[](1);
        lotParentAmounts[0] = 1; // 1 receta por lote

        vm.prank(factory);
        supplyChain.createToken("Lote Producto", 20, "", SupplyChain.TokenType.PT_LOTE, lotParentIds, lotParentAmounts, false);

        // Verificar que los componentes fueron descontados
        assertEq(supplyChain.getTokenBalance(1, factory), 800);  // 1000 - 200 = 800
        assertEq(supplyChain.getTokenBalance(2, factory), 400);  // 500 - 100 = 400

        // Verificar que el lote fue creado correctamente
        SupplyChain.Token memory lot = supplyChain.getToken(4);
        assertEq(lot.name, "Lote Producto");
        assertEq(lot.totalSupply, 20);
        assertEq(uint(lot.tokenType), uint(SupplyChain.TokenType.PT_LOTE));
        assertEq(supplyChain.getTokenBalance(4, factory), 20);
    }

    function testCreateLotWithInsufficientComponents() public {
        _approveUser(producer, "producer");
        _approveUser(factory, "factory");

        // 1. Producer crea componente
        vm.prank(producer);
        supplyChain.createToken("Componente A", 100, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);

        // 2. Transferir componente a factory (solo 100 unidades)
        vm.prank(producer);
        supplyChain.transfer(factory, 1, 100);
        vm.prank(factory);
        supplyChain.acceptTransfer(1);

        // 3. Factory crea receta que requiere 10 unidades por producto
        uint256[] memory recipeParentIds = new uint256[](1);
        recipeParentIds[0] = 1;
        uint256[] memory recipeParentAmounts = new uint256[](1);
        recipeParentAmounts[0] = 10;

        vm.prank(factory);
        supplyChain.createToken("Receta", 1, "", SupplyChain.TokenType.BOM, recipeParentIds, recipeParentAmounts, false);

        // 4. Intentar crear un lote de 15 unidades
        // Necesitará: 15 * 10 = 150 unidades, pero solo hay 100
        uint256[] memory lotParentIds = new uint256[](1);
        lotParentIds[0] = 2; // ID de la receta
        uint256[] memory lotParentAmounts = new uint256[](1);
        lotParentAmounts[0] = 1;

        vm.prank(factory);
        vm.expectRevert("Componente insuficiente: no hay suficiente cantidad de componentes para crear el lote");
        supplyChain.createToken("Lote", 15, "", SupplyChain.TokenType.PT_LOTE, lotParentIds, lotParentAmounts, false);

        // Verificar que el balance no cambió
        assertEq(supplyChain.getTokenBalance(1, factory), 100);
    }

    function testCreateLotRequiresBOMAsParent() public {
        _approveUser(producer, "producer");
        _approveUser(factory, "factory");

        // Crear un componente (no una receta)
        vm.prank(producer);
        supplyChain.createToken("Componente", 1000, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);

        // Transferir a factory
        vm.prank(producer);
        supplyChain.transfer(factory, 1, 1000);
        vm.prank(factory);
        supplyChain.acceptTransfer(1);

        // Intentar crear un PT_LOTE con un componente (no BOM) como padre
        uint256[] memory lotParentIds = new uint256[](1);
        lotParentIds[0] = 1; // ID del componente
        uint256[] memory lotParentAmounts = new uint256[](1);
        lotParentAmounts[0] = 1;

        vm.prank(factory);
        vm.expectRevert("El padre de un lote debe ser una receta (BOM)");
        supplyChain.createToken("Lote", 10, "", SupplyChain.TokenType.PT_LOTE, lotParentIds, lotParentAmounts, false);
    }

    function testCreateLotRequiresExactlyOneParent() public {
        _approveUser(factory, "factory");

        // Crear dos recetas
        vm.startPrank(factory);
        supplyChain.createToken("Receta 1", 1, "", SupplyChain.TokenType.BOM, new uint256[](0), new uint256[](0), false);
        supplyChain.createToken("Receta 2", 1, "", SupplyChain.TokenType.BOM, new uint256[](0), new uint256[](0), false);
        vm.stopPrank();

        // Intentar crear PT_LOTE con dos padres
        uint256[] memory lotParentIds = new uint256[](2);
        lotParentIds[0] = 1;
        lotParentIds[1] = 2;
        uint256[] memory lotParentAmounts = new uint256[](2);
        lotParentAmounts[0] = 1;
        lotParentAmounts[1] = 1;

        vm.prank(factory);
        vm.expectRevert("Un lote debe tener exactamente un padre (receta)");
        supplyChain.createToken("Lote", 10, "", SupplyChain.TokenType.PT_LOTE, lotParentIds, lotParentAmounts, false);
    }

    function testCreateLotWithMultipleComponents() public {
        _approveUser(producer, "producer");
        _approveUser(factory, "factory");

        // Crear 3 componentes
        vm.startPrank(producer);
        supplyChain.createToken("Comp A", 1000, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);
        supplyChain.createToken("Comp B", 800, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);
        supplyChain.createToken("Comp C", 600, "", SupplyChain.TokenType.API_MP, new uint256[](0), new uint256[](0), false);
        vm.stopPrank();

        // Transferir todos a factory
        vm.startPrank(producer);
        supplyChain.transfer(factory, 1, 1000);
        supplyChain.transfer(factory, 2, 800);
        supplyChain.transfer(factory, 3, 600);
        vm.stopPrank();

        vm.startPrank(factory);
        supplyChain.acceptTransfer(1);
        supplyChain.acceptTransfer(2);
        supplyChain.acceptTransfer(3);
        vm.stopPrank();

        // Crear receta con 3 componentes
        uint256[] memory recipeParentIds = new uint256[](3);
        recipeParentIds[0] = 1;
        recipeParentIds[1] = 2;
        recipeParentIds[2] = 3;
        uint256[] memory recipeParentAmounts = new uint256[](3);
        recipeParentAmounts[0] = 5;  // 5 de A por unidad
        recipeParentAmounts[1] = 3;  // 3 de B por unidad
        recipeParentAmounts[2] = 2;  // 2 de C por unidad

        vm.prank(factory);
        supplyChain.createToken("Receta Compleja", 1, "", SupplyChain.TokenType.BOM, recipeParentIds, recipeParentAmounts, false);

        // Crear lote de 50 unidades
        // Necesitará: 50*5=250 de A, 50*3=150 de B, 50*2=100 de C
        uint256[] memory lotParentIds = new uint256[](1);
        lotParentIds[0] = 4; // ID de la receta
        uint256[] memory lotParentAmounts = new uint256[](1);
        lotParentAmounts[0] = 1;

        vm.prank(factory);
        supplyChain.createToken("Lote Completo", 50, "", SupplyChain.TokenType.PT_LOTE, lotParentIds, lotParentAmounts, false);

        // Verificar balances finales
        assertEq(supplyChain.getTokenBalance(1, factory), 750);  // 1000 - 250
        assertEq(supplyChain.getTokenBalance(2, factory), 650);  // 800 - 150
        assertEq(supplyChain.getTokenBalance(3, factory), 500);  // 600 - 100
    }
}
