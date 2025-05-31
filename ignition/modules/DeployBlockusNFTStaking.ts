import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import DeployBlockusNFTModule from "./DeployBlockusNFT";

export default buildModule("DeployBlockusNFTStakingModule", (m) => {
  const { blockusNFT } = m.useModule(DeployBlockusNFTModule);
  
  // Get admin parameter - can be overridden during deployment
  // npx hardhat ignition deploy ignition/modules/DeployTralaStaking.ts --parameters admin=YOUR_ADDRESS
  const owner = m.getParameter("admin", "0xFB712f6712E701dc09F50E6373F230780a84eD7b");

  // Deploy the BlockusNFTStaking contract
  const staking = m.contract("BlockusNFTStaking", [
    blockusNFT,
    owner.defaultValue!
  ]);

  return { staking };
});