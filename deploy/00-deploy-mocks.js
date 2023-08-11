const { network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")

const BASE_FEE = ethers.utils.parseEther("0.25") // 0.25 is the premium. It costs 0.25 Link per request
const GAS_PRICE_LINK = 1e9 // calculated value based on the gas price of the chain.
const DECIMALS = "18"
const INITIAL_PRICE = ethers.utils.parseUnits("2000", "ether")
// ETH price $1,000,000,000

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const args = [BASE_FEE, GAS_PRICE_LINK]

    if (developmentChains.includes(network.name)) {
        log("Local network detected! Deploying mocks...")
        // deploy a mock vrfcoordinator
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: args,
        })

        log("Mocks Deployed!")
        log("-----------------------------------------------")
    }
}

module.exports.tags = ["all", "mocks"]