// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { OApp, Origin, MessagingFee } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @title BountyEscrowOApp
/// @notice USDC escrow for GitHub bounties with trustless cross-chain verdict via LayerZero V2.
///         Solvers submit PRs directly. The submission is sent to GenLayer via LayerZero.
///         GenLayer's BountyJudge evaluates with 5 LLMs and sends the verdict back.
///         No centralized relayer. No single point of failure.
contract BountyEscrowOApp is OApp {
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
    uint32 public immutable genlayerEid;

    // LZ options: type3, executor lzReceive, 200k gas, 0 value
    bytes internal constant LZ_OPTIONS = hex"00030100110100000000000000000000000000030d40";

    // ─── Events ──────────────────────────────────────────────────────────────

    event BountyCreated(uint256 indexed bountyId, address creator, string issueURL, uint256 amount);
    event SolutionSubmitted(uint256 indexed bountyId, address solver, string prURL);
    event BountyResolved(uint256 indexed bountyId, bool approved);

    // ─── Errors ──────────────────────────────────────────────────────────────

    error ZeroAmount();
    error BountyNotFound();
    error BountyNotOpen();
    error BountyNotSubmitted();
    error TransferFailed();
    error ZeroAddress();
    error InsufficientFee();

    // ─── Constructor ─────────────────────────────────────────────────────────

    /// @param _endpoint LayerZero V2 endpoint on Avalanche Fuji: 0x6EDCE65403992e310A62460808c4b910D972f10f
    /// @param _delegate Owner/admin address (can set peers, config)
    /// @param _usdc mUSDC token address
    /// @param _genlayerEid Destination EID for GenLayer Bradbury (confirm with GenLayer team)
    constructor(address _endpoint, address _delegate, address _usdc, uint32 _genlayerEid)
        OApp(_endpoint, _delegate)
    {
        if (_usdc == address(0)) revert ZeroAddress();
        usdc = IERC20(_usdc);
        genlayerEid = _genlayerEid;
    }

    // ─── Public functions ─────────────────────────────────────────────────────

    /// @notice Create a new bounty linked to a GitHub issue. Transfers mUSDC from creator.
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

    /// @notice Submit a PR as a solution. Sends evaluation request to GenLayer via LayerZero.
    ///         msg.value must cover the LayerZero messaging fee (use quoteFee() first).
    /// @param bountyId ID of the bounty to solve
    /// @param prURL Full URL of the GitHub PR
    function submitSolution(uint256 bountyId, string calldata prURL) external payable {
        if (bountyId >= bountyCount) revert BountyNotFound();

        Bounty storage bounty = bounties[bountyId];
        if (bounty.status != Status.Open) revert BountyNotOpen();

        bounty.solver = msg.sender;
        bounty.prURL = prURL;
        bounty.status = Status.Submitted;

        emit SolutionSubmitted(bountyId, msg.sender, prURL);

        // Encode payload: (bountyId, issueURL, prURL) → GenLayer will call evaluate(issueURL, prURL)
        // and send back (bountyId, approved)
        bytes memory payload = abi.encode(bountyId, bounty.issueURL, prURL);

        MessagingFee memory fee = MessagingFee(msg.value, 0);
        _lzSend(genlayerEid, payload, LZ_OPTIONS, fee, payable(msg.sender));
    }

    /// @notice Estimate the LayerZero messaging fee for submitting a solution.
    /// @param bountyId ID of the bounty (needed to get issueURL for payload size)
    /// @param prURL PR URL to estimate fee for
    /// @return nativeFee Amount of AVAX (wei) to send with submitSolution
    function quoteFee(uint256 bountyId, string calldata prURL)
        external
        view
        returns (uint256 nativeFee)
    {
        if (bountyId >= bountyCount) revert BountyNotFound();
        bytes memory payload = abi.encode(bountyId, bounties[bountyId].issueURL, prURL);
        MessagingFee memory fee = _quote(genlayerEid, payload, LZ_OPTIONS, false);
        return fee.nativeFee;
    }

    // ─── LayerZero receive ────────────────────────────────────────────────────

    /// @notice Receives verdict from GenLayer via LayerZero and resolves the bounty.
    ///         Payload: abi.encode(bountyId, approved)
    function _lzReceive(
        Origin calldata, /*_origin*/
        bytes32, /*_guid*/
        bytes calldata payload,
        address, /*_executor*/
        bytes calldata /*_extraData*/
    ) internal override {
        (uint256 bountyId, bool approved) = abi.decode(payload, (uint256, bool));

        if (bountyId >= bountyCount) return; // safety: ignore invalid bountyId
        Bounty storage bounty = bounties[bountyId];
        if (bounty.status != Status.Submitted) return; // idempotent

        uint256 amount = bounty.amount;
        address recipient = approved ? bounty.solver : bounty.creator;

        bounty.status = approved ? Status.Approved : Status.Rejected;

        emit BountyResolved(bountyId, approved);

        bool success = usdc.transfer(recipient, amount);
        if (!success) revert TransferFailed();
    }

    /// @dev Allow contract to receive AVAX for excess fee refunds from the endpoint.
    receive() external payable {}
}
