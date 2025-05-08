import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // For this example, we'll use the deployer as the trusted forwarder
  // In a production environment, you would use a proper trusted forwarder contract
  const trustedForwarder = deployer.address;

  // Deploy the factory
  console.log("Deploying Blockus721Factory...");
  const Blockus721Factory = await ethers.getContractFactory("Blockus721Factory");
  const factory = await Blockus721Factory.deploy(trustedForwarder);
  await factory.deploymentTransaction()?.wait();
  console.log("Blockus721Factory deployed to:", await factory.getAddress());

  // NFT configuration
  const name = "Blockus NFT";
  const symbol = "BLOCKUS";
  const baseURI = "https://api.blockus.com/metadata/";
  
  // For this example, we'll use the deployer as the treasury and signer
  // In a production environment, you would use different addresses
  const treasury = deployer.address;
  const signer = deployer.address;

  // Token configuration
  const tokenConfig = {
    maxSupply: 1000n,
    price: ethers.parseEther("0.1"),
    allowlistRequired: false,
    active: true,
    soulbound: false
  };

  // Deployment configuration
  const deploymentConfig = {
    name,
    symbol,
    baseURI,
    treasury,
    signer,
    tokenConfig
  };

  // Deploy an NFT contract
  console.log("Deploying Blockus721 NFT...");
  const tx = await factory.deployNFT(deploymentConfig);
  const receipt = await tx.wait();
  
  // Get the deployed contract address from the event
  const event = receipt?.logs[0];
  const deployedAddress = event?.args?.[0];
  
  console.log("Blockus NFT deployed to:", deployedAddress);

  // Get the contract instance
  const nft = await ethers.getContractAt("Blockus721", deployedAddress);
  
  // Verify the deployment
  console.log("NFT Name:", await nft.name());
  console.log("NFT Symbol:", await nft.symbol());
  
  // Configure a soulbound token
  console.log("Configuring token as soulbound...");
  await nft.configureToken(
    1000n, // maxSupply
    ethers.parseEther("0.1"), // price
    false, // allowlistRequired
    true, // active
    true // soulbound
  );
  
  console.log("Token configured as soulbound");
  
  // Print summary
  console.log("\nDeployment Summary:");
  console.log("-------------------");
  console.log("Blockus721Factory:", await factory.getAddress());
  console.log("Blockus721 NFT:", deployedAddress);
  console.log("NFT Name:", await nft.name());
  console.log("NFT Symbol:", await nft.symbol());
  console.log("Soulbound:", (await nft.tokenConfig()).soulbound);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });