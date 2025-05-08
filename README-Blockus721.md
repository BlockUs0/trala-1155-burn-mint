# Blockus721 NFT Contracts

This project implements an ERC721 NFT contract with a factory for easy deployment. The implementation includes features like soulbound tokens, meta transactions, and signature-based minting.

## Contracts

### Blockus721

`Blockus721.sol` is an ERC721 implementation with the following features:

- **Soulbound tokens**: Tokens can be configured to be non-transferable
- **Configurable metadata URL**: The base URI for token metadata can be set by admins
- **Meta transactions**: Support for gasless transactions via ERC2771Context
- **Signature-based minting**: Support for allowlist minting with EIP-712 signatures
- **Role-based access control**: Admin, Signer, and Treasury roles
- **Pausable**: Contract can be paused in case of emergency

### Blockus721Factory

`Blockus721Factory.sol` is a factory contract for deploying Blockus721 contracts with configurable parameters:

- **Easy deployment**: Deploy new NFT contracts with a single transaction
- **Configurable parameters**: Set name, symbol, base URI, roles, and token configuration
- **Tracking**: Keep track of all deployed contracts
- **Meta transactions**: Support for gasless transactions via ERC2771Context

## Getting Started

### Prerequisites

- Node.js and npm/yarn/pnpm
- Hardhat

### Installation

1. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

2. Compile the contracts:
```bash
npx hardhat compile
```

3. Run tests:
```bash
npx hardhat test
```

## Usage

### Deploying the Factory

```javascript
// Deploy the trusted forwarder (or use an existing one)
const trustedForwarder = "0x..."; // Address of the trusted forwarder

// Deploy the factory
const Blockus721Factory = await ethers.getContractFactory("Blockus721Factory");
const factory = await Blockus721Factory.deploy(trustedForwarder);
await factory.deployed();
```

### Deploying an NFT Contract

```javascript
// NFT configuration
const name = "My NFT";
const symbol = "MNFT";
const baseURI = "https://api.example.com/metadata/";
const treasury = "0x..."; // Address to receive funds
const signer = "0x..."; // Address authorized to sign minting requests

// Token configuration
const tokenConfig = {
  maxSupply: 1000,
  price: ethers.utils.parseEther("0.1"),
  allowlistRequired: false,
  active: true,
  soulbound: false
};

// Deployment configuration
const deploymentConfig = {
  name,
  symbol,
  baseURI,
  treasury,
  signer,
  tokenConfig
};

// Deploy the NFT contract
const tx = await factory.deployNFT(deploymentConfig);
const receipt = await tx.wait();

// Get the deployed contract address from the event
const deployedAddress = receipt.events[0].args.contractAddress;

// Get the contract instance
const nft = await ethers.getContractAt("Blockus721", deployedAddress);
```

### Minting Tokens

```javascript
// Public minting (when allowlistRequired is false)
await nft.mint(
  recipient, // Address to receive the token
  "0x", // Empty signature for public minting
  { value: ethers.utils.parseEther("0.1") } // Price
);

// Signature-based minting (when allowlistRequired is true)
// 1. Generate signature on the backend
const domain = {
  name: await nft.name(),
  version: "1",
  chainId: network.config.chainId,
  verifyingContract: nft.address
};

const types = {
  MintAuthorization: [
    { name: "minter", type: "address" },
    { name: "to", type: "address" },
    { name: "salt", type: "bytes32" },
    { name: "nonce", type: "uint256" },
    { name: "chainId", type: "uint256" },
    { name: "contractAddress", type: "address" }
  ]
};

const value = {
  minter: userAddress,
  to: recipientAddress,
  salt: ethers.utils.id("Blockus721MintAuthorizationSignature"),
  nonce: await nft.nonces(userAddress),
  chainId: network.config.chainId,
  contractAddress: nft.address
};

// Sign with the authorized signer
const signature = await signer.signTypedData(domain, types, value);

// 2. Use the signature to mint
await nft.mint(
  recipientAddress,
  signature,
  { value: ethers.utils.parseEther("0.1") }
);
```

### Configuring Tokens

```javascript
// Configure token parameters
await nft.configureToken(
  1000, // maxSupply (0 for unlimited)
  ethers.utils.parseEther("0.1"), // price
  false, // allowlistRequired
  true, // active
  false // soulbound
);
```

### Setting Soulbound Status

```javascript
// Set a specific token as soulbound
await nft.setTokenSoulbound(tokenId, true);

// Set all new tokens as soulbound by default
await nft.setDefaultSoulbound(true);
```

## License

This project is licensed under the MIT License.