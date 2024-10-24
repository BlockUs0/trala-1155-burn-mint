import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const MockNFTModule = buildModule("MockNFTModule", (m) => {
  // Get the relayer address if provided, otherwise use a placeholder
  const relayerAddress = m.getParameter(
    "relayerAddress", 
    "0x0000000000000000000000000000000000000000"
  );

  const mockNFT = m.contract("MockNFT", [relayerAddress]);

  return { mockNFT };
});

export default MockNFTModule;
