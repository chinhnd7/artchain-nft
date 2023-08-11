const {network, ethers} = require("hardhat")
const {developmentChains, networkConfig} = require("../helper-hardhat-config")
const {verify} = require("../utils/verify")
const {storeImages, storeTokenUriMetadata} = require("../utils/uploadToPinata")

const imagesLocation = "./images/cardNft"

let tokenUris = [
    'ipfs://QmbiSooYqGnafXk73XZTxw5NKgM5gDha9cFCouTPoUfGif',
    'ipfs://QmUeapUmuda19ADKS5SqQ1N6ro1n9MCsT6KFm6eYda34JZ',
    'ipfs://Qmeys65BmhsDpq6ufYyeNGqwHWNnGRzXdSZpdrLMxakrE9'
]

const FUND_AMOUNT = "1000000000000000000000" // 10 LINK

const metadataTemplate = {
    name: "",
    description: "",
    image: "",
    attributes: [
        {
            trait_type: "Cuteness",
            value: 100,
        }
    ],
}

module.exports = async function ({getNamedAccounts, deployments}) {
    const {deploy, log} = deployments
    const {deployer} = await getNamedAccounts()
    const chainId = network.config.chainId
    let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock

    // get the IPFS hashes of our images
    if (process.env.UPLOAD_TO_PINATA == "true") {
        tokenUris = await handleTokenUris()
    }
    // 1. With our own IPFS node. https://docs.ipfs.tech/
    // 2. Pinata https://www.pinata.cloud/
    // 3. NFT.storage https://nft.storage/

    if(developmentChains.includes(network.name)) {
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const tx = await vrfCoordinatorV2Mock.createSubscription()
        const txReceipt = await tx.wait(1)
        subscriptionId = txReceipt.events[0].args.subId
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2
        subscriptionId = networkConfig[chainId].subscriptionId
    }

    log("------------------------------------")

    const args = [
        vrfCoordinatorV2Address, 
        subscriptionId, 
        networkConfig[chainId].gasLane, 
        networkConfig[chainId].callbackGasLimit,
        tokenUris,
        networkConfig[chainId].mintFee,
    ]

    const randomIpfsNft = await deploy("RandomIpfsNft", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if (chainId == 31337) {
        await vrfCoordinatorV2Mock.addConsumer(
            subscriptionId,
            randomIpfsNft.address
        )
    }

    log("------------------------------------")

    if (network.name == "mumbai") {
        if (process.env.MUMBAI_API_KEY) {
            log("Verifying...")
            await verify(randomIpfsNft.address, args)
        }
    }
}

async function handleTokenUris () {
    tokenUris = []
    // store the Image in IPFS
    // store the metadata in IPFS
    const {responses: imageUploadResponses, files} = await storeImages(imagesLocation)

    for (imageUploadResponseIndex in imageUploadResponses) {
        // create metadata
        // upload the metadata
        let tokenUriMetadata = { ...metadataTemplate }
        // cat-hero.png, fox-hero.png
        tokenUriMetadata.name = files[imageUploadResponseIndex].replace(".png", "")
        tokenUriMetadata.description = `A ${tokenUriMetadata.name} card!`
        tokenUriMetadata.image = `ipfs://${imageUploadResponses[imageUploadResponseIndex].IpfsHash}`
        console.log(`Uploading ${tokenUriMetadata.name}...`)
        // store the JSON to pinata / IPFS
        const metadataUploadResponse = await storeTokenUriMetadata(tokenUriMetadata)
        tokenUris.push(`ipfs://${metadataUploadResponse.IpfsHash}`)
    }
    console.log("Token URIs Uploaded! They are:")
    console.log(tokenUris)
    return tokenUris
}

module.exports.tags = ["all", "randomipfs", "main"]