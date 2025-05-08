import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { Blockus721, Blockus721Factory } from "../typechain-types";

describe("Blockus721 and Factory", function () {
  // Fixture to reuse the same setup in every test
  async function deployFactoryFixture() {
    // Get signers
    const [owner, treasury, signer, user] = await hre.ethers.getSigners();

    // Deploy the trusted forwarder (in a real scenario, you would use an existing one)
    // For simplicity, we'll use the owner address as the trusted forwarder
    const trustedForwarder = owner.address;

    // Deploy the factory
    const Blockus721FactoryFactory = await hre.ethers.getContractFactory("Blockus721Factory");
    const factory = await Blockus721FactoryFactory.deploy(trustedForwarder);

    return { factory, owner, treasury, signer, user, trustedForwarder };
  }

  async function deployNFTFixture() {
    const { factory, owner, treasury, signer, user, trustedForwarder } = await loadFixture(deployFactoryFixture);

    // NFT configuration
    const name = "Trala NFT";
    const symbol = "TRALA";
    const baseURI = "https://api.trala.com/metadata/";

    // Token configuration
    const tokenConfig = {
      maxSupply: 1000n,
      price: ethers.parseEther("0.1"),
      allowlistRequired: false,
      active: true,
      soulbound: false
    };

    // Deployment configuration
    const deploymentConfig = {
      name,
      symbol,
      baseURI,
      treasury: treasury.address,
      signer: signer.address,
      tokenConfig
    };

    // Deploy the NFT contract
    const tx = await factory.deployNFT(deploymentConfig);
    const receipt = await tx.wait();

    // Get the deployed contract address from the event
    const deployedAddress = receipt?.logs[0].address!;
    
    // Get the contract instance
    const nft = await ethers.getContractAt("Blockus721", deployedAddress);

    return { factory, nft, name, symbol, baseURI, owner, treasury, signer, user, tokenConfig };
  }

  describe("Factory", function () {
    it("Should deploy the factory correctly", async function () {
      const { factory, owner, trustedForwarder } = await loadFixture(deployFactoryFixture);
      expect(await factory.owner()).to.equal(owner.address);
      expect(await factory.trustedForwarder()).to.equal(trustedForwarder);
    });

    it("Should deploy an NFT contract", async function () {
      const { factory, nft, name, symbol, owner } = await loadFixture(deployNFTFixture);
      
      // Check the deployed contract
      expect(await nft.name()).to.equal(name);
      expect(await nft.symbol()).to.equal(symbol);
      
      // Check the deployed contracts count
      expect(await factory.getDeployedContractsCount()).to.equal(1);
      
      // Check the deployed contract address
      const deployedContracts = await factory.getDeployedContracts();
      expect(deployedContracts[0]).to.equal(await nft.getAddress());
    });

    it("Should allow updating the trusted forwarder", async function () {
      const { factory, user } = await loadFixture(deployFactoryFixture);
      
      // Update the trusted forwarder
      await factory.setTrustedForwarder(user.address);
      
      // Check the updated trusted forwarder
      expect(await factory.trustedForwarder()).to.equal(user.address);
    });
  });

  describe("NFT Contract", function () {
    it("Should set the right roles", async function () {
      const { nft, owner, treasury, signer } = await loadFixture(deployNFTFixture);
      
      const ADMIN_ROLE = await nft.ADMIN_ROLE();
      const SIGNER_ROLE = await nft.SIGNER_ROLE();
      const TREASURY_ROLE = await nft.TREASURY_ROLE();
      
      expect(await nft.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
      expect(await nft.hasRole(TREASURY_ROLE, treasury.address)).to.be.true;
      expect(await nft.hasRole(SIGNER_ROLE, signer.address)).to.be.true;
    });

    it("Should start unpaused", async function () {
      const { nft } = await loadFixture(deployNFTFixture);
      expect(await nft.paused()).to.be.false;
    });

    it("Should allow minting tokens", async function () {
      const { nft, user } = await loadFixture(deployNFTFixture);
      
      // Mint a token
      const tx = await nft.connect(user).mint(user.address, "0x", {
        value: ethers.parseEther("0.1")
      });
      
      // Wait for the transaction to be mined
      await tx.wait();
      
      // Check the token owner
      expect(await nft.ownerOf(1)).to.equal(user.address);
      
      // Check the user's balance
      expect(await nft.balanceOf(user.address)).to.equal(1);
    });

    it("Should revert when payment is insufficient", async function () {
      const { nft, user } = await loadFixture(deployNFTFixture);
      
      // Try to mint with insufficient payment
      await expect(
        nft.connect(user).mint(user.address, "0x", {
          value: ethers.parseEther("0.05")
        })
      ).to.be.revertedWithCustomError(nft, "InsufficientPayment");
    });

    it("Should allow configuring token parameters", async function () {
      const { nft, owner } = await loadFixture(deployNFTFixture);
      
      // Configure token parameters
      await nft.connect(owner).configureToken(
        500n, // maxSupply
        ethers.parseEther("0.2"), // price
        true, // allowlistRequired
        true, // active
        true // soulbound
      );
      
      // Check the updated configuration
      const config = await nft.tokenConfig();
      expect(config.maxSupply).to.equal(500n);
      expect(config.price).to.equal(ethers.parseEther("0.2"));
      expect(config.allowlistRequired).to.be.true;
      expect(config.active).to.be.true;
      expect(config.soulbound).to.be.true;
    });

    it("Should enforce soulbound tokens", async function () {
      const { nft, owner, user } = await loadFixture(deployNFTFixture);
      
      // Configure tokens to be soulbound
      await nft.connect(owner).configureToken(
        1000n, // maxSupply
        ethers.parseEther("0.1"), // price
        false, // allowlistRequired
        true, // active
        true // soulbound
      );
      
      // Mint a token
      await nft.connect(user).mint(user.address, "0x", {
        value: ethers.parseEther("0.1")
      });
      
      // Try to transfer the token
      await expect(
        nft.connect(user).transferFrom(user.address, owner.address, 1)
      ).to.be.revertedWithCustomError(nft, "TokenIsSoulbound");
    });

    it("Should allow admin to pause and unpause", async function () {
      const { nft, owner } = await loadFixture(deployNFTFixture);
      
      // Pause
      await nft.connect(owner).pause();
      expect(await nft.paused()).to.be.true;
      
      // Unpause
      await nft.connect(owner).unpause();
      expect(await nft.paused()).to.be.false;
    });

    it("Should allow treasury to withdraw funds", async function () {
      const { nft, user, treasury } = await loadFixture(deployNFTFixture);
      
      // Mint a token to generate funds
      await nft.connect(user).mint(user.address, "0x", {
        value: ethers.parseEther("0.1")
      });
      
      // Check the initial balance
      const initialBalance = await ethers.provider.getBalance(treasury.address);
      
      // Withdraw funds
      await nft.connect(treasury).withdraw();
      
      // Check the final balance
      const finalBalance = await ethers.provider.getBalance(treasury.address);
      
      // The final balance should be greater than the initial balance
      expect(finalBalance).to.be.gt(initialBalance);
    });
  });

  describe("Signature Minting", function () {
    it("Should mint with valid signature when allowlist is required", async function () {
      const { nft, owner, signer, user } = await loadFixture(deployNFTFixture);
      
      // Configure token to require allowlist
      await nft.connect(owner).configureToken(
        1000n, // maxSupply
        ethers.parseEther("0.1"), // price
        true, // allowlistRequired
        true, // active
        false // soulbound
      );
      
      // Get the domain and nonce
      const domain = {
        name: await nft.name(),
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await nft.getAddress()
      };
      
      const nonce = await nft.nonces(user.address);
      const salt = ethers.id("Blockus721MintAuthorizationSignature");
      
      // Create the typed data
      const types = {
        MintAuthorization: [
          { name: "minter", type: "address" },
          { name: "to", type: "address" },
          { name: "salt", type: "bytes32" },
          { name: "nonce", type: "uint256" },
          { name: "chainId", type: "uint256" },
          { name: "contractAddress", type: "address" }
        ]
      };
      
      const value = {
        minter: user.address,
        to: user.address,
        salt: salt,
        nonce: nonce,
        chainId: domain.chainId,
        contractAddress: domain.verifyingContract
      };
      
      // Sign with the authorized signer
      const signature = await signer.signTypedData(domain, types, value);
      
      // Mint with the signature
      await nft.connect(user).mint(user.address, signature, {
        value: ethers.parseEther("0.1")
      });
      
      // Check the token owner
      expect(await nft.ownerOf(1)).to.equal(user.address);
    });
  });
});