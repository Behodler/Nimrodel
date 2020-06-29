pragma solidity ^0.6.2;
import "../node_modules/@openzeppelin/contracts/math/SafeMath.sol";

library SafeOperations {
    using SafeMath for uint256;
    uint256 constant uintMax = 2 << 254;

    function safeRightShift(uint256 number, uint256 factor)
        internal
        pure
        returns (uint256)
    {
        uint256 value = number >> factor;
        require(value <= number);
        return value;
    }

    function safeLeftShift(uint256 number, uint256 factor)
        internal
        pure
        returns (uint256)
    {
        uint256 value = number << factor;
        require(value >= number);
        return value;
    }

    function square(uint256 value) internal pure returns (uint256) {
        uint256 product = value.mul(value);
        if (product < value) return uintMax;
        return product;
    }

    function sqrtImprecise(uint256 x) internal pure returns (uint256 y) {
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        if (y > x) y = 0;
    }

    function sqrt(uint256 x) internal pure returns (uint256 y) {
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        if (y > x) y = 0;
        require(y * y <= z, "invariant");
    }
}
