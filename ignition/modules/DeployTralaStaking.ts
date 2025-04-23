import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import DeployTralaModule from "./DeployTrala";

export default buildModule("TralaStakingModule", (m) => {
  const { tralaNFT } = m.useModule(DeployTralaModule);
  
  // Get admin parameter - can be overridden during deployment
  // npx hardhat ignition deploy ignition/modules/DeployTralaStaking.ts --parameters admin=YOUR_ADDRESS
  const owner = m.getParameter("admin", "0xFB712f6712E701dc09F50E6373F230780a84eD7b");

  // Deploy the TralaNFTStaking contract
  const staking = m.contract("TralaNFTStaking", [
    tralaNFT,
    owner.defaultValue!
  ]);

  return { staking };
});