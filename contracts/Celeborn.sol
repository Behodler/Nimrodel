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

    sponsorshipData[14] public sponsors;

    function sponsor(
        uint256 slot,
        uint256 value,
        bytes32 company,
        bytes32 logo,
        bytes32 siteURL,
        bytes calldata message
    ) external {
        require(message.length <= 140, "max message length exceeded.");
        require(
            value >= bronzeThreshold,
            "minimum sponsoship payment not reached."
        );
        require(slot < maxBronze + maxSilver + maxGold, "invalid slot number");
        require(value >= silverThreshold || slot < maxBronze, "slot-value mismatch");
        require(value >= goldThreshold || slot < maxBronze + maxSilver, "slot-value mismatch");

        sponsorshipData memory data;
        data.message = message;
        data.time = now; 
        
        if (value >= silverThreshold) {
            data.companyName = company;
            data.siteURL = siteURL;
        }
        if (value >= goldThreshold) {
            data.logoURL = logo;
        }

        require(
            now - sponsors[slot].time >
                safetyDurationMultiplier * (value / ONE),
            "current sponsor can't be displaced yet."
        );

        sponsors[slot] = data;
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

    function getSponsorshipData(uint256 slot, uint256 field)
        external
        view
        returns (bytes memory)
    {
        if (slot >= maxGold + maxSilver + maxBronze) return "INVALID SLOT";
        sponsorshipData memory data = sponsors[slot];

        bytes32 dataToConvert;
        if (field == 0) dataToConvert = data.companyName;
        else if (field == 1) dataToConvert = data.logoURL;
        else if (field == 2) dataToConvert = data.siteURL;
        else return data.message;
        uint256 spacePadding = 0;
        for (uint256 i = 0; i < 32; i++) {
            spacePadding = dataToConvert[i] == 0 ? spacePadding + 1 : 0;
        }
        spacePadding = spacePadding == 32 ? 31 : spacePadding;
        bytes memory depaddedReturn = new bytes(32 - spacePadding);
        for (uint256 i = 0; i < 32 - spacePadding; i++) {
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
