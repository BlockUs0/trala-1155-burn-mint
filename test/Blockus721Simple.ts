import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("Blockus721Simple", function () {
  // Fixture to reuse the same setup in every test
  async function deployFixture() {
    // Get signers
    const [owner, trustedForwarder, user] = await hre.ethers.getSigners();

    // NFT configuration
    const name = "Blockus NFT";
    const symbol = "BLOCKUS";
    const baseURI = "https://api.blockus.com/metadata/";
    const isSoulbound = true;

    // Deploy the contract
    const Blockus721Simple = await hre.ethers.getContractFactory("Blockus721Simple");
    const nft = await Blockus721Simple.deploy(
      name,
      symbol,
      baseURI,
      owner.address,
      trustedForwarder.address,
      isSoulbound
    );

    return { nft, name, symbol, baseURI, owner, trustedForwarder, user, isSoulbound };
  }

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      const { nft, name, symbol } = await loadFixture(deployFixture);
      expect(await nft.name()).to.equal(name);
      expect(await nft.symbol()).to.equal(symbol);
    });

    it("Should set the right owner", async function () {
      const { nft, owner } = await loadFixture(deployFixture);
      expect(await nft.owner()).to.equal(owner.address);
    });

    it("Should set the soulbound status correctly", async function () {
      const { nft, isSoulbound } = await loadFixture(deployFixture);
      expect(await nft.soulbound()).to.equal(isSoulbound);
    });

    it("Should start unpaused", async function () {
      const { nft } = await loadFixture(deployFixture);
      expect(await nft.paused()).to.be.false;
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint tokens", async function () {
      const { nft, owner, user } = await loadFixture(deployFixture);
      
      // Mint a token
      await nft.connect(owner).mint(user.address);
      
      // Check the token owner
      expect(await nft.ownerOf(1)).to.equal(user.address);
      
      // Check the user's balance
      expect(await nft.balanceOf(user.address)).to.equal(1);
    });

    it("Should allow batch minting", async function () {
      const { nft, owner, user } = await loadFixture(deployFixture);
      
      // Batch mint 5 tokens
      await nft.connect(owner).batchMint(user.address, 5);
      
      // Check the user's balance
      expect(await nft.balanceOf(user.address)).to.equal(5);
      
      // Check ownership of each token
      for (let i = 1; i <= 5; i++) {
        expect(await nft.ownerOf(i)).to.equal(user.address);
      }
    });

    it("Should not allow non-owners to mint", async function () {
      const { nft, user } = await loadFixture(deployFixture);
      
      // Try to mint as non-owner
      await expect(nft.connect(user).mint(user.address))
        .to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });
  });

  describe("Soulbound Functionality", function () {
    it("Should prevent transfers when soulbound is true", async function () {
      const { nft, owner, user } = await loadFixture(deployFixture);
      
      // Mint a token
      await nft.connect(owner).mint(user.address);
      
      // Try to transfer the token
      await expect(
        nft.connect(user).transferFrom(user.address, owner.address, 1)
      ).to.be.revertedWith("Token is soulbound");
    });

    it("Should allow transfers when soulbound is false", async function () {
      const { nft, owner, user } = await loadFixture(deployFixture);
      
      // Set soulbound to false
      await nft.connect(owner).setSoulbound(false);
      
      // Mint a token
      await nft.connect(owner).mint(user.address);
      
      // Transfer the token
      await nft.connect(user).transferFrom(user.address, owner.address, 1);
      
      // Check the new owner
      expect(await nft.ownerOf(1)).to.equal(owner.address);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to pause and unpause", async function () {
      const { nft, owner } = await loadFixture(deployFixture);
      
      // Pause
      await nft.connect(owner).pause();
      expect(await nft.paused()).to.be.true;
      
      // Unpause
      await nft.connect(owner).unpause();
      expect(await nft.paused()).to.be.false;
    });

    it("Should allow owner to update base URI", async function () {
      const { nft, owner } = await loadFixture(deployFixture);
     
      const newBaseURI = "https://new.api.blockus.com/metadata/";
      
      // Update base URI
      await nft.connect(owner).setBaseURI(newBaseURI);
      
      // Mint a token to check URI
      await nft.connect(owner).mint(owner.address);
      
      // Check the token URI
      expect(await nft.tokenURI(1)).to.equal(newBaseURI + "1");
    });

    it("Should allow owner to update soulbound status", async function () {
      const { nft, owner } = await loadFixture(deployFixture);
      
      // Update soulbound status
      await nft.connect(owner).setSoulbound(false);
      
      // Check the updated status
      expect(await nft.soulbound()).to.be.false;
    });
  });
});