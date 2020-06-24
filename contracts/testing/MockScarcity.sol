pragma solidity ^0.6.2;
import "../node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract MockScarcity is ERC20 {
    constructor(string memory name, string memory symbol)
        public
        ERC20(name, symbol)
    {}

    function mint(address recipient, uint256 value) external {
        _mint(recipient, value);
    }

    function burn(uint256 value) external {
        _burn(msg.sender, value);
    }
}
