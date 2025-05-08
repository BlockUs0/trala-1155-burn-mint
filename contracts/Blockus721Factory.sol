// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "./Blockus721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

// Factory for deploying Blockus721 NFT contracts
contract Blockus721Factory is Ownable, ERC2771Context {
    // Custom errors
    error DeploymentFailed();

    struct DeploymentConfig {
        string name;
        string symbol;
        string baseURI;
        address treasury;
        address signer;
        Blockus721.TokenConfig tokenConfig;
    }

    // Trusted forwarder for meta transactions (stored locally)
    address private _customTrustedForwarder;

    // Array to track all deployed contracts
    address[] public deployedContracts;

    event ContractDeployed(address indexed contractAddress, string name, string symbol, address indexed deployer);
    event TrustedForwarderUpdated(address indexed oldForwarder, address indexed newForwarder);

    // constructor(address _trustedForwarder) ERC2771Context(_trustedForwarder) Ownable(msg.sender) {
    //     _customTrustedForwarder = _trustedForwarder;
    // }

    constructor(address trustedForwarder) ERC2771Context(trustedForwarder) Ownable(msg.sender) {
        _customTrustedForwarder = trustedForwarder;
    }


    function deployNFT(DeploymentConfig calldata config) external returns (address) {
        Blockus721 nft = new Blockus721(
            config.name,
            config.symbol,
            config.baseURI,
            config.treasury,
            config.signer,
            _customTrustedForwarder,
            config.tokenConfig
        );

        address nftAddress = address(nft);
        if (nftAddress == address(0)) {
            revert DeploymentFailed();
        }

        // Transfer ownership to the deployer
        nft.grantRole(nft.DEFAULT_ADMIN_ROLE(), _msgSender());
        nft.grantRole(nft.ADMIN_ROLE(), _msgSender());

        // Add to deployed contracts array
        deployedContracts.push(nftAddress);

        emit ContractDeployed(nftAddress, config.name, config.symbol, _msgSender());

        return nftAddress;
    }

    function setTrustedForwarder(address newTrustedForwarder) external onlyOwner {
        address oldForwarder = _customTrustedForwarder;
        _customTrustedForwarder = newTrustedForwarder;
        emit TrustedForwarderUpdated(oldForwarder, newTrustedForwarder);
    }
    
    /**
     * @dev Get the trusted forwarder address
     * @return The trusted forwarder address
     */
    function getTrustedForwarder() external view returns (address) {
        return _customTrustedForwarder;
    }

    function getDeployedContracts() external view returns (address[] memory) {
        return deployedContracts;
    }

    function getDeployedContractsCount() external view returns (uint256) {
        return deployedContracts.length;
    }

    function _msgSender() internal view override(Context, ERC2771Context) returns (address) {
        return ERC2771Context._msgSender();
    }

    function _msgData() internal view override(Context, ERC2771Context) returns (bytes calldata) {
        return ERC2771Context._msgData();
    }
    
    /**
     * @dev Override for _contextSuffixLength to resolve conflict between Context and ERC2771Context
     */
    function _contextSuffixLength() internal view virtual override(Context, ERC2771Context) returns (uint256) {
        return ERC2771Context._contextSuffixLength();
    }
}