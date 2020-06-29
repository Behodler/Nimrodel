const Rivulet = artifacts.require('Rivulet')
const MockScarcity = artifacts.require("MockScarcity")
const MockDai = artifacts.require("MockDai")
const Celeborn = artifacts.require("Celeborn")
const Miruvor = artifacts.require("Miruvor")

const fs = require('fs')
module.exports = async function (deployer, network, accounts) {
    let scarcityAddress, daiAddress, weidaiAddress
    let behodlerAddressList = {
        scx: '0xff1614C6B220b24D140e64684aAe39067A0f1CD0',
        behodler: '0x6FE97991e5933b711dEe832eE98F86153F3AF929',
        lachesis: '0x22B714563c99f29c8374dc32E6dfC9b1DF415Ffe',
        janus: '0x6e3431E6D6233911ca6f94Efb47EF8906A781AF4',
        weth: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        registry: '0x37b73a2c6f4381C48c892915E0eD21885aBF4bc3',
    }
    if (network === 'development') {
        await deployer.deploy(MockScarcity, 'MockScarcity', 'MSCX')
        await deployer.deploy(MockDai, 'MockDai', 'MDaiN')
        let mockScarcityInstance = await MockScarcity.deployed()
        let mockDaiInstance = await MockDai.deployed()
        const tokens = dependencyAddresses()
        if (tokens.length > 0) {
            console.log('picket up tokenlocation')
            scarcityAddress = tokens[0]
            daiAddress = tokens[1]
            weidaiAddress = tokens[2]
        } else {
            scarcityAddress = mockScarcityInstance.address
            daiAddress = mockDaiInstance.address
        }
        behodlerAddressList = getBehodlerDevList()
    }
    else {
        scarcityAddress = '0xff1614C6B220b24D140e64684aAe39067A0f1CD0'
        daiAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
    }
    await deployer.deploy(Celeborn)
    const celebornInstance = await Celeborn.deployed()
    console.log(JSON.stringify({ scarcityAddress, daiAddress, weidaiAddress }))
    await deployer.deploy(Rivulet)
    const rivuletInstance = await Rivulet.deployed()
    await rivuletInstance.seed(daiAddress, scarcityAddress, celebornInstance.address, 0, 10, 0)
    await rivuletInstance.setTicketParameters('1000', 0)

    await deployer.deploy(Miruvor)
    const miruvorInstance = await Miruvor.deployed()

    await miruvorInstance.seed(behodlerAddressList.scx, behodlerAddressList.behodler,
        behodlerAddressList.lachesis, behodlerAddressList.janus, behodlerAddressList.weth,
        behodlerAddressList.registry, daiAddress, weidaiAddress)
    await celebornInstance.seed(rivuletInstance.address, daiAddress)
    let NimrodelAddresses = {}
    NimrodelAddresses[network] =
    {
        Rivulet: rivuletInstance.address,
        Celeborn: celebornInstance.address,
        Miruvor: miruvorInstance.address
    }


    fs.writeFileSync('/home/justin/weidai ecosystem/nimrodelAddresses.json', JSON.stringify(NimrodelAddresses,null,4))
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
            const weidai = tokenJson.weiDai
            return [scx, dai, weidai]
        }
    }
    return []
}

const getBehodlerDevList = () => {
    let behodlerAddressList = {
        scx: '0xff1614C6B220b24D140e64684aAe39067A0f1CD0',
        behodler: '0x6FE97991e5933b711dEe832eE98F86153F3AF929',
        lachesis: '0x22B714563c99f29c8374dc32E6dfC9b1DF415Ffe',
        janus: '0x6e3431E6D6233911ca6f94Efb47EF8906A781AF4',
        weth: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        registry: '0x37b73a2c6f4381C48c892915E0eD21885aBF4bc3',
    }
    const behodlerABILocation = "/home/justin/weidai ecosystem/behodler/BehodlerABIAddressMapping.json"
    abiJSON = JSON.parse(fs.readFileSync(behodlerABILocation).toString())
        .filter(b => b.name == 'development')[0]["list"]

    let retrieve = retrieveFactory(abiJSON)
    behodlerAddressList.scx = retrieve('Scarcity')
    behodlerAddressList.behodler = retrieve('Behodler')
    behodlerAddressList.lachesis = retrieve('Lachesis')
    behodlerAddressList.janus = retrieve('Janus')
    behodlerAddressList.weth = retrieve('MockWeth')
    behodlerAddressList.registry = retrieve('PyroTokenRegistry')
    return behodlerAddressList
}




const retrieveFactory = (list) => (key) => {
    for (let i = 0; i < list.length; i++) {
        if (list[i].contract == key) {
            return list[i].address
        }
    }
}