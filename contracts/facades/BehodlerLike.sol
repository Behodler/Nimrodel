pragma solidity ^0.6.1;

abstract contract BehodlerLike {
    function tokenScarcityObligations(address t) public virtual view returns (uint);
  
    function buyScarcity(
        address tokenAddress,
        uint256 value,
        uint256 minPrice
    ) external virtual returns (uint256);

    function calculateAverageScarcityPerToken(
        address tokenAddress,
        uint256 value
    ) external virtual view returns (uint256);
}
