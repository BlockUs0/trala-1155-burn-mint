// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

/**
 * @title Blockus721Simple
 * @dev Simplified ERC721 with soulbound capability and meta transactions
 */
contract Blockus721Simple is ERC721, ERC721Enumerable, Ownable, Pausable, ERC2771Context {
    // Base URI for token metadata
    string private _baseTokenURI;
    
    // Whether tokens are soulbound (non-transferable)
    bool public soulbound;
    
    // Current token ID counter
    uint256 private _currentTokenId;

    // Events
    event TokenMinted(address indexed to, uint256 indexed tokenId);
    event BaseURIUpdated(string newBaseURI);

    /**
     * @dev Constructor
     * @param name_ Collection name
     * @param symbol_ Collection symbol
     * @param baseURI_ Base URI for token metadata
     * @param initialOwner Address of the initial owner
     * @param trustedForwarder Address of the trusted forwarder for meta transactions
     * @param isSoulbound Whether tokens are soulbound (non-transferable)
     */
    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        address initialOwner,
        address trustedForwarder,
        bool isSoulbound
    ) ERC721(name_, symbol_) Ownable(initialOwner) ERC2771Context(trustedForwarder) {
        _baseTokenURI = baseURI_;
        soulbound = isSoulbound;
    }

    /**
     * @dev Mint a new token
     * @param to Recipient address
     * @return The ID of the minted token
     */
    function mint(address to) external onlyOwner whenNotPaused returns (uint256) {
        _currentTokenId++;
        uint256 tokenId = _currentTokenId;
        
        _safeMint(to, tokenId);
        
        emit TokenMinted(to, tokenId);
        
        return tokenId;
    }

    /**
     * @dev Batch mint multiple tokens
     * @param to Recipient address
     * @param amount Number of tokens to mint
     * @return Array of minted token IDs
     */
    function batchMint(address to, uint256 amount) external onlyOwner whenNotPaused returns (uint256[] memory) {
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= 100, "Cannot mint more than 100 tokens at once");
        
        uint256[] memory tokenIds = new uint256[](amount);
        
        for (uint256 i = 0; i < amount; i++) {
            _currentTokenId++;
            uint256 tokenId = _currentTokenId;
            
            _safeMint(to, tokenId);
            tokenIds[i] = tokenId;
            
            emit TokenMinted(to, tokenId);
        }
        
        return tokenIds;
    }

    /**
     * @dev Sets the base URI for token metadata
     * @param newBaseURI New base URI
     */
    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    /**
     * @dev Sets whether tokens are soulbound
     * @param isSoulbound Whether tokens are soulbound
     */
    function setSoulbound(bool isSoulbound) external onlyOwner {
        soulbound = isSoulbound;
    }

    /**
     * @dev Pauses all token minting and transfers
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses token minting and transfers
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Base URI for computing {tokenURI}
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Hook that is called before any token transfer
     */
    function _update(address from, uint256 tokenId, address to) internal virtual override(ERC721, ERC721Enumerable) whenNotPaused returns (address) {
        // Skip checks for minting (from = address(0)) and burning (to = address(0))
        if (from != address(0) && to != address(0) && soulbound) {
            revert("Token is soulbound");
        }
        
        return super._update(from, tokenId, to);
    }
    
    /**
     * @dev Override for _increaseBalance to implement ERC721Enumerable
     */
    function _increaseBalance(address account, uint128 value) internal virtual override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    /**
     * @dev Override for ERC2771Context's _msgSender() function
     */
    function _msgSender() internal view override(Context, ERC2771Context) returns (address) {
        return ERC2771Context._msgSender();
    }

    /**
     * @dev Override for ERC2771Context's _msgData() function
     */
    function _msgData() internal view override(Context, ERC2771Context) returns (bytes calldata) {
        return ERC2771Context._msgData();
    }
    
    /**
     * @dev Override for _contextSuffixLength to resolve conflict between Context and ERC2771Context
     */
    function _contextSuffixLength() internal view virtual override(Context, ERC2771Context) returns (uint256) {
        return ERC2771Context._contextSuffixLength();
    }

    /**
     * @dev Required override to support ERC721Enumerable
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}