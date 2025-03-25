import { readFileSync } from "fs";
import path from "path";
import hre from "hardhat";
import { ethers } from "hardhat";
import { TralaNFT } from "../typechain-types";

async function main() {
  const chainId = (await hre.ethers.provider.getNetwork()).chainId;
  const deploymentPath = path.join(
    __dirname,
    "../ignition/deployments",
    `chain-${chainId}`,
    "deployed_addresses.json"
  );

  const deployedAddresses = JSON.parse(readFileSync(deploymentPath, "utf8"));
  const tralaNFTAddress = deployedAddresses["DeployTralaModule#TralaNFT"];
  const [deployer, signer] = await hre.ethers.getSigners();

  console.log("Starting TralaNFT contract verification...");

  try {
    await hre.run("verify:verify", {
      address: tralaNFTAddress,
      constructorArguments: [
        "Trala NFT",
        "TRALA", 
        "https://api.trala.com/metadata/",
        deployer.address,
        deployer.address
      ],
    });
    console.log("TralaNFT verified successfully!");
  } catch (error) {
    console.error("Verification failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });