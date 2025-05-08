import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contract with the account:", deployer.address);

  // For this example, we'll use the deployer as the trusted forwarder
  // In a production environment, you would use a proper trusted forwarder contract
  const trustedForwarder = deployer.address;

  // NFT configuration
  const name = "Blockus NFT";
  const symbol = "BLOCKUS";
  const baseURI = "https://api.blockus.com/metadata/";
  const isSoulbound = true;

  // Deploy the contract
  console.log("Deploying Blockus721Simple...");
  const Blockus721Simple = await ethers.getContractFactory("Blockus721Simple");
  const nft = await Blockus721Simple.deploy(
    name,
    symbol,
    baseURI,
    deployer.address, // owner
    trustedForwarder,
    isSoulbound
  );

  await nft.deploymentTransaction()?.wait();
  console.log("Blockus721Simple deployed to:", await nft.getAddress());

  // Verify the deployment
  console.log("NFT Name:", await nft.name());
  console.log("NFT Symbol:", await nft.symbol());
  console.log("Soulbound:", await nft.soulbound());
  
  console.log("\nDeployment Summary:");
  console.log("-------------------");
  console.log("Contract Address:", await nft.getAddress());
  console.log("Owner:", await nft.owner());
  console.log("Soulbound:", await nft.soulbound());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });