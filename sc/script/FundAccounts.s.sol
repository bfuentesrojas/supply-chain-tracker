// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";

/**
 * @title FundAccounts
 * @dev Script para enviar ETH a cuentas externas en Anvil local
 */
contract FundAccountsScript is Script {
    // Primera cuenta de Anvil (tiene 10000 ETH)
    uint256 constant ANVIL_PRIVATE_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    
    // Cuentas a financiar
    address constant ADMIN_ADDRESS = 0xeD252BAc2D88971cb5B393B0760f05AF27413b91;
    
    // Cantidad a enviar (10 ETH)
    uint256 constant AMOUNT = 10 ether;

    function run() public {
        // Usar la primera cuenta de Anvil como financiador
        vm.startBroadcast(ANVIL_PRIVATE_KEY);

        // Enviar ETH al admin
        (bool success1, ) = ADMIN_ADDRESS.call{value: AMOUNT}("");
        require(success1, "Failed to fund admin");
        console.log("Funded admin:", ADMIN_ADDRESS);
        console.log("Amount:", AMOUNT / 1 ether, "ETH");

        vm.stopBroadcast();
    }
    
    // Función para financiar cualquier dirección
    function fundAddress(address target) public {
        vm.startBroadcast(ANVIL_PRIVATE_KEY);
        
        (bool success, ) = target.call{value: AMOUNT}("");
        require(success, "Failed to fund address");
        console.log("Funded address:", target);
        console.log("Amount:", AMOUNT / 1 ether, "ETH");
        
        vm.stopBroadcast();
    }
}

