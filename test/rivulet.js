
const async = require('./helpers/async.js')
const expectThrow = require('./helpers/expectThrow').handle
const bigNumber = require('bignumber.js')
const test = async.test
const setup = async.setup
const time = require('./helpers/time')
const rivulet = artifacts.require('Rivulet')
const scarcity = artifacts.require("MockScarcity")
const dai = artifacts.require('MockDai')

contract('rivulet 1', accounts => {
    var scarcityInstance, daiInstance, rivuletInstance, haldirInstance
    const primaryOptions = { from: accounts[0], gas: "0x6091b7" }
    const secondaryOptions = { from: accounts[1], gas: "0x6091b7" }
    setup(async () => {
        scarcityInstance = await scarcity.deployed()
        daiInstance = await dai.deployed()
        rivuletInstance = await rivulet.deployed()
        await scarcityInstance.mint(accounts[0], '10000000', primaryOptions)
        await scarcityInstance.mint(accounts[1], '10000000', primaryOptions)
        await daiInstance.transfer(accounts[1], '1000000000000000', primaryOptions)
        primary = accounts[0]
    })

    test("topping up celebrant above initial increases initial", async () => {
        await daiInstance.approve(rivuletInstance.address, '10000000000', primaryOptions)
        const initialDai = (await rivuletInstance.initialDai.call(primaryOptions)).toNumber()
        await rivuletInstance.celebrant(initialDai + 100, primaryOptions)
        const initialDaiAfter = (await rivuletInstance.initialDai.call(primaryOptions)).toNumber()
        assert.equal(initialDaiAfter - initialDai, 100)

    })
})


contract('rivulet: small duration', accounts => {
    var scarcityInstance, daiInstance, rivuletInstance, haldirInstance
    const primaryOptions = { from: accounts[0], gas: "0x6091b7" }
    const secondaryOptions = { from: accounts[1], gas: "0x6091b7" }
    setup(async () => {
        scarcityInstance = await scarcity.deployed()
        daiInstance = await dai.deployed()
        rivuletInstance = await rivulet.deployed()
        await scarcityInstance.mint(accounts[0], '10000000', primaryOptions)
        await scarcityInstance.mint(accounts[1], '10000000', primaryOptions)
        await daiInstance.transfer(accounts[1], '1000000000000000', primaryOptions)
        primary = accounts[0]
    })

    test("staking & unstaking without burning", async () => {
        const initialDai = (await rivuletInstance.initialDai.call(primaryOptions)).toNumber()
        await daiInstance.approve(rivuletInstance.address, '10000000000000000000', primaryOptions)
        await rivuletInstance.celebrant("1000000000000000000", primaryOptions)
        const ticketSize = new bigNumber((await rivuletInstance.ticketSize.call(primaryOptions)).toString())
        const scx = ticketSize.times(1000);
        const initialDamHeight = (await rivuletInstance.damHeight.call(primaryOptions)).toString()
        await scarcityInstance.approve(rivuletInstance.address, scx.toString(), primaryOptions)
        await scarcityInstance.mint(accounts[0], scx.plus(100), primaryOptions)
        const myBalance = (await scarcityInstance.balanceOf(accounts[0])).toString()
        const allowance = (await scarcityInstance.allowance.call(accounts[0], rivulet.address, primaryOptions)).toString()
        console.log(`required ${scx.toString()}, myBalance: ${myBalance}`)
        console.log('allowance: ' + allowance)
        //const result = (await haldirInstance.stake.call(scx.toString(), "0", primaryOptions)).toString()
        await rivuletInstance.stake(scx.toString(), "0", primaryOptions)

        const daiBalance = (await daiInstance.balanceOf(rivuletInstance.address)).toString()
        console.log('dai: ' + daiBalance)
        const myDaiBalanceBefore = new bigNumber((await daiInstance.balanceOf(accounts[0], primaryOptions)).toString())

        await time.advanceTimeAndBlock(100)
        console.log('drip call: maxHeight ' + (await rivuletInstance.drip.call()).toString())
        await rivuletInstance.drip() //bug in drip. IS the maths of maxheight correct
        const damHeightAfter = (await rivuletInstance.damHeight.call(primaryOptions)).toString()
        console.log(`Dam before ${initialDamHeight}, damn after ${damHeightAfter}`)
        const bigDamHeightBefore = new bigNumber(initialDamHeight)
        const bigDamHeightAfter = new bigNumber(damHeightAfter)
        assert.isTrue(bigDamHeightAfter.isGreaterThan(bigDamHeightBefore))
        await rivuletInstance.unstake(scx.toString(), primaryOptions)
        const myDaiBalanceAfter = new bigNumber((await daiInstance.balanceOf(accounts[0], primaryOptions)).toString())
        console.log('dai balance change: ' + myDaiBalanceAfter.minus(myDaiBalanceBefore).toString())
        assert.isTrue(myDaiBalanceAfter.isGreaterThan(myDaiBalanceBefore))
    })
})

contract('rivulet full duration', accounts => {
    var scarcityInstance, daiInstance, rivuletInstance, haldirInstance
    const primaryOptions = { from: accounts[0], gas: "0x6091b7" }
    const secondaryOptions = { from: accounts[1], gas: "0x6091b7" }
    setup(async () => {
        scarcityInstance = await scarcity.deployed()
        daiInstance = await dai.deployed()
        rivuletInstance = await rivulet.deployed()
        await scarcityInstance.mint(accounts[0], '10000000', primaryOptions)
        await scarcityInstance.mint(accounts[1], '10000000', primaryOptions)
        await daiInstance.transfer(accounts[1], '1000000000000000', primaryOptions)
        primary = accounts[0]
    })

    test("staking & unstaking without burning", async () => {
        const initialDai = (await rivuletInstance.initialDai.call(primaryOptions)).toNumber()
        await daiInstance.approve(rivuletInstance.address, '10000000000000000000', primaryOptions)
        await rivuletInstance.celebrant("1000000000000000000", primaryOptions)
        const ticketSize = new bigNumber((await rivuletInstance.ticketSize.call(primaryOptions)).toString())
        const scx = ticketSize.times(1000);
        const initialDamHeight = (await rivuletInstance.damHeight.call(primaryOptions)).toString()
        await scarcityInstance.approve(rivuletInstance.address, scx.toString(), primaryOptions)
        await scarcityInstance.mint(accounts[0], scx.plus(100), primaryOptions)
        const myBalance = (await scarcityInstance.balanceOf(accounts[0])).toString()
        const allowance = (await scarcityInstance.allowance.call(accounts[0], rivulet.address, primaryOptions)).toString()
        await rivuletInstance.stake(scx.toString(), "0", primaryOptions)

        const daiBalance = (await daiInstance.balanceOf(rivuletInstance.address)).toString()
        console.log('dai: ' + daiBalance)
        const myDaiBalanceBefore = new bigNumber((await daiInstance.balanceOf(accounts[0], primaryOptions)).toString())

        await time.advanceTimeAndBlock(1094399)//1094399
        console.log('drip call: maxHeight ' + (await rivuletInstance.drip.call()).toString())
        await rivuletInstance.drip() //bug in drip. IS the maths of maxheight correct
        const damHeightAfter = (await rivuletInstance.damHeight.call(primaryOptions)).toString()
        console.log(`Dam before ${initialDamHeight}, damn after ${damHeightAfter}`)
        const bigDamHeightBefore = new bigNumber(initialDamHeight)
        const bigDamHeightAfter = new bigNumber(damHeightAfter)
        assert.isTrue(bigDamHeightAfter.isGreaterThan(bigDamHeightBefore))
        await rivuletInstance.drainPond(primaryOptions)
        const myDaiBalanceAfter = new bigNumber((await daiInstance.balanceOf(accounts[0], primaryOptions)).toString())
        console.log('my dai balance change: ' + myDaiBalanceAfter.minus(myDaiBalanceBefore).toString())
        assert.isTrue(myDaiBalanceAfter.isGreaterThan(myDaiBalanceBefore))
        const rivuletDaiBalanceAfter = new bigNumber((await daiInstance.balanceOf(rivuletInstance.address)).toString())
        console.log('rivuletBalanceAfter: ' + rivuletDaiBalanceAfter.toString())
        const bigRivuletDaiBalanceBefore = new bigNumber(daiBalance)
        console.log('rivulet dai balance change: ' + bigRivuletDaiBalanceBefore.minus(rivuletDaiBalanceAfter))
        //todo:only half dai being drained
    })
})


contract('rivulet 2 stakers', accounts => {
    var scarcityInstance, daiInstance, rivuletInstance, haldirInstance
    const primaryOptions = { from: accounts[0], gas: "0x6091b7" }
    const secondaryOptions = { from: accounts[1], gas: "0x6091b7" }
    setup(async () => {
        scarcityInstance = await scarcity.deployed()
        daiInstance = await dai.deployed()
        rivuletInstance = await rivulet.deployed()
        await scarcityInstance.mint(accounts[0], '10000000', primaryOptions)
        await scarcityInstance.mint(accounts[1], '10000000', primaryOptions)
        await daiInstance.transfer(accounts[1], '1000000000000000', primaryOptions)
        primary = accounts[0]
    })

    test("staking & unstaking without burning", async () => {
        const initialDai = (await rivuletInstance.initialDai.call(primaryOptions)).toNumber()
        await daiInstance.approve(rivuletInstance.address, '10000000000000000000', primaryOptions)
        await rivuletInstance.celebrant("1000000000000000000", primaryOptions)
        const ticketSize = new bigNumber((await rivuletInstance.ticketSize.call(primaryOptions)).toString())
        const scx = ticketSize.times(1000);
        const initialDamHeight = (await rivuletInstance.damHeight.call(primaryOptions)).toString()
        await scarcityInstance.approve(rivuletInstance.address, scx.toString(), primaryOptions)
        await scarcityInstance.mint(accounts[0], scx.plus(100), primaryOptions)
        await scarcityInstance.approve(rivuletInstance.address, scx.toString(), secondaryOptions)
        await scarcityInstance.mint(accounts[1], scx, primaryOptions)

        await rivuletInstance.stake(scx.toString(), "0", primaryOptions)
        await rivuletInstance.stake(scx.toString(), "0", secondaryOptions)

        const daiBalance = new bigNumber((await daiInstance.balanceOf(rivuletInstance.address)).toString())
        console.log('dai: ' + daiBalance.toString())
        const firstBalance = new bigNumber((await daiInstance.balanceOf(accounts[0], primaryOptions)).toString())
        const secondBalance = new bigNumber((await daiInstance.balanceOf(accounts[1], primaryOptions)).toString())

        await time.advanceTimeAndBlock(2094399)
        console.log('drip call: maxHeight ' + (await rivuletInstance.drip.call()).toString())
        const damHeightAfter = (await rivuletInstance.damHeight.call(primaryOptions)).toString()
        console.log(`Dam before ${initialDamHeight}, damn after ${damHeightAfter}`)
        await rivuletInstance.drip()

        let pondOfFirst = new bigNumber((await rivuletInstance.ponds.call(accounts[0])).toString())
        let pondOfSecond = new bigNumber((await rivuletInstance.ponds.call(accounts[1])).toString())
        const ratio = daiBalance.dividedBy(pondOfFirst.plus(pondOfSecond))
        console.log(`dai in ponds: first, ${pondOfFirst.toString()}, second: ${pondOfSecond.toString()}`)
        console.log('ultimate ratio: ' + ratio.toString())

        await rivuletInstance.unstake(scx.dividedBy(2), primaryOptions)
        await rivuletInstance.drainPond(secondaryOptions)
        const firstBalanceAfter = new bigNumber((await daiInstance.balanceOf(accounts[0], primaryOptions)).toString())
        console.log('my dai balance change: ' + firstBalanceAfter.minus(firstBalance).toString())
        assert.isTrue(firstBalanceAfter.isGreaterThan(firstBalance))
        const rivuletDaiBalanceAfter = new bigNumber((await daiInstance.balanceOf(rivuletInstance.address)).toString())
        console.log('rivuletBalanceAfter: ' + rivuletDaiBalanceAfter.toString())
        const bigRivuletDaiBalanceBefore = new bigNumber(daiBalance)
        console.log('rivulet dai balance change: ' + bigRivuletDaiBalanceBefore.minus(rivuletDaiBalanceAfter))

        const secondBalanceAfter = new bigNumber((await daiInstance.balanceOf(accounts[1], primaryOptions)).toString())
        console.log('second balanceAfter: ' + secondBalanceAfter.toString())

        assert.isTrue(secondBalanceAfter.isGreaterThan(secondBalance))
        await rivuletInstance.unstake(scx.toString(), primaryOptions)

        const firstBalanceAfterTotalUnstake = new bigNumber((await daiInstance.balanceOf(accounts[0], primaryOptions)).toString())
        const withdrawnTotal = secondBalanceAfter.plus(firstBalanceAfterTotalUnstake)
        console.log('ratio of initial to withdrawn: ' + withdrawnTotal.dividedBy(bigRivuletDaiBalanceBefore).toString())



        pondOfFirst = new bigNumber((await rivuletInstance.ponds.call(accounts[0])).toString())
        pondOfSecond = new bigNumber((await rivuletInstance.ponds.call(accounts[1])).toString())

        console.log(`dai in ponds after: first, ${pondOfFirst.toString()}, second: ${pondOfSecond.toString()}`)
        const finalRivuletDaiBalance = (await daiInstance.balanceOf.call(rivuletInstance.address)).toString()
        console.log('final riv balance: ' + finalRivuletDaiBalance)
    })
})

contract('rivulet 3 stakers', accounts => {
    var scarcityInstance, daiInstance, rivuletInstance, haldirInstance
    const primaryOptions = { from: accounts[0], gas: "0x6091b7" }
    const secondaryOptions = { from: accounts[1], gas: "0x6091b7" }
    setup(async () => {
        scarcityInstance = await scarcity.deployed()
        daiInstance = await dai.deployed()
        rivuletInstance = await rivulet.deployed()
        await scarcityInstance.mint(accounts[0], '10000000', primaryOptions)
        await scarcityInstance.mint(accounts[1], '10000000', primaryOptions)
        await daiInstance.transfer(accounts[1], '1000000000000000', primaryOptions)
        primary = accounts[0]
    })

    test("staking should earn 1/10th what burning does. Unstaking should give only staked SCX back", async () => {
        const initialDai = (await rivuletInstance.initialDai.call(primaryOptions)).toNumber()
        await daiInstance.approve(rivuletInstance.address, '10000000000000000000', primaryOptions)
        await rivuletInstance.celebrant("1000000000000000000", primaryOptions)
        const ticketSize = new bigNumber((await rivuletInstance.ticketSize.call(primaryOptions)).toString())
        const scx = ticketSize.times(1000);
        const burnt = scx.dividedBy(2)

        await scarcityInstance.approve(rivuletInstance.address, scx.toString(), primaryOptions)
        await scarcityInstance.mint(accounts[0], scx.plus(100), primaryOptions)
        await scarcityInstance.approve(rivuletInstance.address, scx.plus(burnt).toString(), secondaryOptions)
        await scarcityInstance.mint(accounts[1], scx.plus(burnt), primaryOptions)

        await rivuletInstance.stake(scx.toString(), "0", primaryOptions)
        await rivuletInstance.stake(scx.toString(), burnt.toString(), secondaryOptions)

        const firstBalance = new bigNumber((await daiInstance.balanceOf(accounts[0], primaryOptions)).toString())
        const secondBalance = new bigNumber((await daiInstance.balanceOf(accounts[1], primaryOptions)).toString())

        const ticketsOfFirst = new bigNumber((await rivuletInstance.tickets.call(accounts[0])).toString())
        const ticketsOfSecond = new bigNumber((await rivuletInstance.tickets.call(accounts[1])).toString())

        assert.isTrue(ticketsOfFirst.times(6).isEqualTo(ticketsOfSecond))

        await time.advanceTimeAndBlock(1000)
        await rivuletInstance.drainPond(primaryOptions)
        await rivuletInstance.drainPond(secondaryOptions)

        const firstBalanceAfter = new bigNumber((await daiInstance.balanceOf.call(accounts[0])).toString())
        const secondBalanceAfter = new bigNumber((await daiInstance.balanceOf.call(accounts[1])).toString())

        const netFirst = firstBalanceAfter.minus(firstBalance)
        const netSecond = secondBalanceAfter.minus(secondBalance)

        const ratio = netSecond.dividedBy(netFirst).toNumber()

        assert.isAtLeast(ratio, 5.6)
        assert.isAtMost(ratio, 6.3)
        const thirdOfSecondStake = parseInt(new bigNumber((await rivuletInstance.staked.call(accounts[1])).toString()).dividedBy(3).plus(4).toNumber())

        const scxBalanceBeforeUnstake = new bigNumber((await scarcityInstance.balanceOf(accounts[1])))

        await rivuletInstance.unstake(thirdOfSecondStake.toString(), secondaryOptions)

        const scxBalanceAfterUnstake = new bigNumber((await scarcityInstance.balanceOf(accounts[1])))
        const netScxPosition = scxBalanceAfterUnstake.minus(scxBalanceBeforeUnstake)
        assert.equal(thirdOfSecondStake.toString(), netScxPosition.toString())

        const ticketsAfter = new bigNumber((await rivuletInstance.tickets.call(accounts[1])).toString())
        const netTickets = ticketsOfSecond.minus(ticketsAfter)
        console.log(`ticketsBefore: ${ticketsOfSecond}, ticketsAfter: ${ticketsAfter}`)
        const ratioOfTickets = ticketsAfter.dividedBy(netTickets).toNumber()
        assert.equal(ratioOfTickets, 2)// = 4000/2000
    })
})


contract('rivulet 4 stakers', accounts => {
    var scarcityInstance, daiInstance, rivuletInstance, haldirInstance
    const primaryOptions = { from: accounts[0], gas: "0x6091b7" }
    const secondaryOptions = { from: accounts[1], gas: "0x6091b7" }
    setup(async () => {
        scarcityInstance = await scarcity.deployed()
        daiInstance = await dai.deployed()
        rivuletInstance = await rivulet.deployed()
        await scarcityInstance.mint(accounts[0], '10000000', primaryOptions)
        await scarcityInstance.mint(accounts[1], '10000000', primaryOptions)
        await daiInstance.transfer(accounts[1], '1000000000000000', primaryOptions)
        primary = accounts[0]
    })

    test("withdrawing all stake should pause growth", async () => {
        const initialDai = (await rivuletInstance.initialDai.call(primaryOptions)).toNumber()
        await daiInstance.approve(rivuletInstance.address, '10000000000000000000', primaryOptions)
        await rivuletInstance.celebrant("1000000000000000000", primaryOptions)
        const ticketSize = new bigNumber((await rivuletInstance.ticketSize.call(primaryOptions)).toString())
        const scx = ticketSize.times(1000);
        const burnt = scx.dividedBy(2)

        await scarcityInstance.approve(rivuletInstance.address, scx.toString(), primaryOptions)
        await scarcityInstance.mint(accounts[0], scx.plus(100), primaryOptions)
        await scarcityInstance.approve(rivuletInstance.address, scx.plus(burnt).toString(), secondaryOptions)
        await scarcityInstance.mint(accounts[1], scx.plus(burnt), primaryOptions)

        await rivuletInstance.stake(scx.toString(), "0", primaryOptions)
        await rivuletInstance.stake(scx.toString(), burnt.toString(), secondaryOptions)
        const damHeightBefore = new bigNumber((await rivuletInstance.damHeight.call()).toString())

        await time.advanceTimeAndBlock(10)
        await rivuletInstance.drip()
        const damHeightAfterGrowth = new bigNumber((await rivuletInstance.damHeight.call()).toString())


        assert.isTrue(damHeightAfterGrowth.isGreaterThan(damHeightBefore))

        await rivuletInstance.unstake(scx.toString(), primaryOptions)
        await rivuletInstance.unstake(scx.plus(burnt).toString(), secondaryOptions)

        const totalTickets = new bigNumber((await rivuletInstance.totalTickets.call()).toString())

        assert.equal(totalTickets.toNumber(), 0)
        await time.advanceTimeAndBlock(10)
        await rivuletInstance.drip()
        const damHeightAfterTotalWithdrawal = new bigNumber((await rivuletInstance.damHeight.call()).toString())

        assert.equal(damHeightAfterTotalWithdrawal.toString(), damHeightAfterGrowth.toString())

        await scarcityInstance.approve(rivuletInstance.address, scx.toString(), primaryOptions)
        await rivuletInstance.stake(scx.toString(), "0", primaryOptions)
        await time.advanceTimeAndBlock(10)
        await rivuletInstance.drip()
        const damHeightAfterRestake = new bigNumber((await rivuletInstance.damHeight.call()).toString())
        assert.isTrue(damHeightAfterRestake.isGreaterThan(damHeightAfterTotalWithdrawal))

    })
})
/*
contract('rivulet 5 stakers', accounts => {
    var scarcityInstance, daiInstance, rivuletInstance, haldirInstance
    const primaryOptions = { from: accounts[0], gas: "0x6091b7" }
    const secondaryOptions = { from: accounts[1], gas: "0x6091b7" }
    setup(async () => {
        scarcityInstance = await scarcity.deployed()
        daiInstance = await dai.deployed()
        rivuletInstance = await rivulet.deployed()
        await scarcityInstance.mint(accounts[0], '10000000', primaryOptions)
        await scarcityInstance.mint(accounts[1], '10000000', primaryOptions)
        await daiInstance.transfer(accounts[1], '1000000000000000', primaryOptions)
        primary = accounts[0]
    })

    test("max tickets", async () => {
        await rivuletInstance.setTicketParameters(10,10, primaryOptions)
        const initialDai = (await rivuletInstance.initialDai.call(primaryOptions)).toNumber()
        await daiInstance.approve(rivuletInstance.address, '10000000000000000000', primaryOptions)
        await rivuletInstance.celebrant("1000000000000000000", primaryOptions)
        const scx = ticketSize.times(1000);
        const burnt = scx.dividedBy(2)

        await scarcityInstance.approve(rivuletInstance.address, scx.toString(), primaryOptions)
        await scarcityInstance.mint(accounts[0], scx.plus(100), primaryOptions)
        await scarcityInstance.approve(rivuletInstance.address, scx.plus(burnt).toString(), secondaryOptions)
        await scarcityInstance.mint(accounts[1], scx.plus(burnt), primaryOptions)

        await rivuletInstance.stake(scx.toString(), "0", primaryOptions)
        await rivuletInstance.stake(scx.toString(), burnt.toString(), secondaryOptions)
        const damHeightBefore = new bigNumber((await rivuletInstance.damHeight.call()).toString())

        await time.advanceTimeAndBlock(10)
        await rivuletInstance.drip()
        const damHeightAfterGrowth = new bigNumber((await rivuletInstance.damHeight.call()).toString())


        assert.isTrue(damHeightAfterGrowth.isGreaterThan(damHeightBefore))

        await rivuletInstance.unstake(scx.toString(), primaryOptions)
        await rivuletInstance.unstake(scx.plus(burnt).toString(), secondaryOptions)

        const totalTickets = new bigNumber((await rivuletInstance.totalTickets.call()).toString())

        assert.equal(totalTickets.toNumber(), 0)
        await time.advanceTimeAndBlock(10)
        await rivuletInstance.drip()
        const damHeightAfterTotalWithdrawal = new bigNumber((await rivuletInstance.damHeight.call()).toString())

        assert.equal(damHeightAfterTotalWithdrawal.toString(), damHeightAfterGrowth.toString())

        await scarcityInstance.approve(rivuletInstance.address, scx.toString(), primaryOptions)
        await rivuletInstance.stake(scx.toString(), "0", primaryOptions)
        await time.advanceTimeAndBlock(10)
        await rivuletInstance.drip()
        const damHeightAfterRestake = new bigNumber((await rivuletInstance.damHeight.call()).toString())
        assert.isTrue(damHeightAfterRestake.isGreaterThan(damHeightAfterTotalWithdrawal))

    })
})

*/


//ticket size
/*
test("staking & unstaking with some burning", async () => {


})


test("unstaking all scx pauses growth", async () => {


})

test("staking above max tickets fails", async () => {


})

test("for maxTickets == 0, increasing SCX totalSupply increases tickets, decreasing SCX decreases tickets", async () => {


})

test("using up all dai gracefully pauses Rivulet", async () => {

})
*/