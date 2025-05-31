import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DeployBlockusNFTModule = buildModule("DeployBlockusNFTModule", (m) => {
  const name = m.getParameter("name", "Blockus NFT");
  const symbol = m.getParameter("symbol", "BLOCKUS");
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
  const blockusNFT = m.contract("BlockusNFT", [
    name,
    symbol,
    baseURI,
    initialTreasury,
    initialAdmin,
  ]);

  // Configure initial test token
  m.call(blockusNFT, "configureToken", [
    1, // tokenId
    "Blockus NFT Grade B", // name
    0, // maxSupply (unlimited)
    0, // price
    false, // allowlistRequired
    true, // active
    false, // soulbound
  ]);

  return { blockusNFT };
});

export default DeployBlockusNFTModule;
