# Custom Meta-Transaction Relayer

Burn-to-Mint System Overview
Core Objective
The project implements a cross-chain "burn-to-mint" mechanism where users can burn NFTs on one blockchain and mint new tokens on Ethereum L1, using cryptographic proof of the burn.
Technical Requirements
Backend System

Burn Verification System:

Already implemented system that tracks and verifies when users burn NFTs on other chains
Validates burns and stores them in a database with a verification status


EIP-712 Signature Generation:

Need to add functionality that generates EIP-712 typed data signatures
These signatures serve as cryptographic proof that specific burns occurred
Signatures will enable users to mint new tokens on Ethereum


Asynchronous Processing:

System needs to handle multiple simultaneous signature requests
Using burn proof IDs instead of sequential nonces for better asynchronous support

1. Install dependencies:
```bash
pnpm install
```

2. Create .env file with required variables:
SEPOLIA_RPC_URL=your_sepolia_rpc_url
DEPLOYER_PRIVATE_KEY=your_deployer_private_key
TEST_PRIVATE_KEY=your_test_private_key

## Deployment
The project uses Hardhat Ignition for deployments. The deployment modules are located in ignition/modules/.

```bash
Deploy all contracts to Sepolia:
npx hardhat ignition deploy ignition/modules/DeployAll.ts --network sepolia
Verify contracts on Etherscan:
npx hardhat run scripts/verify-contracts.ts --network sepolia
```
