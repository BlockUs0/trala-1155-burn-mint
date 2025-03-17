
import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("TralaNFT", function () {
  // Fixture to reuse the same setup in every test
  async function deployTralaNFTFixture() {
    const name = "Trala NFT";
    const symbol = "TRALA";
    const baseURI = "https://api.trala.com/metadata/";

    // Get signers
    const [owner, admin, signer, otherAccount] = await hre.ethers.getSigners();

    // Deploy the contract
    const TralaNFT = await hre.ethers.getContractFactory("TralaNFT");
    const nft = await TralaNFT.deploy(
      name,
      symbol,
      baseURI,
      admin.address,
      signer.address
    );

    return { nft, name, symbol, baseURI, owner, admin, signer, otherAccount };
  }

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      const { nft, name, symbol } = await loadFixture(deployTralaNFTFixture);
      expect(await nft.name()).to.equal(name);
      expect(await nft.symbol()).to.equal(symbol);
    });

    it("Should set the right roles", async function () {
      const { nft, owner, admin, signer } = await loadFixture(deployTralaNFTFixture);
      
      const DEFAULT_ADMIN_ROLE = await nft.DEFAULT_ADMIN_ROLE();
      const ADMIN_ROLE = await nft.ADMIN_ROLE();
      const SIGNER_ROLE = await nft.SIGNER_ROLE();

      const TREASURY_ROLE = await nft.TREASURY_ROLE();
      
      expect(await nft.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await nft.hasRole(TREASURY_ROLE, owner.address)).to.be.true;
      expect(await nft.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
      expect(await nft.hasRole(SIGNER_ROLE, signer.address)).to.be.true;
    });

    it("Should start unpaused", async function () {
      const { nft } = await loadFixture(deployTralaNFTFixture);
      expect(await nft.paused()).to.be.false;
    });
  });

  describe("Token Configuration", function () {
    it("Should allow admin to configure a new token", async function () {
      const { nft, admin } = await loadFixture(deployTralaNFTFixture);
      
      const tokenId = 1;
      const tokenConfig = {
        name: "Grade A",
        maxSupply: 100n,
        price: ethers.parseEther("0.1"),
        allowlistRequired: true,
        active: true,
        soulbound: true
      };

      await expect(nft.connect(admin).configureToken(
        tokenId,
        tokenConfig.name,
        tokenConfig.maxSupply,
        tokenConfig.price,
        tokenConfig.allowlistRequired,
        tokenConfig.active,
        tokenConfig.soulbound
      )).to.emit(nft, "TokenConfigured")
        .withArgs(
          tokenId,
          tokenConfig.name,
          tokenConfig.maxSupply,
          tokenConfig.price,
          tokenConfig.allowlistRequired,
          tokenConfig.active,
          tokenConfig.soulbound
        );

      const config = await nft.tokenConfigs(tokenId);
      expect(config.name).to.equal(tokenConfig.name);
      expect(config.maxSupply).to.equal(tokenConfig.maxSupply);
      expect(config.price).to.equal(tokenConfig.price);
      expect(config.allowlistRequired).to.equal(tokenConfig.allowlistRequired);
      expect(config.active).to.equal(tokenConfig.active);
      expect(config.soulbound).to.equal(tokenConfig.soulbound);
    });
  });

  describe("Minting", function () {
    it("Should allow public minting when allowlist is not required", async function () {
      const { nft, admin, otherAccount } = await loadFixture(deployTralaNFTFixture);
      
      const tokenId = 1;
      await nft.connect(admin).configureToken(
        tokenId,
        "Public Token",
        100n,
        ethers.parseEther("0.1"),
        false, // allowlistRequired
        true,  // active
        false  // soulbound
      );

      await expect(nft.connect(otherAccount).mint(
        otherAccount.address,
        tokenId,
        1,
        "0x",
        { value: ethers.parseEther("0.1") }
      )).to.emit(nft, "TokenMinted")
        .withArgs(otherAccount.address, tokenId, 1);

      expect(await nft.balanceOf(otherAccount.address, tokenId)).to.equal(1n);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to pause and unpause", async function () {
      const { nft, admin } = await loadFixture(deployTralaNFTFixture);
      
      await expect(nft.connect(admin).pause())
        .to.emit(nft, "Paused")
        .withArgs(admin.address);
      
      expect(await nft.paused()).to.be.true;

      await expect(nft.connect(admin).unpause())
        .to.emit(nft, "Unpaused")
        .withArgs(admin.address);
      
      expect(await nft.paused()).to.be.false;
    });
  });
});
