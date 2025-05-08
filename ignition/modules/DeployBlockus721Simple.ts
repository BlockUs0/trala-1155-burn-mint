import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DeployBlockus721SimpleModule = buildModule("DeployBlockus721SimpleModule", (m) => {
  // Get parameters with default values
  const name = m.getParameter("name", "Blockus NFT");
  const symbol = m.getParameter("symbol", "BLOCKUS");
  const baseURI = m.getParameter(
    "baseURI",
    "https://api.blockus.com/metadata/"
  );
  
  // Default addresses - these should be replaced with actual addresses in production
  const initialOwner = m.getParameter("initialOwner", "0xFB712f6712E701dc09F50E6373F230780a84eD7b");
  const trustedForwarder = m.getParameter("trustedForwarder", "0xFB712f6712E701dc09F50E6373F230780a84eD7b");
  
  // Default to soulbound tokens
  const isSoulbound = m.getParameter("isSoulbound", true);

  console.log({
    name,
    symbol,
    baseURI,
    initialOwner,
    trustedForwarder,
    isSoulbound
  });

  // Deploy the Blockus721Simple contract
  const blockusNFT = m.contract("Blockus721Simple", [
    name,
    symbol,
    baseURI,
    initialOwner,
    trustedForwarder,
    isSoulbound
  ]);

  // Optional: Mint initial tokens if needed
  // Uncomment and modify as needed
  /*
  m.call(blockusNFT, "mint", [
    initialOwner, // recipient address
  ]);
  
  // Batch mint example
  m.call(blockusNFT, "batchMint", [
    initialOwner, // recipient address
    5, // amount to mint
  ]);
  */

  return { blockusNFT };
});

export default DeployBlockus721SimpleModule;