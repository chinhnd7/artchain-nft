const { Alchemy, Network } = require("alchemy-sdk");
const alchemyApiKey = process.env.MUMBAI_API_KEY_NFT;

const config = {
  apiKey: alchemyApiKey,
  network: Network.MATIC_MUMBAI,
};
const alchemy = new Alchemy(config);

const main = async () => {
  // Get all NFTs
  const nfts = await alchemy.nft.getNftsForOwner("0xd795C5458572F5958DA0Ba915EA380b581C5f316");
  // Print NFTs
  console.log(nfts);
};

const runMain = async () => {
  try {
    await main();
    process.exit(0);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

runMain();
