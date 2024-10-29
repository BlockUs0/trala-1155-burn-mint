// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title BlockusRelayer
 * @dev Extension of ERC2771Forwarder that includes contract allowlist
 */
contract BlockusRelayer is ERC2771Forwarder, Ownable, Pausable {
    error ContractNotAllowed(address target);
    error ContractAlreadyAllowed(address target);
    error ContractNotInAllowlist(address target);
    
    event ContractAllowed(address indexed target);
    event ContractRemoved(address indexed target);
    
    // Mapping to track allowed contracts
    mapping(address => bool) public allowedContracts;
    // Array to keep track of all allowed contracts for enumeration
    address[] public allowedContractsList;

    constructor(
        string memory name,
        address initialOwner,
        address[] memory _allowedContracts
    ) ERC2771Forwarder(name) Ownable(initialOwner) {
        for (uint i = 0; i < _allowedContracts.length; i++) {
            _allowContract(_allowedContracts[i]);
        }
    }

    /**
     * @dev Modifier to check if a contract is allowed
     */
    modifier onlyAllowedContract(address target) {
        if (!allowedContracts[target]) {
            revert ContractNotAllowed(target);
        }
        _;
    }

    /**
     * @dev Internal function to add a contract to the allowlist
     */
    function _allowContract(address target) private {
        if (allowedContracts[target]) {
            revert ContractAlreadyAllowed(target);
        }
        allowedContracts[target] = true;
        allowedContractsList.push(target);
        emit ContractAllowed(target);
    }

    /**
     * @dev Allows owner to add a contract to the allowlist
     */
    function allowContract(address target) external onlyOwner {
        _allowContract(target);
    }

    /**
     * @dev Allows owner to add multiple contracts to the allowlist
     */
    function allowContracts(address[] calldata targets) external onlyOwner {
        for (uint i = 0; i < targets.length; i++) {
            _allowContract(targets[i]);
        }
    }

    /**
     * @dev Allows owner to remove a contract from the allowlist
     */
    function removeContract(address target) external onlyOwner {
        if (!allowedContracts[target]) {
            revert ContractNotInAllowlist(target);
        }
        
        allowedContracts[target] = false;
        
        // Remove from array by swapping with last element and popping
        for (uint i = 0; i < allowedContractsList.length; i++) {
            if (allowedContractsList[i] == target) {
                allowedContractsList[i] = allowedContractsList[allowedContractsList.length - 1];
                allowedContractsList.pop();
                break;
            }
        }
        
        emit ContractRemoved(target);
    }

    /**
     * @dev Returns list of all allowed contracts
     */
    function getAllowedContracts() external view returns (address[] memory) {
        return allowedContractsList;
    }

    /**
     * @dev Override execute to check allowlist
     */
    function execute(
        ForwardRequestData calldata request
    ) public payable override whenNotPaused onlyAllowedContract(request.to) {
        super.execute(request);
    }

    /**
     * @dev Override executeBatch to check allowlist
     */
    function executeBatch(
        ForwardRequestData[] calldata requests,
        address payable refundReceiver
    ) public payable override whenNotPaused {
        // Check all target contracts are allowed
        for (uint i = 0; i < requests.length; i++) {
            if (!allowedContracts[requests[i].to]) {
                revert ContractNotAllowed(requests[i].to);
            }
        }
        super.executeBatch(requests, refundReceiver);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
