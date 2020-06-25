const Rivulet = artifacts.require('Rivulet')
const MockScarcity = artifacts.require("MockScarcity")
const MockDai = artifacts.require("MockDai")
const Celeborn = artifacts.require("Celeborn")

const fs = require('fs')
module.exports = async function (deployer, network, accounts) {
    let scarcityAddress, daiAddress

    if (network === 'development') {
        await deployer.deploy(MockScarcity, 'MockScarcity', 'MSCX')
        await deployer.deploy(MockDai, 'MockDai', 'MDaiN')
        let mockScarcityInstance = await MockScarcity.deployed()
        let mockDaiInstance = await MockDai.deployed()
        const tokens = dependencyAddresses()
        if (tokens.length > 0) {
            scarcityAddress = tokens[0]
            daiAddress = tokens[1]
        } else {
            scarcityAddress = mockScarcityInstance.address
            daiAddress = mockDaiInstance.address
        }

    }
    else {
        scarcityAddress = '0xff1614C6B220b24D140e64684aAe39067A0f1CD0'
        daiAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
    }
    await deployer.deploy(Celeborn)
    const celebornInstance = await Celeborn.deployed()
    console.log(JSON.stringify({ scarcityAddress, daiAddress }))
    await deployer.deploy(Rivulet)
    const rivuletInstance = await Rivulet.deployed()
    await rivuletInstance.seed(daiAddress, scarcityAddress,celebornInstance.address, 0, 10, 0)
    await rivuletInstance.setTicketParameters('1000', 0)

  
    await celebornInstance.seed(rivuletInstance.address, daiAddress)
}

const dependencyAddresses = () => {
    const scarcityLocation = "/home/justin/weidai ecosystem/Sisyphus/scarcityAddress.txt"
    const daiLocation = '/home/justin/weidai ecosystem/weidai/client/src/tokenLocation.json'
    if (fs.existsSync(scarcityLocation)) {
        const scx = fs.readFileSync(scarcityLocation).toString()
        fs.writeFileSync(scarcityLocation, "0x0")
        console.log('scarcity address pickup: ' + scx)
        if (fs.existsSync(daiLocation) && scx !== '0x0' && scx !== '') {
            const tokenJson = JSON.parse(fs.readFileSync(daiLocation))
            const dai = tokenJson.dai;
            return [scx, dai]
        }
    }
    return []
}