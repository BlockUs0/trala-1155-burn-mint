
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DeployTralaModule = buildModule("DeployTralaModule", (m) => {
  const name = m.getParameter("name", "Trala NFT");
  const symbol = m.getParameter("symbol", "TRALA");
  const baseURI = m.getParameter("baseURI", "https://api.trala.com/metadata/");
  
  const initialTreasury = m.getAccount(0); // First account as treasury
  const initialSigner = m.getAccount(1);   // Second account as signer

  const tralaNFT = m.contract("TralaNFT", [
    name,
    symbol, 
    baseURI,
    initialTreasury,
    initialSigner
  ]);

  return { tralaNFT };
});

export default DeployTralaModule;
