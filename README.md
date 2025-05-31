# Trala NFT and Staking Contracts

This repository contains the smart contracts for the Trala platform's NFT and staking system.

## Contracts

### TralaNFT (ERC1155)

The `TralaNFT.sol` contract implements an ERC1155 token with the following features:

*   **Configurable Token Grades:** Supports multiple token types (grades) with customizable parameters such as name, maximum supply, price, allowlist requirement, active status, and soulbound property.
*   **EIP-712 Allowlist Minting:** Allows minting of tokens, with an option to require an EIP-712 signature for allowlist authorization.
*   **Burning:** Tokens can be burned.
*   **Access Control:** Uses OpenZeppelin's AccessControl for managing roles (ADMIN, SIGNER, TREASURY).
*   **Pausable:** Minting can be paused and unpaused by the ADMIN.
*   **Fund Withdrawal:** The TREASURY role can withdraw collected funds.
*   **Soulbound Tokens:** Supports creating soulbound tokens that are non-transferable.

### TralaNFTStaking (ERC1155Holder)

The `TralaNFTStaking.sol` contract allows users to stake and unstake ERC1155 tokens from the `TralaNFT` contract.

*   **Staking:** Users can stake specified amounts of their ERC1155 tokens.
*   **Unstaking:** Users can unstake their previously staked tokens.
*   **Pausable:** Staking and unstaking can be paused and unpaused by the owner.
*   **Emergency Unstake:** The owner can perform an emergency unstake for a specific user and token.
*   **NFT Contract Address Update:** The owner can update the address of the `TralaNFT` contract.

## Deployment

The project uses Hardhat Ignition for deployments. The deployment modules are located in `ignition/modules/`.

*   `DeployTrala.ts`: Deploys the `TralaNFT` contract.
*   `DeployTralaStaking.ts`: Deploys the `TralaNFTStaking` contract, depending on the `TralaNFT` deployment.

To deploy the contracts using Hardhat Ignition, you typically run commands like:

```bash
npx hardhat ignition deploy ignition/modules/DeployTrala.ts --network <your-network>
npx hardhat ignition deploy ignition/modules/DeployTralaStaking.ts --network <your-network>
```

Replace `<your-network>` with the desired network (e.g., `sepolia`, `polygon`).

## Setup

1.  **Install dependencies:**
    ```bash
    pnpm install
    ```

2.  **Create `.env` file:** Create a `.env` file in the root directory based on `.env.example` and fill in the required variables (e.g., RPC URLs, private keys).

```dotenv
SEPOLIA_RPC_URL=your_sepolia_rpc_url
POLYGON_RPC_URL=your_polygon_rpc_url
DEPLOYER_PRIVATE_KEY=your_deployer_private_key
TEST_PRIVATE_KEY=your_test_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key # For contract verification
POLYGONSCAN_API_KEY=your_polygonscan_api_key # For contract verification
```

## Testing

Tests for the contracts are located in the `test/` directory.

*   `Trala.ts`: Tests for the `TralaNFT` contract.
*   `TralaStaking.ts`: Tests for the `TralaNFTStaking` contract.
*   `TralaMintSignature.ts`: Tests specifically for the EIP-712 minting signature verification.

To run tests:

```bash
npx hardhat test
