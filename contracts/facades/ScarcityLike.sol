//SPDX-License-Identifier: MIT
pragma solidity ^0.6.2;
import "./ERC20Like.sol";

abstract contract ScarcityLike is ERC20Like {
    function mint(address recipient, uint256 value) external virtual;
    function burn (uint value) external virtual;
}
