pragma solidity ^0.6.2;
import "../node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken1 is ERC20 {
    constructor(string memory name, string memory symbol)
        public
        ERC20(name, symbol)
    {
        _mint(msg.sender, 2000 ether);
    }
}
