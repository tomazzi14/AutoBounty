// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @title BountyEscrow
/// @notice USDC escrow for GitHub issue bounties on Avalanche Fuji.
///         The relayer is the only address that can submit solutions and resolve bounties.
contract BountyEscrow {
    // ─── Types ───────────────────────────────────────────────────────────────

    enum Status {
        Open,
        Submitted,
        Approved,
        Rejected
    }

    struct Bounty {
        uint256 id;
        address creator;
        string issueURL;
        string prURL;
        uint256 amount;
        address solver;
        Status status;
    }

    // ─── Storage ─────────────────────────────────────────────────────────────

    mapping(uint256 => Bounty) public bounties;
    uint256 public bountyCount;
    IERC20 public immutable usdc;
    address public immutable relayer;

    // ─── Events ──────────────────────────────────────────────────────────────

    event BountyCreated(
        uint256 indexed bountyId,
        address creator,
        string issueURL,
        uint256 amount
    );

    event SolutionSubmitted(
        uint256 indexed bountyId,
        address solver,
        string prURL
    );

    event BountyResolved(uint256 indexed bountyId, bool approved);

    // ─── Errors ──────────────────────────────────────────────────────────────

    error OnlyRelayer();
    error ZeroAmount();
    error BountyNotFound();
    error BountyNotOpen();
    error BountyNotSubmitted();
    error TransferFailed();
    error ZeroAddress();

    // ─── Modifiers ───────────────────────────────────────────────────────────

    modifier onlyRelayer() {
        if (msg.sender != relayer) revert OnlyRelayer();
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor(address _relayer, address _usdc) {
        if (_relayer == address(0)) revert ZeroAddress();
        if (_usdc == address(0)) revert ZeroAddress();
        relayer = _relayer;
        usdc = IERC20(_usdc);
    }

    // ─── External functions ──────────────────────────────────────────────────

    /// @notice Create a new bounty linked to a GitHub issue.
    /// @param issueURL Full URL of the GitHub issue (e.g. https://github.com/org/repo/issues/42)
    /// @param amount USDC amount to lock as bounty reward (6 decimals)
    function createBounty(string calldata issueURL, uint256 amount) external {
        if (amount == 0) revert ZeroAmount();

        bool success = usdc.transferFrom(msg.sender, address(this), amount);
        if (!success) revert TransferFailed();

        uint256 id = bountyCount++;

        bounties[id] = Bounty({
            id: id,
            creator: msg.sender,
            issueURL: issueURL,
            prURL: "",
            amount: amount,
            solver: address(0),
            status: Status.Open
        });

        emit BountyCreated(id, msg.sender, issueURL, amount);
    }

    /// @notice Submit a PR as a solution to an open bounty. Only callable by relayer.
    /// @param bountyId ID of the bounty to solve
    /// @param prURL Full URL of the GitHub PR (e.g. https://github.com/org/repo/pull/43)
    /// @param solver Address of the developer who submitted the PR
    function submitSolution(uint256 bountyId, string calldata prURL, address solver) external onlyRelayer {
        if (bountyId >= bountyCount) revert BountyNotFound();
        if (solver == address(0)) revert ZeroAddress();

        Bounty storage bounty = bounties[bountyId];
        if (bounty.status != Status.Open) revert BountyNotOpen();

        bounty.solver = solver;
        bounty.prURL = prURL;
        bounty.status = Status.Submitted;

        emit SolutionSubmitted(bountyId, solver, prURL);
    }

    /// @notice Resolve a submitted bounty. Only callable by the relayer.
    /// @param bountyId ID of the bounty to resolve
    /// @param approved True to approve (pay solver), false to reject (refund creator)
    function resolveBounty(uint256 bountyId, bool approved) external onlyRelayer {
        if (bountyId >= bountyCount) revert BountyNotFound();

        Bounty storage bounty = bounties[bountyId];
        if (bounty.status != Status.Submitted) revert BountyNotSubmitted();

        uint256 amount = bounty.amount;
        address recipient;

        if (approved) {
            bounty.status = Status.Approved;
            recipient = bounty.solver;
        } else {
            bounty.status = Status.Rejected;
            recipient = bounty.creator;
        }

        emit BountyResolved(bountyId, approved);

        bool success = usdc.transfer(recipient, amount);
        if (!success) revert TransferFailed();
    }
}
