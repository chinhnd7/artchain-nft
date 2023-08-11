// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

error RandomIpfsNft__RangeOutOfBounds();
error RandomIpfsNft__NeedMoreETHSent();
error RandomIpfsNft__TransferFailed();

contract RandomIpfsNft is VRFConsumerBaseV2, ERC721URIStorage, Ownable {

    // when we mint and NFT, we will trigger a Chainlink VRF call to get us a random number
    // using that number, we will get a random NFT
    // Pug, Shiba Inu, St. Bernard
    // Pug: super rare (siêu hiếm)
    // Shiba Inu: sort of rare (hiếm)
    // St. Bernard: common (thường)

    // users have to pay to mint an NFT
    // the owner of the contract can withdraw the ETH

    // Type Declaration
    enum Breed {
        UNITY,
        DUALITY,
        TRINITY
    }

    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint64 private immutable i_subcriptionId;
    bytes32 private immutable i_gasLane;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // VRF Helpers
    mapping(uint256 => address) public s_requestIdToSender;

    // NFT Variables
    uint256 public s_tokenCounter;
    uint256 internal constant MAX_CHANCE_VALUE = 100;
    string[] internal s_dogTokenURIs;
    uint256 internal immutable i_mintFree;

    // Events
    event NftRequested(uint256 indexed requestId, address requester);
    event NftMinted(Breed dogBreed, address minter);

    constructor(
        address vrfCoordinatorV2,
        uint64 subcriptionId,
        bytes32 gasLane,
        uint32 callbackGasLimit,
        string[3] memory dogTokenURIs,
        uint256 mintFee
        ) VRFConsumerBaseV2(vrfCoordinatorV2) ERC721("Random IPFS NFT", "RIN"){
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_subcriptionId = subcriptionId;
        i_gasLane = gasLane;
        i_callbackGasLimit = callbackGasLimit;
        s_dogTokenURIs = dogTokenURIs;
        i_mintFree = mintFee;
        s_tokenCounter = 0;
    }

    function requestNft() public payable returns (uint256 requestId) {
        if (msg.value < i_mintFree) {
            revert RandomIpfsNft__NeedMoreETHSent();
        }
        requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subcriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        s_requestIdToSender[requestId] = msg.sender;
        emit NftRequested(requestId, msg.sender);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) 
    internal 
    override
    {
        address dogOwner = s_requestIdToSender[requestId];
        uint256 newTokenId = s_tokenCounter; // 1,2,3...
        s_tokenCounter = s_tokenCounter + 1;

        // What does this token look like?
        uint256 moddedRng = randomWords[0] % MAX_CHANCE_VALUE;
        // 0-99
        // 7 -> PUG
        // 12 -> Shiba Inu
        // 88 -> St. Bernard
        // 45 -> St. Bernard

        Breed dogBreed = getBreedFromModdedRng(moddedRng);
        _safeMint(dogOwner, newTokenId);
        _setTokenURI(newTokenId, /* that breed's tokenURI */s_dogTokenURIs[uint256(dogBreed)]);
        emit NftMinted(dogBreed, dogOwner);
    }

    // extend Ownable contract
    function withDraw() public onlyOwner {
        uint256 amount = address(this).balance;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if(!success) {
            revert RandomIpfsNft__TransferFailed();
        }
    }

    function getBreedFromModdedRng(uint256 moddedRng) public pure returns (Breed) {
        uint256 cumulativeSum = 0;
        uint256[3] memory chanceArray = getChanceArray();
        // moddedRng = 25
        // i = 1
        // cumulativeSum = 10
        // => Breed(1) : Shiba Inu
        for(uint256 i=0; i < chanceArray.length; i++) {
            if (moddedRng >= cumulativeSum && moddedRng < chanceArray[i]) {
                return Breed(i);
            }
            cumulativeSum = chanceArray[i];
        }
        revert RandomIpfsNft__RangeOutOfBounds();
    }

    function getChanceArray() public pure returns(uint256[3] memory) {
        return [10, 30, MAX_CHANCE_VALUE];
        // Pug: 10% [0-9]
        // Shiba Inu: (30 - 10) % [10-39]
        // St. Bernard: (100 - 30 - 10) % [40-99]
    }

    function getMintFee() public view returns(uint256) {
        return i_mintFree;
    }

    function getDogTokenUris(uint256 index) public view returns (string memory) {
        return s_dogTokenURIs[index];
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }
}