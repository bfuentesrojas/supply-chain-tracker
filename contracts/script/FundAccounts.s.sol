// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";

/**
 * @title FundAccounts
 * @dev Script para enviar ETH a cuentas externas en Anvil local
 */
contract FundAccountsScript is Script {
    /// @dev ⚠️ ADVERTENCIA: Esta es la clave privada POR DEFECTO de Anvil (red local de desarrollo)
    /// @dev Esta clave es CONOCIDA PÚBLICAMENTE y solo funciona en redes locales (Anvil)
    /// @dev NUNCA uses esta clave o cualquier clave privada real en redes de producción (mainnet/testnet)
    /// @dev Para producción, usa variables de entorno o keystores seguros
    // Primera cuenta de Anvil (tiene 10000 ETH)
    uint256 constant ANVIL_PRIVATE_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    
    // Cuentas a financiar
    address constant ADMIN_ADDRESS = 0xeD252BAc2D88971cb5B393B0760f05AF27413b91;
    address constant ACCOUNT_1 = 0xBc52603F93d9df628b2dAd74e588fE74FF2f6056;
    address constant ACCOUNT_2 = 0x871fD3E66cCC4c21E3AC437D39266e72e6fD32A0;
    address constant ACCOUNT_3 = 0x8816F96a8759Ff0410F5A67457DDe003950360a6;
    address constant ACCOUNT_4 = 0x44ECBB8c87991Bbee768ef0C9e2731753a4B714b;
    
    // Cantidad a enviar (10 ETH)
    uint256 constant AMOUNT = 10 ether;

    function run() public {
        // Usar la primera cuenta de Anvil como financiador
        vm.startBroadcast(ANVIL_PRIVATE_KEY);

        // Enviar ETH al admin
        _fundAccount(ADMIN_ADDRESS, "admin");
        
        // Enviar ETH a las cuentas de prueba
        _fundAccount(ACCOUNT_1, "account_1");
        _fundAccount(ACCOUNT_2, "account_2");
        _fundAccount(ACCOUNT_3, "account_3");
        _fundAccount(ACCOUNT_4, "account_4");

        console.log("========================================");
        console.log("Todas las cuentas han sido financiadas con", AMOUNT / 1 ether, "ETH");
        console.log("========================================");

        vm.stopBroadcast();
    }

    function _fundAccount(address account, string memory name) internal {
        (bool success, ) = account.call{value: AMOUNT}("");
        require(success, string.concat("Failed to fund ", name));
        console.log("Funded", name, ":", account);
    }
    
    // Función para financiar cualquier dirección adicional
    function fundAddress(address target) public {
        vm.startBroadcast(ANVIL_PRIVATE_KEY);
        
        (bool success, ) = target.call{value: AMOUNT}("");
        require(success, "Failed to fund address");
        console.log("Funded address:", target);
        console.log("Amount:", AMOUNT / 1 ether, "ETH");
        
        vm.stopBroadcast();
    }
}


