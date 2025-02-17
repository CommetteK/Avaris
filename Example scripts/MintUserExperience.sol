pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract UserExperienceMinter is ERC721, ERC721Enumerable, ERC721URIStorage {
    using SafeMath for uint256;

    uint public constant mintPrice = 0;

    struct Metadata {
        string title;
        string description;
        string imageURI;
        string startDate
        string endDate
        string walletAddress
        // Add more metadata fields as needed
    }

    mapping(uint256 => Metadata) private _tokenMetadata;

    function _beforeTokenTransfer(address from, address to, uint256 tokenId)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function _burn(uint256 tokenId) 
        internal
        override(ERC721, ERC721URIStorage)
    {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    constructor() ERC721("UserExperienceMinter","UEX") {}

    function mint(string memory _name, string memory _description, string memory _imageURI) public payable {
        uint256 mintIndex = totalSupply();
        _safeMint(msg.sender, mintIndex);
        _setTokenURI(mintIndex, _imageURI);
        _tokenMetadata[mintIndex] = Metadata(_name, _description, _imageURI);
    }

    function getTokenMetadata(uint256 tokenId) public view returns (Metadata memory) {
        return _tokenMetadata[tokenId];
    }
}
