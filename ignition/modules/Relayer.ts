import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const RelayerModule = buildModule("RelayerModule", (m) => {
  // Default parameters that can be overridden during deployment
  const name = m.getParameter("name", "BlockusRelayer");
  const initialOwner = m.getParameter("initialOwner", "");  // This should be provided during deployment
  const allowedContracts = m.getParameter("allowedContracts", [] as string[]); // Empty array by default

  const relayer = m.contract("BlockusRelayer", [
    name,
    initialOwner,
    allowedContracts
  ]);

  return { relayer };
});

export default RelayerModule;
