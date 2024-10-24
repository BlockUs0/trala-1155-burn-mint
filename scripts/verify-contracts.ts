// npx hardhat run scripts/verify-contracts.ts --network <your-network>
import { readFileSync } from "fs";
import path from "path";
import hre from "hardhat";

async function main() {
  // Read the deployed addresses from the Ignition deployment file
  const chainId = (await hre.ethers.provider.getNetwork()).chainId;
  const deploymentPath = path.join(
    __dirname,
    "../ignition/deployments",
    `chain-${chainId}`,
    "deployed_addresses.json"
  );

  const deployedAddresses = JSON.parse(
    readFileSync(deploymentPath, "utf8")
  );

  const relayerAddress = deployedAddresses["DeployAllModule#BlockusRelayer"];
  const mockNFTAddress = deployedAddresses["DeployAllModule#MockNFT"];
  const [deployer] = await hre.ethers.getSigners();

  console.log("Starting contract verification...");


  try {
    // Verify Relayer
    console.log("Verifying BlockusRelayer...");
    await hre.run("verify:verify", {
      address: relayerAddress,
      constructorArguments: [
        "BlockusRelayer", // name
        deployer.address,
        [], // initial allowed contracts array
      ],
    });
    console.log("BlockusRelayer verified successfully!");

    // Verify MockNFT
    console.log("Verifying MockNFT...");
    await hre.run("verify:verify", {
      address: mockNFTAddress,
      constructorArguments: [relayerAddress],
    });
    console.log("MockNFT verified successfully!");
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
