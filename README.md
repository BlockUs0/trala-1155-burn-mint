# Custom Meta-Transaction Relayer

This project implements a custom meta-transaction relayer system with an example NFT contract to demonstrate gasless transactions. The system consists of a relayer contract that forwards transactions and a mock NFT contract that supports meta-transactions.

## Components

### BlockusRelayer (Relayer.sol)
- Custom relayer contract that forwards meta-transactions
- Supports single and batch transaction execution
- Maintains an allowlist of contracts that can use the relayer
- Includes fund management and pause functionality
- Owner can add/remove allowed contracts and manage funds

### MockNFT (MockNFT.sol) 
- Example ERC721 contract that supports meta-transactions
- Uses ERC2771Context for trusted forwarder integration
- Simple minting functionality for testing

## Development Setup

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