import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { BlockusNFT } from "../typechain-types";

describe("BlockusNFT", function () {
  // Fixture to reuse the same setup in every test
  async function deployBlockusNFTFixture() {
    const name = "Blockus NFT";
    const symbol = "BLOCKUS";
    const baseURI = "https://api.blockus.com/metadata/";

    // Get signers
    const [owner, admin, signer, otherAccount] = await hre.ethers.getSigners();

    // Deploy the contract
    const BlockusNFT = await hre.ethers.getContractFactory("BlockusNFT");
    const nft: BlockusNFT = await BlockusNFT.deploy(
      name,
      symbol,
      baseURI,
      owner.address,
      signer.address,
    );

    return { nft, name, symbol, baseURI, owner, admin, signer, otherAccount };
  }

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      const { nft, name, symbol } = await loadFixture(deployBlockusNFTFixture);
      expect(await nft.name()).to.equal(name);
      expect(await nft.symbol()).to.equal(symbol);
    });

    it("Should set the right roles", async function () {
      const { nft, owner, signer } = await loadFixture(deployBlockusNFTFixture);

      const ADMIN_ROLE = await nft.ADMIN_ROLE();
      const SIGNER_ROLE = await nft.SIGNER_ROLE();
      const TREASURY_ROLE = await nft.TREASURY_ROLE();

      expect(await nft.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
      expect(await nft.hasRole(TREASURY_ROLE, owner.address)).to.be.true;
      expect(await nft.hasRole(SIGNER_ROLE, signer.address)).to.be.true;
    });

    it("Should start unpaused", async function () {
      const { nft } = await loadFixture(deployBlockusNFTFixture);
      expect(await nft.paused()).to.be.false;
    });
  });

  describe("Token Configuration", function () {
    it("Should allow admin to configure a new token", async function () {
      const { nft, admin, owner } = await loadFixture(deployBlockusNFTFixture);

      const tokenId = 1;
      const tokenConfig = {
        name: "Grade A",
        maxSupply: 100n,
        price: ethers.parseEther("0.1"),
        allowlistRequired: true,
        active: true,
        soulbound: true,
      };

      await expect(
        nft
          .connect(owner)
          .configureToken(
            tokenId,
            tokenConfig.name,
            tokenConfig.maxSupply,
            tokenConfig.price,
            tokenConfig.allowlistRequired,
            tokenConfig.active,
            tokenConfig.soulbound,
          ),
      )
        .to.emit(nft, "BlockusNFTConfigured")
        .withArgs(
          tokenId,
          tokenConfig.name,
          tokenConfig.maxSupply,
          tokenConfig.price,
          tokenConfig.allowlistRequired,
          tokenConfig.active,
          tokenConfig.soulbound,
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
      const { nft, admin, otherAccount, owner } = await loadFixture(
        deployBlockusNFTFixture,
      );

      const tokenId = 1;
      await nft.connect(owner).configureToken(
        tokenId,
        "Public Token",
        100n,
        ethers.parseEther("0.1"),
        false, // allowlistRequired
        true, // active
        false, // soulbound
      );

      await expect(
        nft
          .connect(otherAccount)
          .mint(otherAccount.address, tokenId, 1, "0x", {
            value: ethers.parseEther("0.1"),
          }),
    )
      .to.emit(nft, "BlockusNFTMinted")
      .withArgs(otherAccount.address, tokenId, 1);

      expect(await nft.balanceOf(otherAccount.address, tokenId)).to.equal(1n);
    });

    it("Should revert when token is not active", async function () {
      const { nft, admin, otherAccount, owner } = await loadFixture(
        deployBlockusNFTFixture,
      );

      const tokenId = 1;
      await nft.connect(owner).configureToken(
        tokenId,
        "Inactive Token",
        100n,
        ethers.parseEther("0.1"),
        false,
        false, // active = false
        false,
      );

      await expect(
        nft
          .connect(otherAccount)
          .mint(otherAccount.address, tokenId, 1, "0x", {
            value: ethers.parseEther("0.1"),
          }),
      )
        .to.be.revertedWithCustomError(nft, "TokenNotActive")
        .withArgs(tokenId);
    });

    it("Should revert when payment is insufficient", async function () {
      const { nft, admin, owner ,otherAccount } = await loadFixture(
        deployBlockusNFTFixture,
      );

      const tokenId = 1;
      const price = ethers.parseEther("0.1");
      await nft
        .connect(owner)
        .configureToken(tokenId, "Paid Token", 100n, price, false, true, false);

      const sentValue = ethers.parseEther("0.05");
      await expect(
        nft
          .connect(otherAccount)
          .mint(otherAccount.address, tokenId, 1, "0x", { value: sentValue }),
      )
        .to.be.revertedWithCustomError(nft, "InsufficientPayment")
        .withArgs(price, sentValue);
    });

    it("Should revert when exceeding max supply", async function () {
      const { nft, admin, otherAccount, owner } = await loadFixture(
        deployBlockusNFTFixture,
      );

      const tokenId = 1;
      const maxSupply = 2n;
      await nft
        .connect(owner)
        .configureToken(
          tokenId,
          "Limited Token",
          maxSupply,
          ethers.parseEther("0.1"),
          false,
          true,
          false,
        );

      // Mint within limit
      await nft
        .connect(otherAccount)
        .mint(otherAccount.address, tokenId, 2, "0x", {
          value: ethers.parseEther("0.2"),
        });

      // Try to mint one more
      await expect(
        nft
          .connect(otherAccount)
          .mint(otherAccount.address, tokenId, 1, "0x", {
            value: ethers.parseEther("0.1"),
          }),
      )
        .to.be.revertedWithCustomError(nft, "ExceedsMaxSupply")
        .withArgs(tokenId, maxSupply, maxSupply, 1n);
    });

    it("Should revert when signature is required but not provided", async function () {
      const { nft, admin, owner, otherAccount } = await loadFixture(
        deployBlockusNFTFixture,
      );

      const tokenId = 1;
      await nft.connect(owner).configureToken(
        tokenId,
        "Allowlist Token",
        100n,
        ethers.parseEther("0.1"),
        true, // allowlistRequired
        true,
        false,
      );

      await expect(
        nft.connect(otherAccount).mint(
          otherAccount.address,
          tokenId,
          1,
          "0x", // Empty signature
          { value: ethers.parseEther("0.1") },
        ),
      ).to.be.revertedWithCustomError(nft, "SignatureRequired");
    });

    it("Should revert when trying to transfer soulbound token", async function () {
      const { nft, admin, otherAccount, owner } = await loadFixture(
        deployBlockusNFTFixture,
      );

      const tokenId = 1;
      await nft.connect(owner).configureToken(
        tokenId,
        "Soulbound Token",
        100n,
        ethers.parseEther("0.1"),
        false,
        true,
        true, // soulbound
      );

      // Mint token
      await nft
        .connect(otherAccount)
        .mint(otherAccount.address, tokenId, 1, "0x", {
          value: ethers.parseEther("0.1"),
        });

      // Try to transfer
      await expect(
        nft
          .connect(otherAccount)
          .safeTransferFrom(
            otherAccount.address,
            owner.address,
            tokenId,
            1,
            "0x",
          ),
      )
        .to.be.revertedWithCustomError(nft, "TokenIsSoulbound")
        .withArgs(tokenId);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to pause and unpause", async function () {
      const { nft, admin, owner } = await loadFixture(deployBlockusNFTFixture);

      await expect(nft.connect(owner).pause())
        .to.emit(nft, "Paused")
        .withArgs(owner.address);

      expect(await nft.paused()).to.be.true;

      await expect(nft.connect(owner).unpause())
        .to.emit(nft, "Unpaused")
        .withArgs(owner.address);

      expect(await nft.paused()).to.be.false;
    });

    it("Should allow treasury role to withdraw funds", async function () {
      const { nft, owner, otherAccount, admin } = await loadFixture(
        deployBlockusNFTFixture,
      );

      // Configure and mint a token to generate funds
      const tokenId = 1;
      await nft
        .connect(owner)
        .configureToken(
          tokenId,
          "Test Token",
          100n,
          ethers.parseEther("0.1"),
          false,
          true,
          false,
        );

      // Mint token to generate funds
      await nft
        .connect(otherAccount)
        .mint(otherAccount.address, tokenId, 1, "0x", {
          value: ethers.parseEther("0.1"),
        });

      const initialBalance = await ethers.provider.getBalance(owner.address);
      await nft.connect(owner).withdraw();
      const finalBalance = await ethers.provider.getBalance(owner.address);

      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should not allow non-treasury role to withdraw funds", async function () {
      const { nft, admin, otherAccount, owner } = await loadFixture(
        deployBlockusNFTFixture,
      );

      // Configure and mint a token to generate funds
      const tokenId = 1;
      await nft
        .connect(owner)
        .configureToken(
          tokenId,
          "Test Token",
          100n,
          ethers.parseEther("0.1"),
          false,
          true,
          false,
        );

      // Mint token to generate funds
      await nft
        .connect(otherAccount)
        .mint(otherAccount.address, tokenId, 1, "0x", {
          value: ethers.parseEther("0.1"),
        });

      // Admin should not be able to withdraw
      await expect(nft.connect(admin).withdraw()).to.be.revertedWithCustomError(
        nft,
        "AccessControlUnauthorizedAccount",
      );
    });

    it("Should revert when trying to withdraw with no funds", async function () {
      const { nft, owner } = await loadFixture(deployBlockusNFTFixture);

      await expect(nft.connect(owner).withdraw()).to.be.revertedWithCustomError(
        nft,
        "NoFundsToWithdraw",
      );
    });
  });

  describe("EIP712 Domain", function () {
    it("Should have correct EIP712 domain parameters", async function () {
      const { nft, name } = await loadFixture(deployBlockusNFTFixture);

      const domain = await nft.eip712Domain();
      console.log({ domain })
      expect(domain.name).to.equal(name);
      expect(domain.version).to.equal("1");
      expect(domain.chainId).to.equal(await ethers.provider.getNetwork().then(n => n.chainId));
      expect(domain.verifyingContract).to.equal(await nft.getAddress());
    });
  });
});