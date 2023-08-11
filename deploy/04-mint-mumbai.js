const {ethers, network} = require("hardhat")

module.exports = async function ({ getNamedAccounts }) {
    const {deployer} = await getNamedAccounts()
    const chainId = network.config.chainId

        // Random IPFS NFT
        const randomIpfsNft = await ethers.getContract("RandomIpfsNft", deployer)
        const mintFee = await randomIpfsNft.getMintFee()
        const randomIpfsNftMintTx = await randomIpfsNft.requestNft({ value: mintFee.toString() })
        const randomIpfsNftMintTxReceipt = await randomIpfsNftMintTx.wait(1)
        const tokenCounter = await randomIpfsNft.getTokenCounter()
        // Need to listen for response
        await new Promise(async (resolve, reject) => {
            setTimeout(() => reject("Timeout: 'NFTMinted' event did not fire"), 300000) // 5 minute timeout time
            // setup listener for our event
            randomIpfsNft.once("NftMinted", async () => {
                console.log(`Random IPFS NFT index ${tokenCounter.toString()} tokenURI: ${await randomIpfsNft.tokenURI(tokenCounter.toString())}`)
                resolve()
            })
        })

    }
    module.exports.tags = ["mint-mumbai"]