# Blockus721Simple NFT Contract

A simplified ERC721 NFT contract with soulbound capability and meta transactions support.

## Features

- **Soulbound tokens**: Tokens can be configured to be non-transferable
- **Meta transactions**: Support for gasless transactions via ERC2771Context
- **Owner-based minting**: Only the contract owner can mint tokens
- **Batch minting**: Mint multiple tokens in a single transaction
- **Pausable**: Contract can be paused in case of emergency

## Contract Overview

The `Blockus721Simple` contract is a streamlined implementation designed for backend-controlled minting. It uses:

- OpenZeppelin's ERC721 and ERC721Enumerable for the NFT functionality
- Ownable for simple access control
- Pausable for emergency stops
- ERC2771Context for meta transactions

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

2. Compile the contract:
```bash
npx hardhat compile
```

3. Run tests:
```bash
npx hardhat test test/Blockus721Simple.ts
```

## Deployment

To deploy the contract:

```bash
npx hardhat run scripts/deploy-blockus721-simple.ts --network <network-name>
```

## Usage

### Deployment Parameters

When deploying the contract, you need to provide:

- `name`: The name of the NFT collection
- `symbol`: The symbol of the NFT collection
- `baseURI`: The base URI for token metadata
- `initialOwner`: The address that will be the owner of the contract
- `trustedForwarder`: The address of the trusted forwarder for meta transactions
- `isSoulbound`: Whether tokens are soulbound (non-transferable) by default

### Minting Tokens

Only the contract owner can mint tokens:

```javascript
// Mint a single token
await nft.mint(recipientAddress);

// Batch mint multiple tokens (up to 100 at once)
await nft.batchMint(recipientAddress, 10);
```

### Meta Transactions

The contract supports meta transactions through ERC2771Context, allowing your backend to pay for gas fees while users sign messages.

To use meta transactions:

1. Set up a trusted forwarder contract (like OpenGSN's Forwarder)
2. Pass the forwarder address during contract deployment
3. Use the forwarder to relay transactions

### Soulbound Tokens

When tokens are soulbound, they cannot be transferred after minting. This is useful for credentials, achievements, or identity tokens.

You can change the soulbound status:

```javascript
// Make all tokens transferable
await nft.setSoulbound(false);

// Make all tokens non-transferable
await nft.setSoulbound(true);
```

### Pausing the Contract

In case of emergency, you can pause all transfers and minting:

```javascript
// Pause the contract
await nft.pause();

// Unpause the contract
await nft.unpause();
```

### Updating Metadata

You can update the base URI for token metadata:

```javascript
await nft.setBaseURI("https://new-api.example.com/metadata/");
```

## Contract Size Optimization

This contract has been optimized for size to ensure it can be deployed on all EVM networks, including those with strict contract size limits.

## License

This project is licensed under the MIT License.