// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {SupplyChain} from "../src/SupplyChain.sol";

/**
 * @title Deploy
 * @dev Script de despliegue para el contrato SupplyChain
 * @notice El admin está configurado en el contrato: 0xeD252BAc2D88971cb5B393B0760f05AF27413b91
 */
contract DeployScript is Script {
    // Primera cuenta de Anvil para desplegar
    uint256 constant ANVIL_PRIVATE_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    
    // Admin configurado en el contrato
    address constant CONFIGURED_ADMIN = 0xeD252BAc2D88971cb5B393B0760f05AF27413b91;

    function setUp() public {}

    function run() public returns (SupplyChain) {
        // Usar la primera cuenta de Anvil como deployer
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", ANVIL_PRIVATE_KEY);

        vm.startBroadcast(deployerPrivateKey);

        SupplyChain supplyChain = new SupplyChain();
        
        console.log("========================================");
        console.log("SupplyChain deployed at:", address(supplyChain));
        console.log("Admin address:", CONFIGURED_ADMIN);
        console.log("========================================");

        vm.stopBroadcast();

        return supplyChain;
    }
}
