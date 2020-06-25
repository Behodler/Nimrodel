//SPDX-License-Identifier: MIT
pragma solidity ^0.6.2;

abstract contract RivuletLike {
    function celebrant(uint256 value) external virtual;
    function celebrant(address sender, uint256 value) external virtual;
    function drainPond() external virtual;

    function stake(uint256 stakeValue, uint256 burnValue) external virtual;

    function unstake(uint256 stakeValue) external virtual;

    function drip() public virtual;

    function aggregateFlow() public virtual view returns (uint256 flow);

    function ticketSize() public virtual ;
}
