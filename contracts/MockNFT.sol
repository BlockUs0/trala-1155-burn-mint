// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

contract MockNFT is ERC721, ERC2771Context {
    uint256 private _tokenIds;
    
    constructor(address trustedForwarder) 
        ERC721("MockNFT", "MNFT") 
        ERC2771Context(trustedForwarder) 
    {}

    function mint() external {
        uint256 newTokenId = _tokenIds++;
        _mint(_msgSender(), newTokenId);
    }

    function _msgSender() internal view override(Context, ERC2771Context)
        returns (address) {
        return ERC2771Context._msgSender();
    }

    function _msgData() internal view override(Context, ERC2771Context)
        returns (bytes calldata) {
        return ERC2771Context._msgData();
    }
    function _contextSuffixLength() internal view override(Context, ERC2771Context) 
        returns (uint256) {
        return ERC2771Context._contextSuffixLength();
    }
}
