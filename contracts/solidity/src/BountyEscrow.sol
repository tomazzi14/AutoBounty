// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title BountyEscrow
/// @notice Holds bounty funds in escrow and releases them based on relayer-forwarded verdicts from GenLayer.
contract BountyEscrow {
    struct Bounty {
        address sponsor;
        uint256 pool;
        bool active;
        mapping(address => bool) paid;
    }

    address public owner;
    address public relayer;
    uint256 public nextBountyId;

    mapping(uint256 => Bounty) public bounties;

    event BountyCreated(uint256 indexed bountyId, address indexed sponsor, uint256 pool);
    event PayoutReleased(uint256 indexed bountyId, address indexed reporter, uint256 amount);
    event BountyClosed(uint256 indexed bountyId);

    error OnlyOwner();
    error OnlyRelayer();
    error BountyNotActive();
    error InsufficientPool();
    error AlreadyPaid();
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyRelayer() {
        if (msg.sender != relayer) revert OnlyRelayer();
        _;
    }

    constructor(address _relayer) {
        owner = msg.sender;
        relayer = _relayer;
    }

    /// @notice Create a new bounty with attached ETH as the reward pool.
    function createBounty() external payable returns (uint256 bountyId) {
        bountyId = nextBountyId++;
        Bounty storage b = bounties[bountyId];
        b.sponsor = msg.sender;
        b.pool = msg.value;
        b.active = true;
        emit BountyCreated(bountyId, msg.sender, msg.value);
    }

    /// @notice Called by the relayer to release payout after GenLayer verdict.
    /// @param bountyId The bounty to pay from.
    /// @param reporter The address of the valid reporter.
    /// @param amount The payout amount in wei.
    function releasePayout(uint256 bountyId, address reporter, uint256 amount) external onlyRelayer {
        Bounty storage b = bounties[bountyId];
        if (!b.active) revert BountyNotActive();
        if (amount > b.pool) revert InsufficientPool();
        if (b.paid[reporter]) revert AlreadyPaid();

        b.paid[reporter] = true;
        b.pool -= amount;

        (bool success,) = reporter.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit PayoutReleased(bountyId, reporter, amount);
    }

    /// @notice Sponsor can close their bounty and withdraw remaining funds.
    function closeBounty(uint256 bountyId) external {
        Bounty storage b = bounties[bountyId];
        require(msg.sender == b.sponsor, "Not sponsor");
        if (!b.active) revert BountyNotActive();

        b.active = false;
        uint256 remaining = b.pool;
        b.pool = 0;

        (bool success,) = b.sponsor.call{value: remaining}("");
        if (!success) revert TransferFailed();

        emit BountyClosed(bountyId);
    }

    /// @notice Update the relayer address.
    function setRelayer(address _relayer) external onlyOwner {
        relayer = _relayer;
    }
}
