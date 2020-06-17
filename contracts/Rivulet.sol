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

    mapping(address => uint256) public staked;
    mapping(address => uint256) public scxMultiple; //burning Scx gives an effective balance of 10x
    mapping(address => uint256) public damHeightAtJoin; //when calculating Dai, (dam-damHeightAtJoin)*SCX
    mapping(address => uint256) public ponds; // Dai accumulated per user
    uint256 damHeight = ONE; // total growth as % since first deposit;

    uint256 public totalScarcityStaked;
    uint256 public totalEffectiveStaked;
    uint256 public maxSCX; //this acts as the denominator in adjusting the rate of flow
    uint256 public initialDai; //used to calculate aggregate flow
    uint256 public timeScale = 14 days;
    uint256 public burnMultiple = 10; //scxBurnt is staked at this multiple
    uint256 public ticketSize = 1000000 ether; // minimum SCX to stake;
    uint256 lastDrip; //following from MakerDAO's pot, the growth must be calculated before deposit and withdrawal can be invoked.

    function seed(
        address daiAddress,
        address scxAddress,
        uint256 time,
        uint256 b
    ) public onlyOwner {
        scarcity = ScarcityLike(scxAddress);
        dai = ERC20Like(daiAddress);
        timeScale = time;
        burnMultiple = b;
    }

    function setTicketSize(uint256 t) public onlyOwner {
        ticketSize = t;
    }

    function setBurnMultiple(uint256 b) public onlyOwner {
        burnMultiple = b;
    }

    function celebrant(uint256 value) external {
        //where Dai meets Nimrodel. Don't call directly if you want to sponsor
        require(
            dai.transferFrom(msg.sender, address(this), value),
            "dai transfer to Rivulet failed"
        );
        uint256 newBalance = dai.balanceOf(address(this));
        if (newBalance > initialDai) {
            initialDai = newBalance;
        }
    }

    function drip() public {
        uint256 rightNow = now;
        if (totalScarcityStaked == 0) {
            lastDrip = rightNow;
            return;
        }
        uint256 timeSpan = rightNow > lastDrip ? rightNow - lastDrip : lastDrip; //avoid miner attacks
        uint256 aggregateDaiPerScxPerSecond = aggregateFlow().div(
            totalScarcityStaked
        );
        uint256 linearGrowth = aggregateDaiPerScxPerSecond.mul(timeSpan);
        uint256 maxHeight = dai.balanceOf(address(this)).mul(ONE).div(
            totalEffectiveStaked
        );
        damHeight = damHeight.add(linearGrowth);
        damHeight = damHeight < maxHeight ? damHeight : maxHeight;
        lastDrip = rightNow;
    }

    modifier freshDrips() {
        require(lastDrip == now, "call drip before adding or removing stake.");
        _;
    }

    function stake(uint256 tickets, uint256 burnRatio) external freshDrips {
        require(burnRatio <= 100, "ratio expressed as % between 1 and 100");
        uint256 value = tickets * ticketSize;
        if (burnRatio == 0) {
            stake(value, msg.sender);
        } else {
            stake(value, burnRatio, msg.sender);
        }
    }

    /**
    decimal existingDaiBalance = ScxStaked[name] * (Chi - InitialChiOffset[name]);
            ScxStaked[name] = ScxStaked[name] - SCX;
            DaiBalances[name] += existingDaiBalance;
            InitialChiOffset[name] = Chi;
            SCX_total_stake -= SCX;
     */

    function drainPond () external freshDrips {
        fillPond(msg.sender);
        uint daiToSend = ponds[msg.sender];
        ponds[msg.sender] = 0;
        require(dai.transfer(msg.sender, daiToSend),"dai transfer failed");
    }

    function unstake(uint256 value) external freshDrips {
        fillPond(msg.sender);
        uint256 daiToSend = ponds[msg.sender]
            .mul(ONE)
            .mul(value)
            .div(staked[msg.sender])
            .div(ONE);

        ponds[msg.sender] = ponds[msg.sender].sub(daiToSend);
        staked[msg.sender] = staked[msg.sender].sub(value);
        if (staked[msg.sender] == 0) scxMultiple[msg.sender] = 0;
        require(dai.transfer(msg.sender, daiToSend),"dai transfer failed");
    }

    function fillPond(address sender)
        private
        returns (uint256 effectiveStaked)
    {
        effectiveStaked = scxMultiple[sender] * staked[sender];
        ponds[sender] += effectiveStaked
            .mul(damHeight - damHeightAtJoin[sender])
            .div(ONE);
        damHeightAtJoin[sender] = damHeight;
    }

    function stake(uint256 value, address sender) private {
        require(
            scarcity.transferFrom(sender, address(this), value),
            "transfer of SCX failed"
        );
        uint256 effectiveStaked = fillPond(sender);

        staked[sender] = staked[sender] + value;
        scxMultiple[sender] = (effectiveStaked + value) / staked[sender];
        totalScarcityStaked = totalScarcityStaked.add(value);
        totalEffectiveStaked = totalEffectiveStaked.add(value);
    }

    function stake(
        uint256 value,
        uint256 burnRatio,
        address sender
    ) private {
        //bigger rewards but more gassy
        require(
            scarcity.transferFrom(sender, address(this), value),
            "transfer of SCX failed"
        );
        uint256 effectiveStaked = fillPond(sender);
        uint256 notBurnt = ((100 - burnRatio) * value).div(100);
        if (burnRatio > 0) {
            scarcity.burn(burnRatio * value);
        }
        uint256 effectiveAddition = (burnMultiple * burnRatio * value).div(
            100
        ) + (100 - burnRatio) * value.div(100);
        staked[sender] = staked[sender] + notBurnt;
        scxMultiple[sender] =
            (effectiveAddition + effectiveStaked) /
            staked[sender];
        totalScarcityStaked = totalScarcityStaked.add(value);
        totalEffectiveStaked = totalEffectiveStaked.add(effectiveAddition);
    }

    //do not allow max to be reached
    //Dai per second
    function aggregateFlow() public view returns (uint256 flow) {
        // NB, this rate is inflated by ONE for fixed point arithmetic
        uint256 denominator = maxSCX;
        uint256 numerator = ONE.mul(denominator.sub(totalScarcityStaked));
        uint256 inflatedRatio = numerator.div(denominator);
        uint256 duration = (timeScale.mul(inflatedRatio));
        flow = initialDai.div(duration);
    }
}
