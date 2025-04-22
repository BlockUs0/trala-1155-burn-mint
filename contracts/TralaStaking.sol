// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "./Trala.sol";

contract TralaNFTStaking is ERC1155Holder, AccessControl, Pausable, ReentrancyGuard {
    // Custom Errors
    error ZeroAmount();
    error ZeroAddress();
    error InsufficientStakedAmount();
    error NoTokensStaked();
    error InvalidERC1155Interface();

    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Contract references
    TralaNFT public nftContract;

    // Mapping of user address to the amount of tokens they have staked for each token ID
    mapping(address => mapping(uint256 => uint256)) public stakedAmounts;

    // Events
    event TokenStaked(address indexed user, uint256 indexed tokenId, uint256 amount, uint256 timestamp);
    event TokenUnstaked(address indexed user, uint256 indexed tokenId, uint256 amount, uint256 timestamp);
    event ContractPaused(address indexed admin);
    event ContractUnpaused(address indexed admin);
    event EmergencyUnstake(address indexed admin, address indexed user, uint256 indexed tokenId, uint256 amount);

    constructor(address nftAddress, address admin) {
        if(nftAddress == address(0)) revert ZeroAddress();
        if(admin == address(0)) revert ZeroAddress();

        // Check that the contract supports the ERC1155 interface
        if(!IERC165(nftAddress).supportsInterface(type(IERC1155).interfaceId)) {
            revert InvalidERC1155Interface();
        }

        nftContract = TralaNFT(nftAddress);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    // User functions

    /**
     * @notice Stake tokens into the contract
     * @param tokenId The ID of the token to stake
     * @param amount The amount to stake
     */
    function stake(uint256 tokenId, uint256 amount) external whenNotPaused nonReentrant {
        if(amount == 0) revert ZeroAmount();

        // Transfer tokens to this contract
        nftContract.safeTransferFrom(
            msg.sender,
            address(this),
            tokenId,
            amount,
            ""
        );

        // Update staking record
        stakedAmounts[msg.sender][tokenId] += amount;

        emit TokenStaked(msg.sender, tokenId, amount, block.timestamp);
    }

    /**
     * @notice Unstake tokens from the contract
     * @param tokenId The ID of the token to unstake
     * @param amount The amount to unstake
     */
    function unstake(uint256 tokenId, uint256 amount) external whenNotPaused nonReentrant {
        if(amount == 0) revert ZeroAmount();
        if(stakedAmounts[msg.sender][tokenId] < amount) revert InsufficientStakedAmount();

        // Update staking record
        stakedAmounts[msg.sender][tokenId] -= amount;

        // Transfer tokens back to user
        nftContract.safeTransferFrom(
            address(this),
            msg.sender,
            tokenId,
            amount,
            ""
        );

        emit TokenUnstaked(msg.sender, tokenId, amount, block.timestamp);
    }

    /**
     * @notice Get staked amount for a specific token ID
     * @param user The address to query
     * @param tokenId The token ID to check
     * @return The amount staked
     */
    function getStakedAmount(address user, uint256 tokenId) external view returns (uint256) {
        return stakedAmounts[user][tokenId];
    }

    // Admin functions

    /**
     * @notice Emergency withdraw function to return NFTs to their owners
     * @param tokenId The token ID to rescue
     * @param user The user to return tokens to
     */
    function emergencyUnstake(uint256 tokenId, address user) external onlyRole(ADMIN_ROLE) {
        uint256 amount = stakedAmounts[user][tokenId];
        if(amount == 0) revert NoTokensStaked();

        // Clear staking data
        delete stakedAmounts[user][tokenId];

        // Return tokens to user
        nftContract.safeTransferFrom(
            address(this),
            user,
            tokenId,
            amount,
            ""
        );

        emit TokenUnstaked(user, tokenId, amount, block.timestamp);
        emit EmergencyUnstake(msg.sender, user, tokenId, amount);
    }

    /**
     * @notice Pause the contract
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
        emit ContractPaused(msg.sender);
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
        emit ContractUnpaused(msg.sender);
    }

    // Required overrides
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155Holder, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}