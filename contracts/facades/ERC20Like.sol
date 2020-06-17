//SPDX-License-Identifier: MIT
pragma solidity ^0.6.2;

abstract contract ERC20Like {
  	function totalSupply() external virtual view returns (uint256);
	function balanceOf(address account) external virtual view returns (uint256);
	function transfer(address recipient, uint256 amount) external virtual returns (bool);
	function allowance(address owner, address spender) external virtual view returns (uint256);
	function approve(address spender, uint256 amount) external virtual returns (bool);
	function transferFrom(address sender, address recipient, uint256 amount) external virtual returns (bool);
}
