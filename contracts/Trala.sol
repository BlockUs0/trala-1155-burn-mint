// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TralaNFT
 * @dev Implementation of the Trala Platform NFT system with multiple token grades
 * and configurable parameters for each grade.
 */
contract TralaNFT is ERC1155, ERC1155Supply, ERC1155Burnable, AccessControl, Pausable, ReentrancyGuard {
    // Custom errors
    error TokenNotActive(uint256 tokenId);
    error InsufficientPayment(uint256 required, uint256 sent);
    error ExceedsMaxSupply(uint256 tokenId, uint256 maxSupply, uint256 currentSupply, uint256 requestedAmount);
    error SignatureRequired();
    error InvalidSignature();
    error TokenIsSoulbound(uint256 tokenId);
    error NoFundsToWithdraw();
    error WithdrawalFailed();

    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");

    string public name;
    string public symbol;

    // Token configuration
    struct TokenConfig {
        string name;        // Grade name (A, S, SS, SSS, B, C)
        uint256 maxSupply;  // Maximum supply (0 = unlimited)
        uint256 price;      // Price in wei
        bool allowlistRequired; // Whether allowlist is required for minting
        bool active;        // Whether token is currently mintable
        bool soulbound;     // Whether token is soulbound (non-transferable)
    }

    // Mapping from token ID to its configuration
    mapping(uint256 => TokenConfig) public tokenConfigs;

    // Array to track all created token IDs
    uint256[] private _tokenIds;

    // Mapping to track used signatures
    mapping(bytes => bool) private _usedSignatures;

    // Mapping to track nonces per address for signature verification
    mapping(address => uint256) private _nonces;

    // Events
    event TokenConfigured(uint256 indexed tokenId, string name, uint256 maxSupply, uint256 price, bool allowlistRequired, bool active, bool soulbound);
    event TokenMinted(address indexed to, uint256 indexed tokenId, uint256 amount);
    event WithdrawFunds(address indexed to, uint256 amount);

    /**
     * @dev Constructor
     * @param _name Collection name
     * @param _symbol Collection symbol
     * @param _uri Base URI for token metadata
     * @param _initialTreasury Address to be granted admin role
     * @param _initialSigner Address to be granted signer role
     */
    constructor(
        string memory _name,
        string memory _symbol,
        string memory _uri,
        address _initialTreasury,
        address _initialSigner
    ) ERC1155(_uri) {
        name = _name;
        symbol = _symbol;

        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(TREASURY_ROLE, _initialTreasury);
        _grantRole(SIGNER_ROLE, _initialSigner);
    }

    /**
     * @dev Creates a new token type with specified configuration
     * @param tokenId ID of the token to configure
     * @param _name Name of the token grade
     * @param _maxSupply Maximum supply (0 for unlimited)
     * @param _price Price in wei
     * @param _allowlistRequired Whether allowlist is required
     * @param _active Whether the token is active for minting
     * @param _soulbound Whether the token is non-transferable
     */
    function configureToken(
        uint256 tokenId,
        string memory _name,
        uint256 _maxSupply,
        uint256 _price,
        bool _allowlistRequired,
        bool _active,
        bool _soulbound
    ) external onlyRole(ADMIN_ROLE) {
        // Check if this is a new token ID
        if (bytes(tokenConfigs[tokenId].name).length == 0) {
            _tokenIds.push(tokenId);
        }

        // Set the token configuration
        tokenConfigs[tokenId] = TokenConfig({
            name: _name,
            maxSupply: _maxSupply,
            price: _price,
            allowlistRequired: _allowlistRequired,
            active: _active,
            soulbound: _soulbound
        });

        emit TokenConfigured(tokenId, _name, _maxSupply, _price, _allowlistRequired, _active, _soulbound);
    }

    /**
     * @dev Returns the current nonce for an address
     * @param owner Address to get nonce for
     */
    function nonces(address owner) public view returns (uint256) {
        return _nonces[owner];
    }

    /**
     * @dev Unified mint function that handles both public and allowlist minting
     * @param to Recipient address
     * @param tokenId Token ID to mint
     * @param amount Amount to mint
     * @param signature Signature for allowlist authorization (can be empty for public minting)
     */
    function mint(
        address to,
        uint256 tokenId,
        uint256 amount,
        bytes calldata signature
    ) external payable nonReentrant whenNotPaused {
        TokenConfig memory config = tokenConfigs[tokenId];

        // Validations
        if (!config.active) {
            revert TokenNotActive(tokenId);
        }

        if (msg.value < config.price * amount) {
            revert InsufficientPayment(config.price * amount, msg.value);
        }

        // Check max supply
        if (config.maxSupply > 0) {
            uint256 currentSupply = totalSupply(tokenId);
            if (currentSupply + amount > config.maxSupply) {
                revert ExceedsMaxSupply(tokenId, config.maxSupply, currentSupply, amount);
            }
        }

        // If allowlist is required, verify signature
        if (config.allowlistRequired) {
            if (signature.length == 0) {
                revert SignatureRequired();
            }

            // Create message hash matching backend format
            bytes32 salt = keccak256("0x");
            bytes32 messageHash = keccak256(
                abi.encode(
                    msg.sender,           // minter
                    to,                   // to
                    tokenId,              // tokenId
                    amount,               // quantity
                    salt,                 // salt
                    _nonces[msg.sender],  // nonce
                    block.chainid,        // chainId
                    address(this)         // contractAddress
                )
            );

            // Verify the signature came from a valid signer
            bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
            address signer = ECDSA.recover(ethSignedMessageHash, signature);
            if (!hasRole(SIGNER_ROLE, signer)) {
                revert InvalidSignature();
            }

            // Increment nonce to prevent signature reuse
            _nonces[msg.sender]++;
        }

        // Mint tokens
        _mint(to, tokenId, amount, "");

        emit TokenMinted(to, tokenId, amount);
    }

    /**
     * @dev Override _update to implement ERC1155Supply and soulbound functionality
     */
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal virtual override(ERC1155, ERC1155Supply) {
        // Skip checks for minting (from = address(0)) and burning (to = address(0))
        if (from != address(0) && to != address(0)) {
            for (uint256 i = 0; i < ids.length; i++) {
                // Check if the token is soulbound
                if (tokenConfigs[ids[i]].soulbound) {
                    revert TokenIsSoulbound(ids[i]);
                }
            }
        }

        super._update(from, to, ids, values);
    }

    /**
     * @dev Sets the base URI for all token types
     * @param newuri New base URI
     */
    function setURI(string memory newuri) external onlyRole(ADMIN_ROLE) {
        _setURI(newuri);
    }

    /**
     * @dev Sets the active status of a token
     * @param tokenId Token ID
     * @param active Whether the token is active
     */
    function setTokenActive(uint256 tokenId, bool active) external onlyRole(ADMIN_ROLE) {
        tokenConfigs[tokenId].active = active;
    }

    /**
     * @dev Sets whether a token requires allowlist
     * @param tokenId Token ID
     * @param required Whether allowlist is required
     */
    function setAllowlistRequired(uint256 tokenId, bool required) external onlyRole(ADMIN_ROLE) {
        tokenConfigs[tokenId].allowlistRequired = required;
    }

    /**
     * @dev Updates the price of a token
     * @param tokenId Token ID
     * @param price New price in wei
     */
    function setTokenPrice(uint256 tokenId, uint256 price) external onlyRole(ADMIN_ROLE) {
        tokenConfigs[tokenId].price = price;
    }

    /**
     * @dev Gets all token IDs
     * @return Array of token IDs
     */
    function getAllTokenIds() external view returns (uint256[] memory) {
        return _tokenIds;
    }

    /**
     * @dev Pauses all token minting
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses token minting
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Withdraws funds to the contract owner
     */
    function withdraw() external onlyRole(TREASURY_ROLE) {
        uint256 balance = address(this).balance;
        if (balance == 0) {
            revert NoFundsToWithdraw();
        }

        (bool success, ) = payable(msg.sender).call{value: balance}("");
        if (!success) {
            revert WithdrawalFailed();
        }

        emit WithdrawFunds(msg.sender, balance);
    }

    /**
     * @dev Required override to support ERC1155Supply
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}