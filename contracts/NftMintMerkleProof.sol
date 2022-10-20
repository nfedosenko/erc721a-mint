pragma solidity ^0.8.15;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract NftMintMerkleProof is ERC721, Ownable, Pausable {
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    Counters.Counter private supply;
    uint256 private price = 100000000000000000; // 0.1 Ether

    uint16 public constant MAX_TOKENS = 5000;
    uint16 public constant MAX_TOKENS_PER_PURCHASE = 10;

    string public baseURI;
    bytes32 public merkleRoot;

    mapping(address => bool) whitelistClaimed;


    constructor() ERC721("NftMintMerkleProof", "NFT") {
    }

    // MINTING FUNCTIONS //
    function mint(uint16 _count) public payable whenNotPaused {
        require(_count > 0 && _count < MAX_TOKENS_PER_PURCHASE + 1, "Exceeds max purchase limit for transaction");
        require(supply.current() + _count < MAX_TOKENS + 1, "Exceeds maximum tokens available for purchase");
        require(msg.value >= price.mul(_count), "Ether value sent is invalid");

        for (uint16 i = 0; i < _count; i++) {
            uint256 tokenId = supply.current();
            supply.increment();
            _safeMint(msg.sender, tokenId);
        }
    }

    // Whitelist mint function uses MerkleTree proof approach
    // to check whether caller address is in the whitelist or not
    // merkleRoot hash contains data about all of currently whitelisted addresses
    function whitelistMint(uint16 _count, bytes32[] calldata _merkleProof) public payable whenNotPaused {
        require(_count > 0 && _count < MAX_TOKENS_PER_PURCHASE + 1, "Exceeds max purchase limit for transaction");
        require(supply.current() + _count < MAX_TOKENS + 1, "Exceeds maximum tokens available for purchase");
        require(msg.value >= price.mul(_count), "Ether value sent is invalid");

        require(!whitelistClaimed[msg.sender], "Already Claimed");
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(MerkleProof.verify(_merkleProof, merkleRoot, leaf), "Invalid proof provided");

        for (uint16 i = 0; i < _count; i++) {
            uint256 tokenId = supply.current();
            supply.increment();
            _safeMint(msg.sender, tokenId);
        }

        whitelistClaimed[msg.sender] = true;
    }
    //-- MINTING FUNCTIONS --//

    // EXTERNAL FUNCTIONS //
    function tokensByOwner(address _owner) external view returns (uint16[] memory) {
        uint256 tokenCount = balanceOf(_owner);
        if (tokenCount == 0) {
            return new uint16[](0);
        } else {
            uint16[] memory result = new uint16[](tokenCount);
            uint16 index;
            for (index = 0; index < tokenCount; index++) {
                result[index] = tokenOfOwnerByIndex(_owner, index);
            }
            return result;
        }
    }
    //-- EXTERNAL FUNCTIONS --//


    // ONLY OWNER FUNCTIONS //
    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        payable(msg.sender).transfer(balance);
    }

    function reserveTokens(address _to, uint256 _reserveAmount) public onlyOwner {
        for (uint i = 0; i < _reserveAmount; i++) {
            uint256 tokenId = supply.current();
            supply.increment();
            _safeMint(_to, tokenId);
        }
    }

    function setMerkleRoot(byte32 memory _merkleRoot) public onlyOwner {
        merkleRoot = _merkleRoot;
    }

    function setBaseURI(string memory _baseUri) public onlyOwner {
        baseURI = _baseUri;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }
    //-- ONLY OWNER FUNCTIONS --//


    // OVERRIDES //
    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal whenNotPaused override {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function tokenURI(uint256 tokenId) public view virtual override(ERC721) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    //-- OVERRIDES --//
}