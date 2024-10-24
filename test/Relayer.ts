import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("BlockusRelayer", function () {
  // Fixture to reuse the same setup in every test
  async function deployRelayerFixture() {
    const name = "BlockusRelayer";
    const allowedContracts: string[] = [];

    // Get signers
    const [owner, otherAccount] = await hre.ethers.getSigners();

    // Deploy the contract
    const Relayer = await hre.ethers.getContractFactory("BlockusRelayer");
    const relayer = await Relayer.deploy(name, owner.address, allowedContracts);

    return { relayer, name, allowedContracts, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { relayer, owner } = await loadFixture(deployRelayerFixture);
      expect(await relayer.owner()).to.equal(owner.address);
    });

    it("Should start with empty allowed contracts list", async function () {
      const { relayer } = await loadFixture(deployRelayerFixture);
      expect(await relayer.getAllowedContracts()).to.deep.equal([]);
    });

    it("Should start unpaused", async function () {
      const { relayer } = await loadFixture(deployRelayerFixture);
      expect(await relayer.paused()).to.be.false;
    });

    it("Should initialize with zero balance", async function () {
      const { relayer } = await loadFixture(deployRelayerFixture);
      expect(await relayer.getBalance()).to.equal(0);
    });

    it("Should deploy with initial allowed contracts if provided", async function () {
      // Deploy with an allowed contract
      const [owner] = await hre.ethers.getSigners();
      const mockContract = "0x1234567890123456789012345678901234567890";
      const Relayer = await hre.ethers.getContractFactory("BlockusRelayer");
      const relayer = await Relayer.deploy(
        "BlockusRelayer",
        owner.address,
        [mockContract]
      );

      expect(await relayer.allowedContracts(mockContract)).to.be.true;
      expect(await relayer.getAllowedContracts()).to.deep.equal([mockContract]);
    });
  });

  describe("Funding", function () {
    it("Should accept funds through addFunds", async function () {
      const { relayer, owner } = await loadFixture(deployRelayerFixture);
      const fundAmount = hre.ethers.parseEther("1.0");
      
      await expect(relayer.addFunds({ value: fundAmount }))
        .to.emit(relayer, "FundsDeposited")
        .withArgs(owner.address, fundAmount);
        
      expect(await relayer.getBalance()).to.equal(fundAmount);
    });
  
    it("Should accept funds through direct transfer", async function () {
      const { relayer, owner } = await loadFixture(deployRelayerFixture);
      const fundAmount = hre.ethers.parseEther("1.0");
      
      await expect(owner.sendTransaction({ 
        to: relayer.target, 
        value: fundAmount 
      }))
        .to.emit(relayer, "FundsDeposited")
        .withArgs(owner.address, fundAmount);
        
      expect(await relayer.getBalance()).to.equal(fundAmount);
    });
  
    describe("Withdrawals", function () {
      it("Should allow owner to withdraw funds", async function () {
        const { relayer, owner } = await loadFixture(deployRelayerFixture);
        const fundAmount = hre.ethers.parseEther("1.0");
        
        // First fund the contract
        await relayer.addFunds({ value: fundAmount });
        
        // Then withdraw
        await expect(relayer.withdrawFunds(fundAmount, owner.address))
          .to.emit(relayer, "FundsWithdrawn")
          .withArgs(owner.address, fundAmount);
          
        expect(await relayer.getBalance()).to.equal(0);
      });
  
      it("Should revert withdrawal if caller is not owner", async function () {
        const { relayer, otherAccount } = await loadFixture(deployRelayerFixture);
        const fundAmount = hre.ethers.parseEther("1.0");
        
        // First fund the contract
        await relayer.addFunds({ value: fundAmount });
        
        // Attempt withdrawal from non-owner account
        await expect(relayer.connect(otherAccount).withdrawFunds(
          fundAmount, 
          otherAccount.address
        )).to.be.revertedWithCustomError(relayer, "OwnableUnauthorizedAccount")
          .withArgs(otherAccount.address);
      });
  
      it("Should revert withdrawal if amount exceeds balance", async function () {
        const { relayer, owner } = await loadFixture(deployRelayerFixture);
        const fundAmount = hre.ethers.parseEther("1.0");
        const withdrawAmount = hre.ethers.parseEther("2.0");
        
        // First fund the contract
        await relayer.addFunds({ value: fundAmount });
        
        // Attempt to withdraw more than balance
        await expect(relayer.withdrawFunds(
          withdrawAmount, 
          owner.address
        )).to.be.revertedWithCustomError(relayer, "BalanceInsufficient");

      });
  
      it("Should track balance correctly after multiple operations", async function () {
        const { relayer, owner } = await loadFixture(deployRelayerFixture);
        const fundAmount1 = hre.ethers.parseEther("1.0");
        const fundAmount2 = hre.ethers.parseEther("0.5");
        const withdrawAmount = hre.ethers.parseEther("0.3");
        
        await relayer.addFunds({ value: fundAmount1 });
        expect(await relayer.getBalance()).to.equal(fundAmount1);
        
        await relayer.addFunds({ value: fundAmount2 });
        expect(await relayer.getBalance()).to.equal(fundAmount1 + fundAmount2);
        
        await relayer.withdrawFunds(withdrawAmount, owner.address);
        expect(await relayer.getBalance()).to.equal(fundAmount1 + fundAmount2 - withdrawAmount);
      });
    });
  });

  describe("Meta Transactions", function () {
    async function deployMockNFTFixture() {
      const { relayer, owner, otherAccount } = await loadFixture(deployRelayerFixture);
      
      // Deploy MockNFT
      const MockNFT = await hre.ethers.getContractFactory("MockNFT");
      const mockNFT = await MockNFT.deploy(relayer.target);
      
      // Add MockNFT to allowed contracts
      await relayer.allowContract(mockNFT.target);
      
      // Fund relayer
      await relayer.addFunds({ value: hre.ethers.parseEther("1.0") });
      
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
          name: await domainComponents.name, 
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

    it("Should revert execution for non-allowed contract", async function () {
      const { relayer, owner, otherAccount } = await loadFixture(deployMockNFTFixture);
      
      // Deploy another MockNFT but don't add to allowed list
      const MockNFT = await hre.ethers.getContractFactory("MockNFT");
      const unauthorizedNFT = await MockNFT.deploy(relayer.target);
  
      const data = unauthorizedNFT.interface.encodeFunctionData('mint');
  
      const nonce = await relayer.nonces(otherAccount.address);
      const latestBlock = await hre.ethers.provider.getBlock('latest');
      const currentTimestamp = latestBlock!.timestamp;
      const deadline = BigInt(currentTimestamp + 3600);
  
      const forwardRequest = {
        from: otherAccount.address,
        to: unauthorizedNFT.target,
        value: 0n,
        gas: 500000n,
        nonce: nonce,
        data: data,
        deadline: deadline
      };

      const domainComponents = await relayer.eip712Domain();
  
      const signature = await otherAccount.signTypedData(
        {
          name: domainComponents.name,
          version: '1',
          chainId: (await hre.ethers.provider.getNetwork()).chainId,
          verifyingContract: String(relayer.target)
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
  
      await expect(relayer.execute(requestData))
        .to.be.revertedWithCustomError(relayer, "ContractNotAllowed")
        .withArgs(unauthorizedNFT.target);
    });
  });
});
