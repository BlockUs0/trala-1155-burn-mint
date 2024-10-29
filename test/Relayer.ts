import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("BlockusRelayer", function () {
  // Fixture to reuse the same setup in every test
  async function deployRelayerFixture() {
    const name = "BlockusRelayer";

    // Get signers
    const [owner, otherAccount] = await hre.ethers.getSigners();

    // Deploy the contract
    const Relayer = await hre.ethers.getContractFactory("BlockusRelayer");
    const relayer = await Relayer.deploy(name, owner.address);

    return { relayer, name, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { relayer, owner } = await loadFixture(deployRelayerFixture);
      expect(await relayer.owner()).to.equal(owner.address);
    });

    it("Should start unpaused", async function () {
      const { relayer } = await loadFixture(deployRelayerFixture);
      expect(await relayer.paused()).to.be.false;
    });
  });

  describe("Meta Transactions", function () {
    async function deployMockNFTFixture() {
      const { relayer, owner, otherAccount } = await loadFixture(deployRelayerFixture);
      
      // Deploy MockNFT
      const MockNFT = await hre.ethers.getContractFactory("MockNFT");
      const mockNFT = await MockNFT.deploy(relayer.target);
      
      return { relayer, mockNFT, owner, otherAccount };
    }
  
    it("Should execute meta-transaction to mint NFT", async function () {
      const { relayer, mockNFT, owner, otherAccount } = await loadFixture(deployMockNFTFixture);
  
      const data = mockNFT.interface.encodeFunctionData('mint');
  
      // Create the forward request
      const nonce = await relayer.nonces(otherAccount.address);
      const latestBlock = await hre.ethers.provider.getBlock('latest');
      const currentTimestamp = latestBlock!.timestamp;
      const deadline = BigInt(currentTimestamp + 3600);
  
      // Create forward request data
      const forwardRequest = {
        from: otherAccount.address,
        to: mockNFT.target,
        value: 0n,
        gas: 500000n,
        nonce: nonce,
        data: data,
        deadline: deadline
      };
  
      const domainComponents = await relayer.eip712Domain();

      // Sign the forward request
      const signature = await otherAccount.signTypedData(
        // Domain
        {
          name: domainComponents.name, 
          version: '1',
          chainId: (await hre.ethers.provider.getNetwork()).chainId,
          verifyingContract: String(relayer.target)
        },
        // Types
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
        // Value
        forwardRequest
      );
  
      // Execute the forward request
      const requestData = {
        ...forwardRequest,
        signature: signature
      };
  
      await expect(relayer.execute(requestData))
        .to.emit(mockNFT, 'Transfer')
        .withArgs(hre.ethers.ZeroAddress, otherAccount.address, 0);
  
      // Verify NFT ownership
      expect(await mockNFT.ownerOf(0)).to.equal(otherAccount.address);
    });
  });
});
