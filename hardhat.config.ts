import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
dotenv.config();


const config: HardhatUserConfig = {
  solidity: "0.8.27",
  defaultNetwork: "sepolia",
  networks: {
    hardhat: {
    },
    mainnet: {
      url: 'https://mainnet.infura.io/v3/8ef07dfe7367497f9b7d4a7ad2437ec8',
      accounts: [ process.env.DEPLOYER_PRIVATE_KEY!, process.env.TEST_PRIVATE_KEY! ],
      chainId: 1,
    },
    polygon: {
      url: process.env.RELAYER_PRIVATE_KEY,
      accounts: [ process.env.DEPLOYER_PRIVATE_KEY!, process.env.TEST_PRIVATE_KEY! ],
      chainId: 137,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL!,
      accounts: [ process.env.DEPLOYER_PRIVATE_KEY!, process.env.TEST_PRIVATE_KEY! ],
      chainId: 11155111,
    },
    b3: {
      url: 'https://mainnet-rpc.b3.fun',
      accounts: [ process.env.DEPLOYER_PRIVATE_KEY!, process.env.TEST_PRIVATE_KEY! ],
      chainId: 8333,

    }
  },
  etherscan: {
    apiKey: {
      mainnet: '611UYVYDNHVR482E3987FPQ5P3G1XEMHA8',
      sepolia: '611UYVYDNHVR482E3987FPQ5P3G1XEMHA8',
      polygon: process.env.POLYGON_ETHERSCAN,
      b3:'as'
    },
    customChains: [
      {
        network: "b3",
        chainId: 8333,
        urls: {
          apiURL: "https://explorer.b3.fun/api",
          browserURL: "https://explorer.b3.fun",
        },
      },
    ]

  }
};

export default config;
