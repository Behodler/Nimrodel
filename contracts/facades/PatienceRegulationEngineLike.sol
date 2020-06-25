pragma solidity ^0.6.2;

abstract contract PatienceRegulationEngineLike{
	function setDonationSplit(uint split) public virtual;
	function getDonationSplit(address user) external virtual view returns (uint);
	function buyWeiDai(uint dai, uint split) external virtual;
	function claimWeiDai() external virtual;
}