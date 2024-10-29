import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "ethers";

const DeployAllModule = buildModule("DeployAllModule", (m) => {
  // Deploy Relayer first
  const name = m.getParameter("name", "BlockusRelayer");
  const initialOwner = m.getAccount(0);
  const relayer = m.contract("BlockusRelayer", [
    name,
    initialOwner,
    [] 
  ]);

  const mockNFT = m.contract("MockNFT", [relayer]);
  m.call(relayer, "allowContract", [mockNFT]);


  return {
    relayer,
    mockNFT
  };
});

export default DeployAllModule;