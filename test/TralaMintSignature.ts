import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("TralaNFT Signature Minting", function () {
  async function deployTralaNFTFixture() {
    const name = "Trala NFT";
    const symbol = "TRALA";
    const baseURI = "https://api.trala.com/metadata/";
    const [owner, signer, minter] = await hre.ethers.getSigners();
    const authority = "0x67C9Ce97D99cCb55B58Fc5502C3dE426101095Af";

    const TralaNFT = await hre.ethers.getContractFactory("TralaNFT");
    const nft = await TralaNFT.deploy(
      name,
      symbol,
      baseURI,
      owner.address,
      signer.address,
      // authority
    );

    // Configure token with allowlist required
    const tokenId = 1;
    await nft.connect(owner).configureToken(
      tokenId,
      "Allowlisted Token",
      100n, // maxSupply
      ethers.parseEther("0.1"), // price
      true, // allowlistRequired
      true, // active
      false, // soulbound
    );

    return { nft, name, symbol, owner, signer, minter, tokenId, authority };
  }

  describe("Signature Verification", function () {
    it("Should mint with valid API signature", async function () {
      const { nft, minter, tokenId } = await loadFixture(deployTralaNFTFixture);

      // Get contract address for API signature generation
      const contractAddress = await nft.getAddress();
      console.log(
        "Contract address for API signature:",
        contractAddress,
        minter.address,
      );

      // This is where you'll paste your API signature generated with the above address
      const apiSignature =
        "0x53d9278146bd2409a5fd912f2bb6beb7554a6523e4e46d6c04a3810d037128a93552fc4b36293fec810efe1c67651c47ade01c157267ed1fd3d5dbf033a841d81c";

      // Attempt to mint with the API signature
      await expect(
        nft.connect(minter).mint(
          minter.address,
          tokenId,
          1, // quantity
          apiSignature,
          { value: ethers.parseEther("0.1") },
        ),
      )
        .to.emit(nft, "TokenMinted")
        .withArgs(minter.address, tokenId, 1);
    });

    it("Should generate and verify signature manually", async function () {
      const { nft, signer, minter, tokenId } = await loadFixture(
        deployTralaNFTFixture,
      );

      const domain = await nft.eip712Domain();
      const nonce = await nft.nonces(minter.address);
      const salt = ethers.id("BlockusMintAuthorizationSignature");
      const chainId = (await ethers.provider.getNetwork()).chainId;
      const contractAddress = await nft.getAddress();

      // Create the typed data
      const types = {
        MintAuthorization: [
          { name: "minter", type: "address" },
          { name: "to", type: "address" },
          { name: "tokenId", type: "uint256" },
          { name: "quantity", type: "uint256" },
          { name: "salt", type: "bytes32" },
          { name: "nonce", type: "uint256" },
          { name: "chainId", type: "uint256" },
          { name: "contractAddress", type: "address" },
        ],
      };

      const value = {
        minter: minter.address,
        to: minter.address,
        tokenId: tokenId,
        quantity: 1n,
        salt: salt,
        nonce: nonce,
        chainId: chainId,
        contractAddress: contractAddress,
      };

      console.log({ value, domain });

      // Sign with the authorized signer
      const signature = await signer.signTypedData(
        {
          name: domain.name,
          version: domain.version,
          chainId: chainId,
          verifyingContract: contractAddress,
        },
        types,
        value,
      );

      // Mint with the generated signature
      await expect(
        nft.connect(minter).mint(minter.address, tokenId, 1, signature, {
          value: ethers.parseEther("0.1"),
        }),
      )
        .to.emit(nft, "TokenMinted")
        .withArgs(minter.address, tokenId, 1);
    });
  });
});
