
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DeployTralaModule = buildModule("DeployTralaModule", (m) => {
  const name = m.getParameter("name", "Trala NFT");
  const symbol = m.getParameter("symbol", "TRALA");
  const baseURI = m.getParameter("baseURI", "https://api.trala.com/metadata/");
  
  const initialTreasury = m.getAccount(0); // First account as treasury
  const initialSigner = m.getAccount(0);   // First account as signer

  console.log(
    {
      initialTreasury,
      initialSigner
    }
  )
  const tralaNFT = m.contract("TralaNFT", [
    name,
    symbol, 
    baseURI,
    initialTreasury,
    initialSigner
  ]);

  // Configure initial test token
  m.call(tralaNFT, "configureToken", [
    1, // tokenId
    "Test Token", // name
    0, // maxSupply (unlimited)
    0, // price
    false, // allowlistRequired
    true, // active
    false // soulbound
  ]);

  return { tralaNFT };
});

export default DeployTralaModule;
