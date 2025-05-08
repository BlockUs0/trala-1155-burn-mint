// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

/**
 * @title Blockus721
 * @dev ERC721 with soulbound capability, meta transactions, and configurable metadata
 */
contract Blockus721 is
    ERC721,
    ERC721Enumerable,
    AccessControl,
    Pausable,
    ReentrancyGuard,
    EIP712,
    ERC2771Context
{
    // Custom errors (simplified)
    error TokenError(uint8 code); // 1=NotActive, 2=InsufficientPayment, 3=ExceedsMaxSupply, 4=SignatureRequired, 5=InvalidSignature, 6=Soulbound, 7=NoFunds, 8=WithdrawalFailed, 9=DoesNotExist

    bytes32 private constant MINT_TYPEHASH =
        keccak256("MintAuthorization(address minter,address to,bytes32 salt,uint256 nonce,uint256 chainId,address contractAddress)");

    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");

    // Token configuration
    struct TokenConfig {
        uint256 maxSupply;      // Maximum supply (0 = unlimited)
        uint256 price;          // Price in wei
        bool allowlistRequired; // Whether allowlist is required for minting
        bool active;            // Whether token is currently mintable
        bool soulbound;         // Whether token is soulbound (non-transferable)
    }

    // Token configuration
    TokenConfig public tokenConfig;
    
    // Base URI for token metadata
    string private _baseTokenURI;
    
    // Mapping to track soulbound status per token
    mapping(uint256 => bool) public isSoulbound;
    
    // Mapping to track used signatures
    mapping(bytes => bool) private _usedSignatures;
    
    // Mapping to track nonces per address for signature verification
    mapping(address => uint256) private _nonces;
    
    // Current token ID counter
    uint256 private _currentTokenId;

    // Events
    event TokenConfigured(uint256 maxSupply, uint256 price, bool allowlistRequired, bool active, bool soulbound);
    event TokenMinted(address indexed to, uint256 indexed tokenId);
    event WithdrawFunds(address indexed to, uint256 amount);

    // Constructor
    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        address initialTreasury,
        address initialSigner,
        address trustedForwarder,
        TokenConfig memory config
    ) ERC721(name_, symbol_) EIP712(name_, "1") ERC2771Context(trustedForwarder) {
        _baseTokenURI = baseURI_;
        _grantRole(ADMIN_ROLE, _msgSender());
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(TREASURY_ROLE, initialTreasury);
        _grantRole(SIGNER_ROLE, initialSigner);
        tokenConfig = config;
        emit TokenConfigured(config.maxSupply, config.price, config.allowlistRequired, config.active, config.soulbound);
    }

    // Configure token parameters
    function configureToken(
        uint256 maxSupply,
        uint256 price,
        bool allowlistRequired,
        bool active,
        bool soulbound
    ) external onlyRole(ADMIN_ROLE) {
        tokenConfig = TokenConfig({
            maxSupply: maxSupply,
            price: price,
            allowlistRequired: allowlistRequired,
            active: active,
            soulbound: soulbound
        });
        
        emit TokenConfigured(maxSupply, price, allowlistRequired, active, soulbound);
    }

    // Returns the current nonce for an address
    function nonces(address owner) public view returns (uint256) {
        return _nonces[owner];
    }

    // Mint a new token
    function mint(
        address to,
        bytes calldata signature
    ) external payable nonReentrant whenNotPaused returns (uint256) {
        TokenConfig memory config = tokenConfig;
        
        // Validations
        if (!config.active) revert TokenError(1);
        if (msg.value < config.price) revert TokenError(2);
        
        // Check max supply
        if (config.maxSupply > 0 && totalSupply() >= config.maxSupply) {
            revert TokenError(3);
        }
        
        // If allowlist is required, verify signature
        if (config.allowlistRequired) {
            if (signature.length == 0) revert TokenError(4);
            
            uint256 nonce = _nonces[_msgSender()];
            bytes32 salt = keccak256(bytes("Blockus721MintAuthorizationSignature"));
            
            bytes32 structHash = keccak256(
                abi.encode(
                    MINT_TYPEHASH,
                    _msgSender(),
                    to,
                    salt,
                    nonce,
                    block.chainid,
                    address(this)
                )
            );
            
            address signer = ECDSA.recover(_hashTypedDataV4(structHash), signature);
            
            if (!hasRole(SIGNER_ROLE, signer)) revert TokenError(5);
            
            _nonces[_msgSender()]++;
        }
        
        // Mint token
        _currentTokenId++;
        uint256 tokenId = _currentTokenId;
        
        _safeMint(to, tokenId);
        
        // Set soulbound status if configured
        if (config.soulbound) {
            isSoulbound[tokenId] = true;
        }
        
        emit TokenMinted(to, tokenId);
        
        return tokenId;
    }

    // Sets the base URI for token metadata
    function setBaseURI(string memory newBaseURI) external onlyRole(ADMIN_ROLE) {
        _baseTokenURI = newBaseURI;
    }

    // Sets the active status of token minting
    function setActive(bool active) external onlyRole(ADMIN_ROLE) {
        tokenConfig.active = active;
    }

    // Sets whether a token requires allowlist
    function setAllowlistRequired(bool required) external onlyRole(ADMIN_ROLE) {
        tokenConfig.allowlistRequired = required;
    }

    // Updates the price of a token
    function setPrice(uint256 price) external onlyRole(ADMIN_ROLE) {
        tokenConfig.price = price;
    }

    // Sets the soulbound status of a specific token
    function setTokenSoulbound(uint256 tokenId, bool soulbound) external onlyRole(ADMIN_ROLE) {
        if (_ownerOf(tokenId) == address(0)) revert TokenError(9);
        isSoulbound[tokenId] = soulbound;
    }

    // Sets the default soulbound status for new tokens
    function setDefaultSoulbound(bool soulbound) external onlyRole(ADMIN_ROLE) {
        tokenConfig.soulbound = soulbound;
    }

    // Pauses all token minting
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    // Unpauses token minting
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // Withdraws funds to the treasury
    function withdraw() external onlyRole(TREASURY_ROLE) {
        uint256 balance = address(this).balance;
        if (balance == 0) revert TokenError(7);

        (bool success, ) = payable(_msgSender()).call{value: balance}("");
        if (!success) revert TokenError(8);

        emit WithdrawFunds(_msgSender(), balance);
    }

    // Base URI for computing {tokenURI}
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    // Override for _update to handle soulbound tokens and implement ERC721Enumerable
    function _update(address to, uint256 tokenId, address auth) internal virtual override(ERC721, ERC721Enumerable) returns (address) {
        address from = _ownerOf(tokenId);
        
        // Skip checks for minting/burning
        if (from != address(0) && to != address(0) && isSoulbound[tokenId]) {
            revert TokenError(6);
        }
        
        // Call the parent implementation
        return super._update(to, tokenId, auth);
    }
    
    // Override for _increaseBalance to implement ERC721Enumerable
    function _increaseBalance(address account, uint128 value) internal virtual override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    // Override for ERC2771Context's _msgSender() function
    function _msgSender() internal view override(Context, ERC2771Context) returns (address) {
        return ERC2771Context._msgSender();
    }

    // Override for ERC2771Context's _msgData() function
    function _msgData() internal view override(Context, ERC2771Context) returns (bytes calldata) {
        return ERC2771Context._msgData();
    }
    
    // Override for _contextSuffixLength to resolve conflict
    function _contextSuffixLength() internal view virtual override(Context, ERC2771Context) returns (uint256) {
        return ERC2771Context._contextSuffixLength();
    }

    // Required override to support ERC721Enumerable
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}