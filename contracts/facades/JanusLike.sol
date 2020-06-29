pragma solidity ^0.6.2;

abstract contract JanusLike {
    //user must authorize behodler to take input token
    function tokenToToken(
        address input,
        address output,
        uint256 value,
        uint256 minPrice,
        uint256 maxPrice
    ) external virtual returns (uint256 bought);

    function ethToToken(
        address output,
        uint256 minPrice,
        uint256 maxPrice
    ) external virtual payable returns (uint256 bought);
}
