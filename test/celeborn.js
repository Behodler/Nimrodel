const async = require('./helpers/async.js')
const expectThrow = require('./helpers/expectThrow').handle
const bigNumber = require('bignumber.js')
const test = async.test
const setup = async.setup
const time = require('./helpers/time')
const rivulet = artifacts.require('Rivulet')
const dai = artifacts.require('MockDai')
const celeborn = artifacts.require('Celeborn')

contract('celeborn 1', accounts => {
    var celebornInstance, rivuletInstance
    const primaryOptions = { from: accounts[0], gas: "0x6091b7" }
    const secondaryOptions = { from: accounts[1], gas: "0x6091b7" }
    const ONE = new bigNumber("1000000000000000000")
    setup(async () => {
        daiInstance = await dai.deployed()
        rivuletInstance = await rivulet.deployed()
        celebornInstance = await celeborn.deployed()
    })

    test("set a sponsor in each slot should save only the appropriate data", async () => {
        const initialDaiBefore = (await rivuletInstance.initialDai.call()).toNumber()
        assert.equal(initialDaiBefore, 0)
        await daiInstance.approve(rivuletInstance.address, ONE.times(150))

        //bronze
        await celebornInstance.sponsor(0, ONE, asciiToBytes('bronze test'), asciiToBytes('logo.com'), asciiToBytes('woof/hello'), asciiToBytes('behold my amazing message'))

        const initialDaiAfter = new bigNumber((await rivuletInstance.initialDai.call()).toString())

        assert.equal(initialDaiAfter.toString(), ONE.toString())
        const bronzeCompany = hexToAscii((await celebornInstance.getSponsorshipData.call(0, 0)).toString())
        const bronzeLogo = hexToAscii((await celebornInstance.getSponsorshipData.call(0, 1)).toString())
        const bronzeSite = hexToAscii((await celebornInstance.getSponsorshipData.call(0, 2)).toString())
        const bronzeMessage = hexToAscii((await celebornInstance.getSponsorshipData.call(0, 3)).toString())

        assert.equal(bronzeCompany, "")
        assert.equal(bronzeLogo, "")
        assert.equal(bronzeSite, "")
        assert.equal(bronzeMessage, "behold my amazing message")

        //silver
        await celebornInstance.sponsor(10, ONE.times(20), asciiToBytes('silver test'), asciiToBytes('silver'), asciiToBytes('woof/silver'), asciiToBytes('behold my silver message'))

        const initialDaiAfterSilver = new bigNumber((await rivuletInstance.initialDai.call()).toString())

        assert.equal(initialDaiAfterSilver.toString(), ONE.times(20).plus(ONE).toString())
        const silverCompany = hexToAscii((await celebornInstance.getSponsorshipData.call(10, 0)).toString())
        const silverLogo = hexToAscii((await celebornInstance.getSponsorshipData.call(10, 1)).toString())
        const silverSite = hexToAscii((await celebornInstance.getSponsorshipData.call(10, 2)).toString())
        const silverMessage = hexToAscii((await celebornInstance.getSponsorshipData.call(10, 3)).toString())

        assert.equal(silverCompany, "silver test")
        assert.equal(silverLogo, "")
        assert.equal(silverSite, "woof/silver")
        assert.equal(silverMessage, "behold my silver message")

        //gold
        await celebornInstance.sponsor(13, ONE.times(100), asciiToBytes('gold test'), asciiToBytes('gold logo'), asciiToBytes('woof/gold'), asciiToBytes('behold my gold message'))

        const initialDaiAfterGold = new bigNumber((await rivuletInstance.initialDai.call()).toString())

        assert.equal(initialDaiAfterGold.toString(), ONE.times(121).toString())
        const goldCompany = hexToAscii((await celebornInstance.getSponsorshipData.call(13, 0)).toString())
        const goldLogo = hexToAscii((await celebornInstance.getSponsorshipData.call(13, 1)).toString())
        const goldSite = hexToAscii((await celebornInstance.getSponsorshipData.call(13, 2)).toString())
        const goldMessage = hexToAscii((await celebornInstance.getSponsorshipData.call(13, 3)).toString())

        assert.equal(goldCompany, "gold test")
        assert.equal(goldLogo, "gold logo")
        assert.equal(goldSite, "woof/gold")
        assert.equal(goldMessage, "behold my gold message")
    })

    var asciiToBytes = (text) => {
        const hex = web3.utils.toHex(text)
        return web3.utils.hexToBytes(hex)
    }

    var hexToAscii = (hex) => {
        const ascii = web3.utils.hexToAscii(hex)
        return (ascii === '\u0000') ? '' : ascii

    }
})

contract('celeborn 2', accounts => {
    var celebornInstance, rivuletInstance
    const primaryOptions = { from: accounts[0], gas: "0x6091b7" }
    const secondaryOptions = { from: accounts[1], gas: "0x6091b7" }
    const ONE = new bigNumber("1000000000000000000")
    setup(async () => {
        daiInstance = await dai.deployed()
        rivuletInstance = await rivulet.deployed()
        celebornInstance = await celeborn.deployed()
        await time.advanceTimeAndBlock(20000)
    })

    test("invalid slot", async () => {

        await daiInstance.approve(rivuletInstance.address, ONE.times(150))
        await expectThrow(celebornInstance.sponsor(11, ONE, asciiToBytes('bronze test'), asciiToBytes('logo.com'), asciiToBytes('woof/hello'), asciiToBytes('behold my amazing message')), "slot-value mismatch")
        await expectThrow(celebornInstance.sponsor(13, ONE.times(20), asciiToBytes('bronze test'), asciiToBytes('logo.com'), asciiToBytes('woof/hello'), asciiToBytes('behold my amazing message')), "slot-value mismatch")
        await expectThrow(celebornInstance.sponsor(14, ONE.times(20), asciiToBytes('bronze test'), asciiToBytes('logo.com'), asciiToBytes('woof/hello'), asciiToBytes('behold my amazing message')), "invalid slot number")

    })

    var asciiToBytes = (text) => {
        const hex = web3.utils.toHex(text)
        return web3.utils.hexToBytes(hex)
    }

    var hexToAscii = (hex) => {
        const ascii = web3.utils.hexToAscii(hex)
        return (ascii === '\u0000') ? '' : ascii

    }
})


contract('celeborn 3', accounts => {
    var celebornInstance, rivuletInstance
    const primaryOptions = { from: accounts[0], gas: "0x6091b7" }
    const secondaryOptions = { from: accounts[1], gas: "0x6091b7" }
    const ONE = new bigNumber("1000000000000000000")
    setup(async () => {
        daiInstance = await dai.deployed()
        rivuletInstance = await rivulet.deployed()
        celebornInstance = await celeborn.deployed()

    })

    test("displacing existing sponsors before time threshold fails", async () => {
        await daiInstance.approve(rivuletInstance.address, ONE.times(1500))
        //bronze
        for (let i = 0; i < 10; i++)
            await celebornInstance.sponsor(i, ONE, asciiToBytes('bronze test'), asciiToBytes('logo.com'), asciiToBytes('woof/hello'), asciiToBytes('behold my amazing message'))

        for (let i = 0; i < 10; i++)
            await expectThrow(celebornInstance.sponsor(i, ONE, asciiToBytes('bronze test'), asciiToBytes('logo.com'), asciiToBytes('woof/hello'), asciiToBytes('behold my amazing message')), "current sponsor can't be displaced yet.")

        //silver
        for (let i = 10; i < 13; i++)
            await celebornInstance.sponsor(i, ONE.times(20), asciiToBytes('bronze test'), asciiToBytes('logo.com'), asciiToBytes('woof/hello'), asciiToBytes('behold my amazing message'))

        for (let i = 10; i < 13; i++)
            await expectThrow(celebornInstance.sponsor(i, ONE.times(20), asciiToBytes('bronze test'), asciiToBytes('logo.com'), asciiToBytes('woof/hello'), asciiToBytes('behold my amazing message')), "current sponsor can't be displaced yet.")

        //gold
        await celebornInstance.sponsor(13, ONE.times(100), asciiToBytes('bronze test'), asciiToBytes('logo.com'), asciiToBytes('woof/hello'), asciiToBytes('behold my amazing message'))
        await expectThrow(celebornInstance.sponsor(13, ONE.times(100), asciiToBytes('bronze test'), asciiToBytes('logo.com'), asciiToBytes('woof/hello'), asciiToBytes('behold my amazing message')), "current sponsor can't be displaced yet.")

    })

    var asciiToBytes = (text) => {
        const hex = web3.utils.toHex(text)
        return web3.utils.hexToBytes(hex)
    }

    var hexToAscii = (hex) => {
        const ascii = web3.utils.hexToAscii(hex)
        return (ascii === '\u0000') ? '' : ascii

    }
})




contract('celeborn 3', accounts => {
    var celebornInstance, rivuletInstance
    const primaryOptions = { from: accounts[0], gas: "0x6091b7" }
    const secondaryOptions = { from: accounts[1], gas: "0x6091b7" }
    const ONE = new bigNumber("1000000000000000000")
    setup(async () => {
        daiInstance = await dai.deployed()
        rivuletInstance = await rivulet.deployed()
        celebornInstance = await celeborn.deployed()

    })


    test("displacing existing sponsors after time threshold passes", async () => {
        const bronzeTime = 12000;
        const silverTime = 240000;
        const goldTime = 1200000;

        await daiInstance.approve(rivuletInstance.address, ONE.times(1500))
        //bronze
        for (let i = 0; i < 10; i++)
            await celebornInstance.sponsor(i, ONE, asciiToBytes('bronze test'), asciiToBytes('logo.com'), asciiToBytes('woof/hello'), asciiToBytes('behold my amazing message'))

        //silver
        for (let i = 10; i < 13; i++)
            await celebornInstance.sponsor(i, ONE.times(20), asciiToBytes('bronze test'), asciiToBytes('logo.com'), asciiToBytes('woof/hello'), asciiToBytes('behold my amazing message'))

        //gold
        await celebornInstance.sponsor(13, ONE.times(100), asciiToBytes('bronze test'), asciiToBytes('logo.com'), asciiToBytes('woof/hello'), asciiToBytes('behold my amazing message'))


        await time.advanceTimeAndBlock(bronzeTime)
        await celebornInstance.sponsor(0, ONE, asciiToBytes('bronze test'), asciiToBytes('logo.com'), asciiToBytes('woof/hello'), asciiToBytes('displaced newbie bronze'))
        const bronzeMessage = hexToAscii((await celebornInstance.getSponsorshipData.call(0, 3)).toString())
        assert.equal(bronzeMessage, "displaced newbie bronze")

        await time.advanceTimeAndBlock(silverTime - bronzeTime)
        await celebornInstance.sponsor(11, ONE.times(20), asciiToBytes('silver new company'), asciiToBytes('logo.com'), asciiToBytes('silver new site'), asciiToBytes('displaced newbie silver'))
        const silverMessage = hexToAscii((await celebornInstance.getSponsorshipData.call(11, 3)).toString())
        const silverCompany = hexToAscii((await celebornInstance.getSponsorshipData.call(11, 0)).toString())
        const silverSite = hexToAscii((await celebornInstance.getSponsorshipData.call(11, 2)).toString())

        assert.equal(silverMessage, "displaced newbie silver")
        assert.equal(silverCompany, "silver new company")
        assert.equal(silverSite, "silver new site")

        await time.advanceTimeAndBlock(goldTime - silverTime - bronzeTime)
        await celebornInstance.sponsor(13, ONE.times(100), asciiToBytes('gold new company'), asciiToBytes('gold displaced logo'), asciiToBytes('gold new site'), asciiToBytes('displaced newbie gold'))
        const goldMessage = hexToAscii((await celebornInstance.getSponsorshipData.call(13, 3)).toString())
        const goldCompany = hexToAscii((await celebornInstance.getSponsorshipData.call(13, 0)).toString())
        const goldSite = hexToAscii((await celebornInstance.getSponsorshipData.call(13, 2)).toString())
        const goldLogo = hexToAscii((await celebornInstance.getSponsorshipData.call(13, 1)).toString())

        assert.equal(goldMessage, "displaced newbie gold")
        assert.equal(goldCompany, "gold new company")
        assert.equal(goldSite, "gold new site")
        assert.equal(goldLogo, "gold displaced logo")
    })

    var asciiToBytes = (text) => {
        const hex = web3.utils.toHex(text)
        return web3.utils.hexToBytes(hex)
    }

    var hexToAscii = (hex) => {
        const ascii = web3.utils.hexToAscii(hex)
        return (ascii === '\u0000') ? '' : ascii

    }
})
