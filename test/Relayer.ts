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
});
