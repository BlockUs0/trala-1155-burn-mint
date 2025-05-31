import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("BlockusNFTStaking", function () {
  // Fixture to deploy contracts for testing
  async function deployStakingFixture() {
    const [owner, admin, user] = await hre.ethers.getSigners();

    // Deploy BlockusNFT contract
    const name = "Blockus NFT";
    const symbol = "BLOCKUS";
    const baseURI = "https://api.blockus.com/metadata/";
    
    const BlockusNFTFactory = await hre.ethers.getContractFactory("BlockusNFT");
    const blockusNFT = await BlockusNFTFactory.deploy(
      name,
      symbol,
      baseURI,
      owner.address, // treasury
      owner.address  // signer
    );

    // Configure a token for testing
    const tokenId = 1;
    await blockusNFT.configureToken(
      tokenId,
      "Test Token",
      1000n, // maxSupply
      0, // price (free)
      false, // allowlistRequired (false for easier testing)
      true, // active
      false // soulbound
    );

    // Deploy staking contract
    const BlockusNFTStakingFactory = await hre.ethers.getContractFactory("BlockusNFTStaking");
    const staking = await BlockusNFTStakingFactory.deploy(
      await blockusNFT.getAddress(),
      admin.address // Admin is now the owner
    );

    return { staking, blockusNFT, owner, admin, user, tokenId };
  }

  describe("Deployment", function () {
    it("Should set the right NFT contract address", async function () {
      const { staking, blockusNFT } = await loadFixture(deployStakingFixture);
      expect(await staking.nftContract()).to.equal(await blockusNFT.getAddress());
    });

    it("Should set the right owner", async function () {
      const { staking, admin } = await loadFixture(deployStakingFixture);
      expect(await staking.owner()).to.equal(admin.address);
    });

    it("Should start unpaused", async function () {
      const { staking } = await loadFixture(deployStakingFixture);
      expect(await staking.paused()).to.be.false;
    });
  });

  describe("Staking", function () {
    it("Should allow staking tokens", async function () {
      const { staking, blockusNFT, user, tokenId, owner } = await loadFixture(deployStakingFixture);
      const amount = 5;

      // Mint tokens to user
      await blockusNFT.connect(owner).mint(user.address, tokenId, amount, "0x");

      // Approve staking contract
      await blockusNFT.connect(user).setApprovalForAll(await staking.getAddress(), true);

      // Stake tokens and check for event
      const stakeTx = await staking.connect(user).stake(tokenId, amount);
      
      // Wait for transaction to be mined
      const receipt = await stakeTx.wait();
      
      // Check staked amount
      expect(await staking.getStakedAmount(user.address, tokenId)).to.equal(amount);
      
      // Check NFT balance of staking contract
      expect(await blockusNFT.balanceOf(await staking.getAddress(), tokenId)).to.equal(amount);
      
      // Verify TokenStaked event was emitted with correct parameters
      await expect(stakeTx)
        .to.emit(staking, "TokenStaked")
        .withArgs(user.address, tokenId, amount, await time.latest());
    });

    it("Should allow unstaking tokens", async function () {
      const { staking, blockusNFT, user, tokenId, owner } = await loadFixture(deployStakingFixture);
      const amount = 5;

      // Mint tokens to user
      await blockusNFT.connect(owner).mint(user.address, tokenId, amount, "0x");

      // Approve staking contract
      await blockusNFT.connect(user).setApprovalForAll(await staking.getAddress(), true);

      // Stake tokens
      await staking.connect(user).stake(tokenId, amount);
      
      // Initial balance check
      expect(await staking.getStakedAmount(user.address, tokenId)).to.equal(amount);

      // Unstake tokens and check for event
      const unstakeTx = await staking.connect(user).unstake(tokenId, amount);
      
      // Wait for transaction to be mined
      const receipt = await unstakeTx.wait();

      // Check staked amount is zero
      expect(await staking.getStakedAmount(user.address, tokenId)).to.equal(0);
      
      // Check NFT returned to user
      expect(await blockusNFT.balanceOf(user.address, tokenId)).to.equal(amount);
      
      // Verify TokenUnstaked event was emitted with correct parameters
      await expect(unstakeTx)
        .to.emit(staking, "TokenUnstaked")
        .withArgs(user.address, tokenId, amount, await time.latest());
    });
  });

  describe("Owner Functions", function () {
    it("Should allow owner to pause and unpause", async function () {
      const { staking, admin } = await loadFixture(deployStakingFixture);

      // Pause
      await staking.connect(admin).pause();
      expect(await staking.paused()).to.be.true;

      // Unpause
      await staking.connect(admin).unpause();
      expect(await staking.paused()).to.be.false;
    });

    it("Should allow owner to emergency unstake", async function () {
      const { staking, blockusNFT, user, tokenId, owner, admin } = await loadFixture(deployStakingFixture);
      const amount = 5;

      // Mint tokens to user
      await blockusNFT.connect(owner).mint(user.address, tokenId, amount, "0x");

      // Approve staking contract
      await blockusNFT.connect(user).setApprovalForAll(await staking.getAddress(), true);

      // Stake tokens
      await staking.connect(user).stake(tokenId, amount);
      
      // Initial balance check
      expect(await staking.getStakedAmount(user.address, tokenId)).to.equal(amount);

      // Emergency unstake by admin (now owner)
      await staking.connect(admin).emergencyUnstake(tokenId, user.address);

      // Check staked amount is zero
      expect(await staking.getStakedAmount(user.address, tokenId)).to.equal(0);
      
      // Check NFT returned to user
      expect(await blockusNFT.balanceOf(user.address, tokenId)).to.equal(amount);
    });
    
    it("Should revert when non-owner tries to pause", async function () {
      const { staking, user } = await loadFixture(deployStakingFixture);
      
      // Try to pause as non-owner
      await expect(staking.connect(user).pause()).to.be.revertedWithCustomError(
        staking,
        "OwnableUnauthorizedAccount"
      ).withArgs(user.address);
    });

    it("Should allow owner to update NFT address", async function () {
      const { staking, admin, owner } = await loadFixture(deployStakingFixture);
      
      // Deploy a new BlockusNFT contract to use as the new address
      const newNftFactory = await hre.ethers.getContractFactory("BlockusNFT");
      const newNft = await newNftFactory.deploy(
        "New Blockus NFT",
        "BNFT",
        "https://api.blockus.com/new-metadata/",
        owner.address, // treasury
        owner.address  // signer
      );
      
      const oldNftAddress = await staking.nftContract();
      const newNftAddress = await newNft.getAddress();
      
      // Update NFT address as admin (now owner) and check for event
      const updateTx = await staking.connect(admin).updateNftAddress(newNftAddress);
      
      // Verify the address was updated
      expect(await staking.nftContract()).to.equal(newNftAddress);
      expect(await staking.nftContract()).to.not.equal(oldNftAddress);
      
      // Verify NFTAddressUpdated event was emitted with correct parameters
      await expect(updateTx)
        .to.emit(staking, "NFTAddressUpdated")
        .withArgs(admin.address, oldNftAddress, newNftAddress);
    });
    
    it("Should revert when non-owner tries to update NFT address", async function () {
      const { staking, blockusNFT, user } = await loadFixture(deployStakingFixture);
      
      // Try to update NFT address as non-owner
      await expect(staking.connect(user).updateNftAddress(await blockusNFT.getAddress()))
        .to.be.revertedWithCustomError(staking, "OwnableUnauthorizedAccount")
        .withArgs(user.address);
    });

    it("Should allow ownership transfer", async function () {
      const { staking, admin, user } = await loadFixture(deployStakingFixture);
      
      // Transfer ownership from admin to user
      await staking.connect(admin).transferOwnership(user.address);
      
      // Verify the ownership was transferred
      expect(await staking.owner()).to.equal(user.address);
      
      // Verify new owner can perform admin functions
      await staking.connect(user).pause();
      expect(await staking.paused()).to.be.true;
    });
  });
});