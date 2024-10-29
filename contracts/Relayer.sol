// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title BlockusRelayer
 * @dev Extension of ERC2771Forwarder that includes pause functionality
 */
contract BlockusRelayer is ERC2771Forwarder, Ownable, Pausable {
    constructor(
        string memory name,
        address initialOwner
    ) ERC2771Forwarder(name) Ownable(initialOwner) {}

    /**
     * @dev Override execute to check pause status
     */
    function execute(
        ForwardRequestData calldata request
    ) public payable override whenNotPaused {
        super.execute(request);
    }

    /**
     * @dev Override executeBatch to check pause status
     */
    function executeBatch(
        ForwardRequestData[] calldata requests,
        address payable refundReceiver
    ) public payable override whenNotPaused {
        super.executeBatch(requests, refundReceiver);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
