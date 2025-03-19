
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

  const newSignerAddress = "0x67C9Ce97D99cCb55B58Fc5502C3dE426101095Af";
  const SIGNER_ROLE = await nft.SIGNER_ROLE();

  console.log("Setting new signer...");
  
  try {
    const tx = await nft.grantRole(SIGNER_ROLE, newSignerAddress);
    await tx.wait();
    console.log(`Successfully set new signer to: ${newSignerAddress}`);
    
    // Verify the role was set
    const hasRole = await nft.hasRole(SIGNER_ROLE, newSignerAddress);
    console.log(`Verified signer role: ${hasRole}`);
  } catch (error) {
    console.error("Error setting signer role:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
