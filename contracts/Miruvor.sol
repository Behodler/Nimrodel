pragma solidity ^0.6.2;
import "./node_modules/@openzeppelin/contracts/access/Ownable.sol";
import "./node_modules/@openzeppelin/contracts/math/SafeMath.sol";
import "./facades/LachesisLike.sol";
import "./facades/ScarcityLike.sol";
import "./facades/BehodlerLike.sol";
import "./libraries/SafeOperations.sol";
import "./facades/ERC20Like.sol";
import "./facades/JanusLike.sol";
import "./facades/WethLike.sol";
import "./facades/PyroTokenRegistryLike.sol";

/*
    Miruvor is a low gas alternative to buying Scarcity straight from Behodler
    The price per unit is higher than on Behodler and the amount of Scarcity is limited.
    When Scarcity is purchased, the contract by definition fills with trading tokens.
    A top up function exists to flush the tokens by calling Behodler.buy(). Purchasing SCX
    creates Pyrotokens. Instead of keeping them, the contract redeems them and pays them to caller to compensate for gas.
    The markup should be set such that Miruvor profits, thereby growing the pool of SCX over time and being increasingly rewarding to end users.
 */
contract Miruvor is Ownable {
    LachesisLike public lachesis;
    BehodlerLike public behodler;
    ScarcityLike public scarcity;
    JanusLike public janus;
    WethLike public weth;
    PyroTokenRegistryLike public pyroTokenRegistry;
    ERC20Like public dai;
    ERC20Like public weiDai;
    uint256 public discount = 900; // divide by 1000 to get multiplier. 900 = 0.9

    using SafeMath for uint256;
    using SafeOperations for uint256;

    mapping(address => uint256) public SCXperToken; //SCALED BY ONE

    uint256 constant ONE = 1 ether;
    uint256 constant factor = 128;

    function setMarkup(uint256 d) public onlyOwner {
        require(d <= 1000, "1000 === 1");
        discount = d;
    }

    function seed(
        address scx,
        address behodlerAddress,
        address lachesisAddress,
        address janusAddress,
        address wethAddress,
        address pTokenReg,
        address daiAddress,
        address weiDaiAddress
    ) public onlyOwner {
        lachesis = LachesisLike(lachesisAddress);
        scarcity = ScarcityLike(scx);
        behodler = BehodlerLike(behodlerAddress);
        janus = JanusLike(janusAddress);
        weth = WethLike(wethAddress);
        pyroTokenRegistry = PyroTokenRegistryLike(pTokenReg);
        dai = ERC20Like(daiAddress);
        weiDai = ERC20Like(weiDaiAddress);
    }

    function canDrink(address tokenAddress) public returns (bool) {
        if (!lachesis.tokens(tokenAddress) || SCXperToken[tokenAddress] == 0)
            return false;
    }

    function refresh(address tokenAddress) public {
        SCXperToken[tokenAddress] = calculateSCXperToken(
            tokenAddress,
            scarcity.balanceOf(address(this))
        )
            .mul(discount)
            .div(1000);
    }

    //purchases SCX with token
    function drink(address tokenAddress, uint256 value) public {
        drink(tokenAddress, value, msg.sender);
    }

    //user enables weth for Miruvor
    function drinkEth() public payable {
        require(msg.value > 0, "no eth sent");
        weth.deposit.value(msg.value)();
        weth.transfer(msg.sender, msg.value);
        drink(address(weth), msg.value, msg.sender);
    }

    function drink(
        address tokenAddress,
        uint256 value,
        address sender
    ) private {
        require(canDrink(tokenAddress), "Invalid token. Try refreshing.");
        uint256 scx = SCXperToken[tokenAddress].mul(value).div(ONE);
        require(
            ERC20Like(tokenAddress).transferFrom(sender, address(this), value),
            "token transfer failed"
        );
        require(scarcity.transfer(sender, scx), "scarcity payout failed");
    }

    function stopperEth() public payable {
        janus.ethToToken{value: msg.value}(address(scarcity), 0, 0);
        ERC20Like pToken = ERC20Like(
            pyroTokenRegistry.baseTokenMapping(address(weth))
        );
        uint256 pbalance = pToken.balanceOf(address(this));
        pToken.transfer(msg.sender, pbalance);
        refresh(address(weth));
    }

    //flushes the token balance into Behodler, pays caller fee
    function stopper(address tokenAddress) public {
        if (tokenAddress == address(dai) || tokenAddress == address(weiDai)) {
            uint256 tokenBalanceBefore = ERC20Like(tokenAddress).balanceOf(
                address(this)
            );
            ERC20Like(tokenAddress).transfer(
                msg.sender,
                tokenBalanceBefore / 100
            );
            uint256 tokenBalanceAfter = ERC20Like(tokenAddress).balanceOf(
                address(this)
            );
            janus.tokenToToken(
                tokenAddress,
                address(scarcity),
                tokenBalanceAfter,
                0,
                0
            );
        } else {
            uint256 tokenBalance = ERC20Like(tokenAddress).balanceOf(
                address(this)
            );
            ERC20Like pToken = ERC20Like(
                pyroTokenRegistry.baseTokenMapping(tokenAddress)
            );
            janus.tokenToToken(
                tokenAddress,
                address(scarcity),
                tokenBalance,
                0,
                0
            );
            uint256 pbalance = pToken.balanceOf(address(this));
            pToken.transfer(msg.sender, pbalance);
        }
        refresh(tokenAddress);
    }

    //Given a level of SCX, how many tokens are required to generate it
    function calculateSCXperToken(address tokenAddress, uint256 scx)
        public
        view
        returns (uint256)
    {
        uint256 tokensToPurchaseWith = scx.square() +
            scx.mul(behodler.tokenScarcityObligations(tokenAddress)).mul(2);
        return scx.mul(ONE).div(tokensToPurchaseWith);
    }
}
