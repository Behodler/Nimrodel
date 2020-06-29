pragma solidity ^0.6.2;
import "../facades/BehodlerLike.sol";
import "../facades//ScarcityLike.sol";

contract MockBehodler is BehodlerLike {
    ScarcityLike public scarcity;
    address public mockToken1Address;
    address public daiAddress;

    function tokenScarcityObligations(address t)
        public
        override
        view
        returns (uint256)
    {
        require(t!=address(scarcity),"don't use scarcity for tokenScarcityObligations");
        return 1 ether;
    }

    function seed(
        address s,
        address m,
        address d
    ) public {
        scarcity = ScarcityLike(s);
        mockToken1Address = m;
        daiAddress = d;
    }

    function buyScarcity(
        address tokenAddress,
        uint256 value,
        uint256 minPrice
    ) external override returns (uint256) {
        uint256 ave = tokenScarcityObligations(tokenAddress);
        require(
            minPrice >= 0 &&
                (tokenAddress == mockToken1Address ||
                    tokenAddress == daiAddress),
            "min price is a thing"
        );
        scarcity.mint(msg.sender, ave * value);
    }

    function calculateAverageScarcityPerToken(
        address tokenAddress,
        uint256 value
    ) external override view returns (uint256) {
        require(
            value >= 0 &&
                (tokenAddress == mockToken1Address ||
                    tokenAddress == daiAddress),
            "min price is a thing"
        );
        return 200;
    }
}
