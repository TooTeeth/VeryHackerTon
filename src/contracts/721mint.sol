// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ERC721Basic
 * @dev A basic ERC721 contract implementation without external imports.
 * This contract provides core functionality: minting, ownership tracking,
 * and transferring tokens.
 */


contract MyERC721 {

    string private _baseTokenURI;

constructor(string memory baseURI) {
    _baseTokenURI = baseURI;
}

    // --- State Variables ---

    // Mapping from token ID to owner address.
    mapping(uint256 => address) private _owners;

    // Mapping from owner address to the number of tokens they own.
    mapping(address => uint256) private _balances;

    // Mapping from token ID to the approved address.
    mapping(uint256 => address) private _tokenApprovals;

    // A counter for new tokens.
    uint256 private _nextTokenId;

    // --- Events ---

    // Event emitted when a token is transferred.
    event Transfer(
        address indexed from,
        address indexed to,
        uint256 indexed tokenId
    );

    // Event emitted when an address is approved to take ownership of a token.
    event Approval(
        address indexed owner,
        address indexed approved,
        uint256 indexed tokenId
    );

    // --- Functions ---

    /**
     * @dev Returns the number of tokens owned by `owner`.a
     * @param owner The address to query the balance of.
     */
    function balanceOf(address owner) public view returns (uint256) {
        require(owner != address(0), "ERC721: address zero is not a valid owner");
        return _balances[owner];
    }

    /**
     * @dev Returns the owner of the token specified by `tokenId`.
     * @param tokenId The ID of the token to query the owner of.
     */
    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "ERC721: token does not exist");
        return owner;
    }

    /**
     * @dev Gives permission to `to` to transfer `tokenId`.
     * @param to The address to approve.
     * @param tokenId The ID of the token to approve.
     */
    function approve(address to, uint256 tokenId) public {
        address owner = ownerOf(tokenId);
        require(msg.sender == owner, "ERC721: caller is not the token owner");
        _tokenApprovals[tokenId] = to;
        emit Approval(owner, to, tokenId);
    }

    /**
     * @dev Gets the approved address for a token.
     * @param tokenId The ID of the token to query the approved address for.
     */
    function getApproved(uint256 tokenId) public view returns (address) {
        require(_owners[tokenId] != address(0), "ERC721: token does not exist");
        return _tokenApprovals[tokenId];
    }

    /**
     * @dev Transfers ownership of a token.
     * @param from The address of the current owner.
     * @param to The address to transfer to.
     * @param tokenId The ID of the token to transfer.
     */
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public {
        require(ownerOf(tokenId) == from, "ERC721: caller is not the owner");
        require(to != address(0), "ERC721: transfer to the zero address");

        // The caller must be the owner or the approved address.
        require(
            msg.sender == from || getApproved(tokenId) == msg.sender,
            "ERC721: transfer not authorized"
        );

        _transfer(from, to, tokenId);
    }

    /**
     * @dev Mints a new token and assigns it to `to`.
     * @param to The address to mint the new token to.
     */
    function mint(address to) public returns (uint256) {
        uint256 newId = _nextTokenId;
        _nextTokenId++;
        _safeMint(to, newId);
        return newId;
    }

    // --- Internal Functions ---

    /**
     * @dev Internal function to safely mint a token.
     * @param to The address to mint the token to.
     * @param tokenId The ID of the token to mint.
     */
    function _safeMint(address to, uint256 tokenId) internal {
        require(to != address(0), "ERC721: mint to the zero address");
        _balances[to]++;
        _owners[tokenId] = to;
        emit Transfer(address(0), to, tokenId);
    }

    /**
     * @dev Internal function to transfer a token.
     * @param from The current owner.
     * @param to The new owner.
     * @param tokenId The ID of the token to transfer.
     */
    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal {
        // Clear approval for the transferred token.
        _tokenApprovals[tokenId] = address(0);

        _balances[from]--;
        _balances[to]++;
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    function tokenURI(uint256 tokenId) public view returns (string memory) {
    require(_owners[tokenId] != address(0), "ERC721: token does not exist");
    return string(abi.encodePacked(_baseTokenURI, uint2str(tokenId), ".json"));
}


function uint2str(uint256 _i) internal pure returns (string memory str) {
    if (_i == 0) return "0";
    uint256 j = _i;
    uint256 length;
    while (j != 0) {
        length++;
        j /= 10;
    }
    bytes memory bstr = new bytes(length);
    uint256 k = length;
    j = _i;
    while (j != 0) {
        bstr[--k] = bytes1(uint8(48 + j % 10));
        j /= 10;
    }
    str = string(bstr);
}


function batchMint(address to, uint256 count) public {
    for (uint256 i = 0; i < count; i++) {
        uint256 newId = _nextTokenId;
        _nextTokenId++;
        _safeMint(to, newId);
    }
}
}