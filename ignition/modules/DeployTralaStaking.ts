import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("TralaStakingModule", (m) => {
  // Get parameters with defaults
  const admin = m.getParameter("admin", "0x67C9Ce97D99cCb55B58Fc5502C3dE426101095Af");
  const nftAddress = m.getParameter("nftAddress", "0x0000000000000000000000000000000000000000");

  // Log parameters for verification
  console.log({
    admin,
    nftAddress,
  });

  // Deploy the TralaNFTStaking contract
  const staking = m.contract("TralaNFTStaking", [
    nftAddress,
    admin
  ]);

  return { staking };
});