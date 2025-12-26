// Dirección del contrato desplegado (actualizar después del deploy)
export const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3'

// ChainId esperado (31337 = Anvil/Hardhat local)
export const EXPECTED_CHAIN_ID = 31337

// Configuración de la red local de Anvil
export const ANVIL_NETWORK_CONFIG = {
  chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}`, // 0x7a69 = 31337
  chainName: 'Anvil Local',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['http://127.0.0.1:8545'],
  blockExplorerUrls: [], // Red local no tiene explorador
}

// ABI del contrato SupplyChain
export const SUPPLY_CHAIN_ABI = [
  // Constructor
  {
    "type": "constructor",
    "inputs": [],
    "stateMutability": "nonpayable"
  },
  
  // Events
  {
    "type": "event",
    "name": "TokenCreated",
    "inputs": [
      { "name": "tokenId", "type": "uint256", "indexed": true },
      { "name": "creator", "type": "address", "indexed": true },
      { "name": "name", "type": "string", "indexed": false },
      { "name": "totalSupply", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "TransferRequested",
    "inputs": [
      { "name": "transferId", "type": "uint256", "indexed": true },
      { "name": "from", "type": "address", "indexed": true },
      { "name": "to", "type": "address", "indexed": true },
      { "name": "tokenId", "type": "uint256", "indexed": false },
      { "name": "amount", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "TransferAccepted",
    "inputs": [
      { "name": "transferId", "type": "uint256", "indexed": true }
    ]
  },
  {
    "type": "event",
    "name": "TransferRejected",
    "inputs": [
      { "name": "transferId", "type": "uint256", "indexed": true }
    ]
  },
  {
    "type": "event",
    "name": "UserRoleRequested",
    "inputs": [
      { "name": "user", "type": "address", "indexed": true },
      { "name": "role", "type": "string", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "UserStatusChanged",
    "inputs": [
      { "name": "user", "type": "address", "indexed": true },
      { "name": "status", "type": "uint8", "indexed": false }
    ]
  },
  
  // State Variables (read)
  {
    "type": "function",
    "name": "admin",
    "inputs": [],
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "nextTokenId",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "nextTransferId",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "nextUserId",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "addressToUserId",
    "inputs": [{ "name": "", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "users",
    "inputs": [{ "name": "userId", "type": "uint256" }],
    "outputs": [
      { "name": "id", "type": "uint256" },
      { "name": "userAddress", "type": "address" },
      { "name": "role", "type": "string" },
      { "name": "status", "type": "uint8" }
    ],
    "stateMutability": "view"
  },
  
  // User Management
  {
    "type": "function",
    "name": "requestUserRole",
    "inputs": [{ "name": "role", "type": "string" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "changeStatusUser",
    "inputs": [
      { "name": "userAddress", "type": "address" },
      { "name": "newStatus", "type": "uint8" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getUserInfo",
    "inputs": [{ "name": "userAddress", "type": "address" }],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "components": [
          { "name": "id", "type": "uint256" },
          { "name": "userAddress", "type": "address" },
          { "name": "role", "type": "string" },
          { "name": "status", "type": "uint8" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isAdmin",
    "inputs": [{ "name": "userAddress", "type": "address" }],
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "view"
  },
  
  // Token Management
  {
    "type": "function",
    "name": "createToken",
    "inputs": [
      { "name": "name", "type": "string" },
      { "name": "totalSupply", "type": "uint256" },
      { "name": "features", "type": "string" },
      { "name": "tokenType", "type": "uint8" },
      { "name": "parentIds", "type": "uint256[]" },
      { "name": "parentAmounts", "type": "uint256[]" },
      { "name": "isRecall", "type": "bool" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getToken",
    "inputs": [{ "name": "tokenId", "type": "uint256" }],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "components": [
          { "name": "id", "type": "uint256" },
          { "name": "creator", "type": "address" },
          { "name": "name", "type": "string" },
          { "name": "totalSupply", "type": "uint256" },
          { "name": "features", "type": "string" },
          { "name": "tokenType", "type": "uint8" },
          { "name": "parentIds", "type": "uint256[]" },
          { "name": "parentAmounts", "type": "uint256[]" },
          { "name": "dateCreated", "type": "uint256" },
          { "name": "recall", "type": "bool" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getTokenBalance",
    "inputs": [
      { "name": "tokenId", "type": "uint256" },
      { "name": "userAddress", "type": "address" }
    ],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  
  // Transfer Management
  {
    "type": "function",
    "name": "transfer",
    "inputs": [
      { "name": "to", "type": "address" },
      { "name": "tokenId", "type": "uint256" },
      { "name": "amount", "type": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "acceptTransfer",
    "inputs": [{ "name": "transferId", "type": "uint256" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "rejectTransfer",
    "inputs": [{ "name": "transferId", "type": "uint256" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getTransfer",
    "inputs": [{ "name": "transferId", "type": "uint256" }],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "components": [
          { "name": "id", "type": "uint256" },
          { "name": "from", "type": "address" },
          { "name": "to", "type": "address" },
          { "name": "tokenId", "type": "uint256" },
          { "name": "dateCreated", "type": "uint256" },
          { "name": "amount", "type": "uint256" },
          { "name": "status", "type": "uint8" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  
  // Auxiliary Functions
  {
    "type": "function",
    "name": "getUserTokens",
    "inputs": [{ "name": "userAddress", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256[]" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getUserTransfers",
    "inputs": [{ "name": "userAddress", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256[]" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getTotalTokens",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getTotalTransfers",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getTotalUsers",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  }
] as const

// ============ Tipos TypeScript ============

// Enums
export enum UserStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
  Canceled = 3
}

export enum TransferStatus {
  Pending = 0,
  Accepted = 1,
  Rejected = 2
}

// Enums (debe coincidir con el contrato Solidity)
export enum TokenType {
  API_MP = 0,
  BOM = 1,
  PT_LOTE = 2,
  SSCC = 3,
  COMPLIANCE_LOG = 4
}

// Helper para convertir TokenType de pharma.ts (string) a TokenType del contrato (número)
export function tokenTypeStringToNumber(type: string): TokenType {
  const mapping: Record<string, TokenType> = {
    'API_MP': TokenType.API_MP,
    'BOM': TokenType.BOM,
    'PT_LOTE': TokenType.PT_LOTE,
    'SSCC': TokenType.SSCC,
    'COMPLIANCE_LOG': TokenType.COMPLIANCE_LOG
  }
  return mapping[type] ?? TokenType.API_MP
}

// Helper para convertir TokenType del contrato (número) a string
export function tokenTypeNumberToString(type: TokenType): string {
  const mapping: Record<TokenType, string> = {
    [TokenType.API_MP]: 'API_MP',
    [TokenType.BOM]: 'BOM',
    [TokenType.PT_LOTE]: 'PT_LOTE',
    [TokenType.SSCC]: 'SSCC',
    [TokenType.COMPLIANCE_LOG]: 'COMPLIANCE_LOG'
  }
  return mapping[type] ?? 'API_MP'
}

// Interfaces
export interface Token {
  id: bigint
  creator: string
  name: string
  totalSupply: bigint
  features: string
  tokenType: TokenType
  parentIds: bigint[]
  parentAmounts: bigint[]
  dateCreated: bigint
  recall: boolean
}

export interface Transfer {
  id: bigint
  from: string
  to: string
  tokenId: bigint
  dateCreated: bigint
  amount: bigint
  status: TransferStatus
}

export interface User {
  id: bigint
  userAddress: string
  role: string
  status: UserStatus
}

// ============ Utilidades de Formateo ============

export const formatUserStatus = (status: UserStatus): string => {
  const statusMap: Record<UserStatus, string> = {
    [UserStatus.Pending]: 'Pendiente',
    [UserStatus.Approved]: 'Aprobado',
    [UserStatus.Rejected]: 'Rechazado',
    [UserStatus.Canceled]: 'Cancelado'
  }
  return statusMap[status] || 'Desconocido'
}

export const formatTransferStatus = (status: TransferStatus): string => {
  const statusMap: Record<TransferStatus, string> = {
    [TransferStatus.Pending]: 'Pendiente',
    [TransferStatus.Accepted]: 'Aceptada',
    [TransferStatus.Rejected]: 'Rechazada'
  }
  return statusMap[status] || 'Desconocido'
}

export const getUserStatusColor = (status: UserStatus): string => {
  const colorMap: Record<UserStatus, string> = {
    [UserStatus.Pending]: 'bg-yellow-100 text-yellow-800',
    [UserStatus.Approved]: 'bg-green-100 text-green-800',
    [UserStatus.Rejected]: 'bg-red-100 text-red-800',
    [UserStatus.Canceled]: 'bg-gray-100 text-gray-800'
  }
  return colorMap[status] || 'bg-gray-100 text-gray-800'
}

export const getTransferStatusColor = (status: TransferStatus): string => {
  const colorMap: Record<TransferStatus, string> = {
    [TransferStatus.Pending]: 'bg-yellow-100 text-yellow-800',
    [TransferStatus.Accepted]: 'bg-green-100 text-green-800',
    [TransferStatus.Rejected]: 'bg-red-100 text-red-800'
  }
  return colorMap[status] || 'bg-gray-100 text-gray-800'
}

// Roles predefinidos
export const ROLES = {
  ADMIN: 'admin',
  MANUFACTURER: 'manufacturer',
  DISTRIBUTOR: 'distributor',
  RETAILER: 'retailer',
  CONSUMER: 'consumer'
} as const

export const formatRole = (role: string): string => {
  const roleMap: Record<string, string> = {
    'admin': 'Administrador',
    'manufacturer': 'Fabricante',
    'distributor': 'Distribuidor',
    'retailer': 'Minorista',
    'consumer': 'Consumidor'
  }
  return roleMap[role.toLowerCase()] || role
}
