//SPDX-License-Identifier: MIT
pragma solidity ^0.6.2;
import "./node_modules/@openzeppelin/contracts/access/Ownable.sol";
import "./facades/ScarcityLike.sol";
import "./facades/ERC20Like.sol";
import "./facades/RivuletLike.sol";
import "./node_modules/@openzeppelin/contracts/math/SafeMath.sol";

/**
    Celeborn handles all sponsorships of Nimrodel in a trustless manner
    For now, Celeborn retrieves resources using bitly as a go between.
    When IPFS has an incentive layer, we can use it instead.
 */

contract Celeborn is Ownable {
    RivuletLike public rivulet;
    ERC20Like public dai;

    uint256 public maxGold = 1;
    uint256 public maxSilver = 3;
    uint256 public maxBronze = 10;
    uint256 public goldThreshold = 100 ether;
    uint256 public silverThreshold = 20 ether;
    uint256 public bronzeThreshold = 1 ether;
    uint256 safetyDurationMultiplier = 2 hours;
    uint256 constant ONE = 1 ether;

    sponsorshipData[] public gold;
    sponsorshipData[] public silver;
    sponsorshipData[] public bronze;

    function sponsor(
        uint256 slot,
        uint256 value,
        bytes32 company,
        bytes32 logo,
        bytes32 siteURL,
        bytes calldata message
    ) external {
        require(message.length <= 140, "max message length exceeded.");
        sponsorshipData memory data;
        data.message = message;
        data.time = now;
        if (value >= goldThreshold) {
            slot = 0;
            data.companyName = company;
            data.logoURL = logo;
            data.siteURL = siteURL;
            if (gold.length == 0) {
                gold.push(data);
            } else {
                require(
                    now - gold[0].time > safetyDurationMultiplier * value,
                    "current gold sponsor can't be displaced yet."
                );
                gold[0] = data;
            }
        } else if (value >= silverThreshold) {
            if (slot >= maxSilver - 1) slot = maxSilver - 1;
            data.companyName = company;
            data.siteURL = siteURL;
            if (silver.length <= slot) silver.push(data);
            else {
                require(
                    now - silver[slot].time > safetyDurationMultiplier * value,
                    "silver sponsor can't be displaced yet."
                );
                silver[slot] = data;
            }
        } else if (value >= bronzeThreshold) {
            if (slot >= maxBronze - 1) slot = maxBronze - 1;
            if (bronze.length <= slot) bronze.push(data);
            else {
                require(
                    now - silver[slot].time > safetyDurationMultiplier * value,
                    "bronze sponsor can't be displaced yet."
                );
                bronze[slot] = data;
            }
        }
        rivulet.celebrant(msg.sender, value);
    }

    function seed(address r, address d) public onlyOwner {
        rivulet = RivuletLike(r);
        dai = ERC20Like(d);
        dai.approve(r, uint256(-1));
    }

    function setMaxSponsorships(
        uint256 g,
        uint256 s,
        uint256 b,
        uint256 m
    ) public onlyOwner {
        maxGold = g;
        maxSilver = s;
        maxBronze = b;
        safetyDurationMultiplier = m;
    }

    function getSponsorshipData(
        uint256 tier,
        uint256 slot,
        uint256 field
    ) external view returns (bytes memory) {
        sponsorshipData memory data = tier == 0
            ? gold[slot]
            : (tier == 1 ? silver[slot] : bronze[slot]);
        bytes32 dataToConvert;
        if (field == 0) dataToConvert = data.companyName;
        else if (field == 1) dataToConvert = data.logoURL;
        else if (field == 2) dataToConvert = data.siteURL;
        else return data.message;
        uint spacePadding =0;
        for (uint256 i = 0; i < 32; i++) {
            spacePadding = dataToConvert[i]==0?spacePadding+1:0;      
        }
        spacePadding =spacePadding== 32?31:spacePadding;
        bytes memory depaddedReturn = new bytes(32-spacePadding);
        for(uint i =0;i<32-spacePadding;i++){
            depaddedReturn[i] = dataToConvert[i];
        }
        return depaddedReturn;
    }
}

struct sponsorshipData {
    bytes32 companyName;
    bytes32 logoURL;
    bytes32 siteURL;
    bytes message;
    //fields for internal management
    uint256 value;
    uint256 time;
}
