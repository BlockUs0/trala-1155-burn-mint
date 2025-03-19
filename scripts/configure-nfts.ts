
import hre, { ethers } from "hardhat";
import { readFileSync } from "fs";
import path from "path";

async function main() {
  // Get the network and deployment info
  const chainId = (await hre.ethers.provider.getNetwork()).chainId;
  const deploymentPath = path.join(
    __dirname,
    "../ignition/deployments",
    `chain-${chainId}`,
    "deployed_addresses.json"
  );

  const deployedAddresses = JSON.parse(readFileSync(deploymentPath, "utf8"));
  const tralaNFTAddress = deployedAddresses["DeployTralaModule#TralaNFT"];

  // Get the contract instance
  const TralaNFT = await hre.ethers.getContractFactory("TralaNFT");
  const nft = TralaNFT.attach(tralaNFTAddress);

  // Example configurations
  const nftConfigs = [
    {
      tokenId: 1,
      name: "Grade A",
      maxSupply: 100n,
      price: ethers.parseEther("0"),
      allowlistRequired: true,
      active: true,
      soulbound: true
    },
    // {
    //   tokenId: 2,
    //   name: "Grade B",
    //   maxSupply: 200n,
    //   price: ethers.parseEther("0.05"),
    //   allowlistRequired: false,
    //   active: true,
    //   soulbound: false
    // }
  ];

  // Configure each NFT
  for (const config of nftConfigs) {
    console.log(`Configuring token ${config.tokenId} - ${config.name}...`);
    
    try {
      const tx = await nft.configureToken(
        config.tokenId,
        config.name,
        config.maxSupply,
        config.price,
        config.allowlistRequired,
        config.active,
        config.soulbound
      );
      
      await tx.wait();
      console.log(`Token ${config.tokenId} configured successfully!`);
      
      // Get and display the token configuration
      const tokenConfig = await nft.tokenConfigs(config.tokenId);
      console.log("Token configuration:", {
        name: tokenConfig.name,
        maxSupply: tokenConfig.maxSupply,
        price: tokenConfig.price,
        allowlistRequired: tokenConfig.allowlistRequired,
        active: tokenConfig.active,
        soulbound: tokenConfig.soulbound
      });
    } catch (error) {
      console.error(`Error configuring token ${config.tokenId}:`, error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
