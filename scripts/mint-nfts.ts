// npx hardhat run scripts/mint-nfts.ts --network <your-network>

import { ethers } from "hardhat";
import readline from "readline";
import { getDeploymentAddress } from '@nomicfoundation/hardhat-ignition';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  // Get signer
  const [owner] = await ethers.getSigners();
  console.log("Using signer:", owner.address);

  // Get deployed contract addresses from Ignition
  const relayerAddress = await getDeploymentAddress('BlockusRelayer', 'default');
  const mockNFTAddress = await getDeploymentAddress('MockNFT', 'default');

  console.log("Relayer deployed at:", relayerAddress);
  console.log("MockNFT deployed at:", mockNFTAddress);

  // Get contract instances
  const relayer = await ethers.getContractAt("BlockusRelayer", relayerAddress);
  const mockNFT = await ethers.getContractAt("MockNFT", mockNFTAddress);

  // Check if MockNFT is allowed in relayer
  const isAllowed = await relayer.allowedContracts(mockNFTAddress);
  if (!isAllowed) {
    console.log("Adding MockNFT to allowed contracts...");
    await relayer.allowContract(mockNFTAddress);
    console.log("MockNFT added to allowed contracts");
  }

  // Fund relayer if needed
  const balance = await relayer.getBalance();
  if (balance === 0n) {
    const fundAmount = ethers.parseEther("0.1");
    console.log("Funding relayer with", ethers.formatEther(fundAmount), "ETH");
    await relayer.addFunds({ value: fundAmount });
    console.log("Relayer funded");
  }

  // Function to mint NFT
  async function mintNFT(toAddress: string) {
    const data = mockNFT.interface.encodeFunctionData('mint');
    
    // Create the forward request
    const nonce = await relayer.nonces(toAddress);
    const latestBlock = await ethers.provider.getBlock('latest');
    const deadline = BigInt(latestBlock!.timestamp + 3600); // 1 hour from now

    const forwardRequest = {
      from: toAddress,
      to: mockNFTAddress,
      value: 0n,
      gas: 500000n,
      nonce: nonce,
      data: data,
      deadline: deadline
    };

    const domainData = await relayer.eip712Domain();
    const signer = await ethers.getSigner(toAddress);

    // Sign the forward request
    const signature = await signer.signTypedData(
      {
        name: domainData.name,
        version: '1',
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: relayerAddress
      },
      {
        ForwardRequest: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'gas', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint48' },
          { name: 'data', type: 'bytes' },
        ]
      },
      forwardRequest
    );

    const requestData = {
      ...forwardRequest,
      signature: signature
    };

    console.log(`Minting NFT for ${toAddress}...`);
    const tx = await relayer.execute(requestData);
    await tx.wait();
    console.log(`NFT minted! Transaction: ${tx.hash}`);

    // Get token ID and display ownership
    const totalSupply = await mockNFT.totalSupply();
    const tokenId = totalSupply - 1n;
    const owner = await mockNFT.ownerOf(tokenId);
    console.log(`Token #${tokenId} minted and owned by ${owner}`);
  }

  // Interactive prompt
  const promptMint = () => {
    rl.question("Enter address to mint NFT for (or 'exit' to quit): ", async (answer) => {
      if (answer.toLowerCase() === 'exit') {
        rl.close();
        return;
      }

      try {
        await mintNFT(answer);
        promptMint();
      } catch (error) {
        console.error("Error minting NFT:", error);
        promptMint();
      }
    });
  };

  promptMint();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
