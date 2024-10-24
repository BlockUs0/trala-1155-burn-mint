// npx hardhat run scripts/mint-nfts.ts --network <your-network>

import { ethers } from "hardhat";

async function main() {
  // Get signers
  const [owner, recipient] = await ethers.getSigners();
  console.log("Owner address:", owner.address);
  console.log("Recipient address:", recipient.address);

  const relayerAddress = '0x25711DC423660745109C689268f9107dE1b60791';
  const mockNFTAddress = '0x14aF69C94067c72F7B7ccc74E81a6c0FdD7b20Ad';

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

  // Mint NFT
  const data = mockNFT.interface.encodeFunctionData('mint');
  
  // Create the forward request
  const nonce = await relayer.nonces(recipient.address);
  const latestBlock = await ethers.provider.getBlock('latest');
  const deadline = BigInt(latestBlock!.timestamp + 3600); // 1 hour from now

  const forwardRequest = {
    from: recipient.address, // Using recipient address as the 'from' address
    to: mockNFTAddress,
    value: 0n,
    gas: 500000n,
    nonce: nonce,
    data: data,
    deadline: deadline
  };

  const domainData = await relayer.eip712Domain();

  // Sign the forward request with the recipient's signer
  const signature = await recipient.signTypedData(
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

  console.log(`Minting NFT for ${recipient.address}...`);
  const tx = await relayer.execute(requestData);
  await tx.wait();
  console.log(`NFT minted! Transaction: ${tx.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
