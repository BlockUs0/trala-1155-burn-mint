import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const RelayerModule = buildModule("RelayerModule", (m) => {
  const name = m.getParameter("name", "BlockusRelayer");
  const initialOwner = m.getAccount(0);

  const relayer = m.contract("BlockusRelayer", [
    name,
    initialOwner,
  ]);

  return { relayer };
});

export default RelayerModule;
