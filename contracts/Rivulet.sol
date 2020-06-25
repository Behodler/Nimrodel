//SPDX-License-Identifier: MIT
pragma solidity ^0.6.2;
import "./node_modules/@openzeppelin/contracts/access/Ownable.sol";
import "./facades/ScarcityLike.sol";
import "./facades/ERC20Like.sol";
import "./node_modules/@openzeppelin/contracts/math/SafeMath.sol";

/**
    Rivulet is the SCX staking contract. All the rivulets make up Nimrodel
    Rivulet is seeded with a portion of Dai which is streamed to all stakers of
    Scarcity on a per second basis in proportion to their stake size.
    There is a global stream rate (Dai per Second) that is divided between Stakers.
    The global stream rate increases as more total Scarcity is staked. So that there are first
    and second order effects to staking. The first order effect of a new staker is to take
    a share of the stream from existing stakers. The second order effect is to increase the overall quantity
    staked and therefore increase the stream rate for everyone.
 */
contract Rivulet is Ownable {
    using SafeMath for uint256;
    uint256 constant ONE = 1 szabo; //what are smart contracts without Nick?

    ScarcityLike public scarcity;
    ERC20Like public dai;
    address public celeborn;

    mapping(address => uint256) public staked;
    mapping(address => uint256) public tickets;
    uint256 public totalTickets;
    mapping(address => uint256) public scxMultiple; //burning Scx gives an effective balance of 10x
    mapping(address => uint256) public damHeightAtJoin; //when calculating Dai, (dam-damHeightAtJoin)*SCX
    mapping(address => uint256) public ponds; // Dai accumulated per user
    uint256 public damHeight = ONE; // total growth as % since first deposit;

    // uint256 public totalEffectiveStaked;
    uint256 public maxTickets; //this acts as the denominator in adjusting the rate of flow
    uint256 public initialDai; //used to calculate aggregate flow
    uint256 public timeScale = 14 days;
    uint256 public burnMultiple = 10; //scxBurnt is staked at this multiple
    uint256 public ticketSize = 1000000 ether; // minimum SCX to stake;
    uint256 lastDrip; //following from MakerDAO's pot, the growth must be calculated before deposit and withdrawal can be invoked.

    constructor() public {
        lastDrip = now;
    }

    function seed(
        address daiAddress,
        address scxAddress,
        address c,
        uint256 time,
        uint256 b,
        uint256 m
    ) public onlyOwner {
        dai = ERC20Like(daiAddress);
        scarcity = ScarcityLike(scxAddress);
        timeScale = time == 0 ? timeScale : time;
        burnMultiple = b;
        maxTickets = m;
        celeborn = c;
    }

    function setTicketParameters(uint256 t, uint256 m) public onlyOwner {
        ticketSize = t;
        maxTickets = m;
    }

    function setBurnMultiple(uint256 b) public onlyOwner {
        burnMultiple = b;
    }

    //where Dai meets Nimrodel. Don't call directly if you want to sponsor
    function celebrant(uint256 value) external {
        celebrant(msg.sender, value);
    }

    function celebrant(address sender, uint256 value) public {
        require(
            msg.sender == address(this) || msg.sender == celeborn,
            "not accessible to public"
        );
        require(
            dai.transferFrom(sender, address(this), value),
            "dai transfer to Rivulet failed"
        );
        uint256 newBalance = dai.balanceOf(address(this));
        if (newBalance > initialDai) {
            initialDai = newBalance;
        }
    }

    function dripIfStale() public {
        if (now != lastDrip) drip();
    }

    function drip() public {
        uint256 rightNow = now;
        if (totalTickets == 0) {
            lastDrip = rightNow;
            return;
        }
        uint256 timeSpan = rightNow > lastDrip ? rightNow - lastDrip : lastDrip; //avoid miner attacks
        uint256 flow = aggregateFlow();
        uint256 aggregateDaiPerTicketPerSecond = flow.div(totalTickets);
        uint256 linearGrowth = aggregateDaiPerTicketPerSecond.mul(timeSpan);
        uint256 maxHeight = dai.balanceOf(address(this)).div(totalTickets);
        damHeight = damHeight.add(linearGrowth);
        damHeight = damHeight < maxHeight ? damHeight : maxHeight;
        lastDrip = now;
    }

    function fillPond(address sender) private {
        ponds[sender] += tickets[sender].mul(
            damHeight - damHeightAtJoin[sender]
        );
        damHeightAtJoin[sender] = damHeight;
    }

    function drainPond() external {
        dripIfStale();
        fillPond(msg.sender);
        uint256 daiToSend = ponds[msg.sender];
        ponds[msg.sender] = 0;
        require(dai.transfer(msg.sender, daiToSend), "dai transfer failed");
    }

    function stake(uint256 stakeValue, uint256 burnValue) external {
        dripIfStale();
        uint256 stakeTrunc = stakeValue.sub(stakeValue.mod(ticketSize));
        uint256 burnTrunc = burnValue.sub(burnValue.mod(ticketSize));
        require(stakeTrunc + burnTrunc > 0, "no tickets purchased");
        require(
            scarcity.transferFrom(
                msg.sender,
                address(this),
                stakeTrunc + burnTrunc
            ),
            "transfer of SCX failed"
        );
        fillPond(msg.sender);
        uint256 ticketsCreated = (stakeTrunc + (burnMultiple * burnTrunc)) /
            ticketSize;
        tickets[msg.sender] = tickets[msg.sender].add(ticketsCreated);
        require(
            (totalTickets = totalTickets + ticketsCreated) <= maxTickets ||
                maxTickets == 0,
            "rivulet has maxed out ticket sales."
        );
        staked[msg.sender] = staked[msg.sender].add(stakeTrunc);
        if (burnTrunc > 0) {
            scarcity.burn(burnTrunc);
        }
    }

    function unstake(uint256 scx) external {
        uint256 stakeToWithdraw = scx > staked[msg.sender]
            ? staked[msg.sender]
            : scx;
        uint256 ticketsToUnstake = proportionMul( //possibly change
            stakeToWithdraw,
            staked[msg.sender],
            tickets[msg.sender]
        );
        staked[msg.sender] = staked[msg.sender].sub(stakeToWithdraw);
        scarcity.transfer(msg.sender, stakeToWithdraw);
        if (tickets[msg.sender] == 0) {
            return;
        }
        dripIfStale();
        fillPond(msg.sender);

        uint256 daiToSend = proportionMul(
            ticketsToUnstake,
            tickets[msg.sender],
            ponds[msg.sender]
        );
        tickets[msg.sender] = tickets[msg.sender].sub(ticketsToUnstake);
        totalTickets = totalTickets.sub(ticketsToUnstake);
        ponds[msg.sender] = ponds[msg.sender].sub(daiToSend);
        dai.transfer(msg.sender, daiToSend);
    }

    function proportionMul(
        uint256 numerator,
        uint256 denominator,
        uint256 base
    ) private pure returns (uint256) {
        return (numerator.mul(ONE).div(denominator).mul(base)).div(ONE);
    }

    //do not allow max to be reached
    //Dai per second
    // NB: 'ware the fixed point dragons
    function aggregateFlow() public view returns (uint256 flow) {
        uint256 max = maxTickets == 0
            ? scarcity.totalSupply() / ticketSize
            : maxTickets;
        uint256 denominator = max;
        uint256 numerator = ONE.mul(denominator.sub(totalTickets));
        uint256 inflatedRatio = numerator.div(denominator);
        uint256 duration = (timeScale.mul(inflatedRatio)).div(ONE);
        flow = initialDai.div(duration);
    }
}
