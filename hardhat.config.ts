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
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL!,
      accounts: [ process.env.DEPLOYER_PRIVATE_KEY!, process.env.TEST_PRIVATE_KEY! ],
      chainId: 11155111,
    }
  },
  etherscan: {
    apiKey: {
      sepolia: '611UYVYDNHVR482E3987FPQ5P3G1XEMHA8'
    }
  }
};

export default config;
