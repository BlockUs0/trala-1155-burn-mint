import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DeployTralaModule = buildModule("DeployTralaModule", (m) => {
  const name = m.getParameter("name", "Trala Arcade");
  const symbol = m.getParameter("symbol", "TRALA");
  const baseURI = m.getParameter(
    "baseURI",
    "https://teal-genuine-cardinal-120.mypinata.cloud/ipfs/bafybeihavthaotmgpb3btvmvzvh2nbweuxowqkqdnn3gsfcnhl4kg7tz7q/{id}.json"
  );

  const initialTreasury = "0xBDE4d8669C7543acd972DA1Ad96478E7A5D857c2"; // First account as treasury
  const initialAdmin = "0x71B81e78F08c3f2d799e3C1d5D4cE877ab0c8804"; // First account as signer

  console.log({
    initialTreasury,
    initialAdmin,
  });
  const tralaNFT = m.contract("TralaNFT", [
    name,
    symbol,
    baseURI,
    initialTreasury,
    initialAdmin,
  ]);

  // Configure initial test token
  m.call(tralaNFT, "configureToken", [
    1, // tokenId
    "Trala Arcade B Grade", // name
    0, // maxSupply (unlimited)
    0, // price
    false, // allowlistRequired
    true, // active
    false, // soulbound
  ]);

  return { tralaNFT };
});

export default DeployTralaModule;
