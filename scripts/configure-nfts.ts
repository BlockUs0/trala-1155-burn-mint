
import hre, { ethers } from "hardhat";
import { readFileSync } from "fs";
import path from "path";
import { BlockusNFT } from "../typechain-types";

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
  const blockusNFTAddress = deployedAddresses["DeployBlockus721SimpleModule#Blockus721Simple"];

  console.log(blockusNFTAddress, chainId);

  // Get the contract instance with proper typing
  const BlockusNFT = await hre.ethers.getContractFactory("BlockusNFT");
  const nft = (await BlockusNFT.attach(blockusNFTAddress)) as unknown as BlockusNFT;

  const signer = await nft.ADMIN_ROLE
  console.log(signer)

  // Example configurations
  const nftConfigs = [
    {
      tokenId: 0,
      name: "Grade A",
      maxSupply: 100n,
      price: ethers.parseEther("0"),
      allowlistRequired: false,
      active: true,
      soulbound: false
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
      const callData = nft.interface.encodeFunctionData("configureToken", [
        config.tokenId,
        config.name,
        config.maxSupply,
        config.price,
        config.allowlistRequired,
        config.active,
        config.soulbound
      ]);
      console.log("Raw Call Data:", callData);
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
