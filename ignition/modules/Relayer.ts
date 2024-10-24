import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const RelayerModule = buildModule("RelayerModule", (m) => {
  const name = m.getParameter("name", "BlockusRelayer");
  const initialOwner = m.getAccount(0);
  const allowedContracts = m.getParameter("allowedContracts", [] as string[]);

  const relayer = m.contract("BlockusRelayer", [
    name,
    initialOwner,
    allowedContracts
  ]);

  return { relayer };
});

export default RelayerModule;
