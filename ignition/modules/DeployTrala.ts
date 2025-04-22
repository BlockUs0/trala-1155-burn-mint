import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DeployTralaModule = buildModule("DeployTralaModule", (m) => {
  const name = m.getParameter("name", "Trala NFT");
  const symbol = m.getParameter("symbol", "TRALA");
  const baseURI = m.getParameter("baseURI", "https://api.trala.com/metadata/");

  const initialTreasury = "0x4D483FB9Aa883956f05fb1CF0746B04e93170D13"; // First account as treasury
  const initialAdmin = "0x67C9Ce97D99cCb55B58Fc5502C3dE426101095Af"; // First account as signer

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
    "Test Token", // name
    0, // maxSupply (unlimited)
    0, // price
    true, // allowlistRequired
    true, // active
    false, // soulbound
  ]);

  return { tralaNFT };
});

export default DeployTralaModule;
