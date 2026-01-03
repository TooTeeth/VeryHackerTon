// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract VeryDAOOptions {
    struct Option {
        uint128 votes;
    }

    mapping(uint256 => Option[]) public options;

    function addOptions(uint256 id, uint256 count) external {
        for (uint256 i = 0; i < count; i++) {
            options[id].push(Option(0));
        }
    }

    function vote(uint256 id, uint256 optionId, uint256 weight) external {
        options[id][optionId].votes += uint128(weight);
    }

    function isMultiOption(uint256 id) external view returns (bool) {
        return options[id].length > 0;
    }
}
