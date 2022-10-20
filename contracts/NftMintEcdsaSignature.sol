pragma solidity ^0.8.15;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "erc721a/contracts/extensions/ERC721AQueryable.sol";
import "erc721a/contracts/ERC721A.sol";
import "./INftMintMeta.sol";

contract NftMintEcdsaSignature is INftMintMeta, ERC721AQueryable, Ownable {
    using ECDSA for bytes32;
    enum MintPhase {
        CLOSED,
        WL,
        PUBLIC
    }

    event MintPhaseChanged(MintPhase mintPhase);

    address private _signer;
    string private _baseTokenURI;

    uint256 public constant TEAM_RESERVED_TOKENS = 100;
    uint256 public constant MINT_CAP_PER_WALLET = 5;

    uint256 public maxSupply = 5000;
    uint256 public mintPrice = 0.1 ether;

    MintPhase public mintPhase = MintPhase.CLOSED;
    bool public revealed = false;

    constructor() ERC721A("NftMintEcdsa", "NFT") {
        _signer = msg.sender;
        _mintERC2309(msg.sender, TEAM_RESERVED_TOKENS);
    }

    function mintPublic(bytes calldata signature, uint256 quantity)
    external
    payable
    checkPhase(MintPhase.PUBLIC)
    {
        if (msg.value != quantity * mintPrice) revert InvalidEtherAmount();
        if (_numberMinted(msg.sender) + quantity > MINT_CAP_PER_WALLET) revert WalletLimitExceeded();
        if (_totalMinted() + quantity > maxSupply) revert SupplyExceeded();
        if (!_verifySignature(signature, "PUBLIC")) revert InvalidSignature();

        _mint(msg.sender, quantity);
    }

    function mintWhitelist(bytes calldata signature, uint256 quantity)
    external
    payable
    checkPhase(MintPhase.WL)
    {
        if (msg.value != quantity * mintPrice) revert InvalidEtherAmount();
        if (_numberMinted(msg.sender) + quantity > MINT_CAP_PER_WALLET) revert WalletLimitExceeded();
        if (_totalMinted() + quantity > maxSupply) revert SupplyExceeded();
        if (!_verifySignature(signature, "WHITELIST")) revert InvalidSignature();

        _mint(msg.sender, quantity);
    }

    function withdraw() external onlyOwner {
        (bool success,) = msg.sender.call{value : address(this).balance}("");

        if (!success) revert WithdrawFailed();
    }

    function setMintPhase(uint256 newMintPhase) external onlyOwner {
        if (newMintPhase > uint256(MintPhase.PUBLIC))
            revert InvalidMintPhase();

        mintPhase = MintPhase(newMintPhase);

        emit MintPhaseChanged(mintPhase);
    }

    function setMintPrice(uint256 newMintPrice) external onlyOwner {
        mintPrice = newMintPrice;
    }

    function setBaseURI(string calldata baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    function setSigner(address newSigner) external onlyOwner {
        _signer = newSigner;
    }

    function reveal() external onlyOwner {
        revealed = true;
    }

    function numberMinted(address account) external view returns (uint256) {
        return _numberMinted(account);
    }

    function _startTokenId() internal pure override returns (uint256) {
        return 1;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    function tokenURI(uint256 tokenId) public view virtual override(ERC721A, IERC721A) returns (string memory) {
        if (!_exists(tokenId)) revert URIQueryForNonexistentToken();

        string memory baseURI = _baseURI();
        string memory metadataPointerId = !revealed ? 'unrevealed' : _toString(tokenId);
        string memory result = string(abi.encodePacked(baseURI, metadataPointerId, '.json'));

        return bytes(baseURI).length != 0 ? result : '';
    }

    function _verifySignature(bytes memory signature, string memory phase)
    internal
    view
    returns (bool)
    {
        bytes32 hash = keccak256(abi.encodePacked(msg.sender, phase));
        bytes32 message = ECDSA.toEthSignedMessageHash(hash);
        address signer = ECDSA.recover(message, signature);

        return _signer == signer;
    }

    modifier checkPhase(MintPhase _mintPhase) {
        if (msg.sender != tx.origin) revert DontTryToTrickUs();
        if (mintPhase != _mintPhase) revert InvalidMintPhase();
        _;
    }
