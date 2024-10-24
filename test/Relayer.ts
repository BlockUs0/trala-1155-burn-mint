import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

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
  
});
