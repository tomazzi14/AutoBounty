// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BountyEscrow {
    enum Status { Open, Submitted, Approved, Rejected }

    struct Bounty {
        uint256 id;
        address creator;
        string issueURL;
        string prURL;
        uint256 amount;
        address solver;
        Status status;
    }

    mapping(uint256 => Bounty) public bounties;
    uint256 public bountyCount;
    address public relayer;

    event BountyCreated(uint256 indexed bountyId, address indexed creator, string issueURL, uint256 amount);
    event SolutionSubmitted(uint256 indexed bountyId, address indexed solver, string prURL, string issueURL);
    event BountyResolved(uint256 indexed bountyId, bool approved);

    modifier onlyRelayer() {
        require(msg.sender == relayer, "Only relayer");
        _;
    }

    constructor(address _relayer) {
        relayer = _relayer;
    }

    /// @notice Create a bounty with AVAX as escrow.
    function createBounty(string calldata issueURL) external payable {
        require(msg.value > 0, "Must send AVAX");
        uint256 id = bountyCount++;
        bounties[id] = Bounty({
            id: id,
            creator: msg.sender,
            issueURL: issueURL,
            prURL: "",
            amount: msg.value,
            solver: address(0),
            status: Status.Open
        });
        emit BountyCreated(id, msg.sender, issueURL, msg.value);
    }

    /// @notice Submit a PR solution to an open bounty.
    function submitSolution(uint256 bountyId, string calldata prURL) external {
        Bounty storage b = bounties[bountyId];
        require(b.amount > 0, "Bounty does not exist");
        require(b.status == Status.Open, "Bounty not open");
        b.solver = msg.sender;
        b.prURL = prURL;
        b.status = Status.Submitted;
        emit SolutionSubmitted(bountyId, msg.sender, prURL, b.issueURL);
    }

    /// @notice Resolve a bounty based on GenLayer verdict.
    function resolveBounty(uint256 bountyId, bool approved) external onlyRelayer {
        Bounty storage b = bounties[bountyId];
        require(b.amount > 0, "Bounty does not exist");
        require(b.status == Status.Submitted, "Bounty not submitted");

        if (approved) {
            b.status = Status.Approved;
            (bool sent,) = b.solver.call{value: b.amount}("");
            require(sent, "Transfer failed");
        } else {
            b.status = Status.Rejected;
            (bool sent,) = b.creator.call{value: b.amount}("");
            require(sent, "Transfer failed");
        }
        emit BountyResolved(bountyId, approved);
    }
}
