// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {BountyEscrowOApp} from "../src/BountyEscrowOApp.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {Origin} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";

// ─── Minimal LayerZero Endpoint mock ─────────────────────────────────────────

struct MessagingParams {
    uint32 dstEid;
    bytes32 receiver;
    bytes message;
    bytes options;
    bool payInLzToken;
}

struct MessagingReceipt {
    bytes32 guid;
    uint64 nonce;
    MessagingFeeLocal fee;
}

struct MessagingFeeLocal {
    uint256 nativeFee;
    uint256 lzTokenFee;
}

/// @dev Minimal mock: accepts send() and quote(), can trigger lzReceive on OApp.
contract MockEndpointV2 {
    uint256 public constant MOCK_NATIVE_FEE = 0.01 ether;

    event MessageSent(uint32 dstEid, bytes message);

    function setDelegate(address) external {} // OApp calls this in constructor

    function quote(MessagingParams calldata, address)
        external
        pure
        returns (MessagingFeeLocal memory)
    {
        return MessagingFeeLocal(MOCK_NATIVE_FEE, 0);
    }

    function send(MessagingParams calldata params, address /*_refundAddress*/)
        external
        payable
        returns (MessagingReceipt memory)
    {
        emit MessageSent(params.dstEid, params.message);
        return MessagingReceipt(bytes32(0), 1, MessagingFeeLocal(msg.value, 0));
    }

    /// @dev Deliver a verdict message to the OApp (simulates GenLayer response via LZ).
    function deliverVerdict(address oapp, uint32 srcEid, address sender, bytes calldata payload)
        external
    {
        Origin memory origin = Origin({
            srcEid: srcEid,
            sender: bytes32(uint256(uint160(sender))),
            nonce: 1
        });
        BountyEscrowOApp(payable(oapp)).lzReceive(origin, bytes32(0), payload, address(0), "");
    }
}

// ─── Test contract ────────────────────────────────────────────────────────────

contract BountyEscrowOAppTest is Test {
    event BountyCreated(uint256 indexed bountyId, address creator, string issueURL, uint256 amount);
    event SolutionSubmitted(uint256 indexed bountyId, address solver, string prURL);
    event BountyResolved(uint256 indexed bountyId, bool approved);

    BountyEscrowOApp public escrow;
    MockUSDC public usdc;
    MockEndpointV2 public endpoint;

    address public owner = makeAddr("owner");
    address public creator = makeAddr("creator");
    address public solver = makeAddr("solver");
    address public attacker = makeAddr("attacker");

    // Simulated GenLayer peer address
    address public genlayerPeer = makeAddr("genlayerPeer");
    uint32 public constant GENLAYER_EID = 40999; // placeholder Bradbury EID

    string constant ISSUE_URL = "https://github.com/org/repo/issues/42";
    string constant PR_URL = "https://github.com/org/repo/pull/43";
    uint256 constant REWARD = 500e6; // 500 mUSDC

    uint256 constant LZ_FEE = 0.01 ether;

    function setUp() public {
        usdc = new MockUSDC();
        endpoint = new MockEndpointV2();

        // Deploy OApp with mock endpoint — deployer becomes Ownable owner
        vm.prank(owner);
        escrow = new BountyEscrowOApp(address(endpoint), owner, address(usdc), GENLAYER_EID);

        // Set GenLayer as trusted peer (required for lzReceive to accept messages)
        vm.prank(owner);
        escrow.setPeer(GENLAYER_EID, bytes32(uint256(uint160(genlayerPeer))));

        // Fund addresses
        usdc.mint(creator, 10_000e6);
        usdc.mint(attacker, 1_000e6);
        vm.deal(solver, 1 ether);
        vm.deal(attacker, 1 ether);

        vm.prank(creator);
        usdc.approve(address(escrow), type(uint256).max);

        vm.prank(attacker);
        usdc.approve(address(escrow), type(uint256).max);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    function _createBounty() internal returns (uint256 bountyId) {
        vm.prank(creator);
        escrow.createBounty(ISSUE_URL, REWARD);
        bountyId = escrow.bountyCount() - 1;
    }

    function _createAndSubmit() internal returns (uint256 bountyId) {
        bountyId = _createBounty();
        vm.prank(solver);
        escrow.submitSolution{value: LZ_FEE}(bountyId, PR_URL);
    }

    function _deliverVerdict(uint256 bountyId, bool approved) internal {
        bytes memory payload = abi.encode(bountyId, approved);
        endpoint.deliverVerdict(address(escrow), GENLAYER_EID, genlayerPeer, payload);
    }

    // ─── createBounty ────────────────────────────────────────────────────────

    function test_CreateBounty_StorageIsCorrect() public {
        uint256 id = _createBounty();

        (
            uint256 storedId,
            address storedCreator,
            string memory storedIssueURL,
            string memory storedPrURL,
            uint256 storedAmount,
            address storedSolver,
            BountyEscrowOApp.Status storedStatus
        ) = escrow.bounties(id);

        assertEq(storedId, id);
        assertEq(storedCreator, creator);
        assertEq(storedIssueURL, ISSUE_URL);
        assertEq(storedPrURL, "");
        assertEq(storedAmount, REWARD);
        assertEq(storedSolver, address(0));
        assertEq(uint8(storedStatus), uint8(BountyEscrowOApp.Status.Open));
    }

    function test_CreateBounty_TransfersUSDC() public {
        uint256 before = usdc.balanceOf(creator);
        _createBounty();
        assertEq(usdc.balanceOf(creator), before - REWARD);
        assertEq(usdc.balanceOf(address(escrow)), REWARD);
    }

    function test_CreateBounty_EmitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit BountyCreated(0, creator, ISSUE_URL, REWARD);
        vm.prank(creator);
        escrow.createBounty(ISSUE_URL, REWARD);
    }

    function test_CreateBounty_Revert_ZeroAmount() public {
        vm.prank(creator);
        vm.expectRevert(BountyEscrowOApp.ZeroAmount.selector);
        escrow.createBounty(ISSUE_URL, 0);
    }

    function test_CreateBounty_Revert_NoApproval() public {
        address noApproval = makeAddr("noApproval");
        usdc.mint(noApproval, 1_000e6);
        vm.prank(noApproval);
        vm.expectRevert();
        escrow.createBounty(ISSUE_URL, REWARD);
    }

    function test_CreateBounty_CountIncreases() public {
        assertEq(escrow.bountyCount(), 0);
        _createBounty();
        assertEq(escrow.bountyCount(), 1);
        _createBounty();
        assertEq(escrow.bountyCount(), 2);
    }

    // ─── submitSolution ──────────────────────────────────────────────────────

    function test_SubmitSolution_StorageIsCorrect() public {
        uint256 id = _createBounty();
        vm.prank(solver);
        escrow.submitSolution{value: LZ_FEE}(id, PR_URL);

        (,,, string memory storedPrURL,, address storedSolver, BountyEscrowOApp.Status storedStatus) =
            escrow.bounties(id);

        assertEq(storedPrURL, PR_URL);
        assertEq(storedSolver, solver);
        assertEq(uint8(storedStatus), uint8(BountyEscrowOApp.Status.Submitted));
    }

    function test_SubmitSolution_EmitsEvent() public {
        uint256 id = _createBounty();
        vm.expectEmit(true, true, false, true);
        emit SolutionSubmitted(id, solver, PR_URL);
        vm.prank(solver);
        escrow.submitSolution{value: LZ_FEE}(id, PR_URL);
    }

    function test_SubmitSolution_AnySolverCanSubmit() public {
        uint256 id = _createBounty();
        // Anyone can submit (no onlyRelayer)
        vm.prank(attacker);
        escrow.submitSolution{value: LZ_FEE}(id, PR_URL);
        (,,,,, address storedSolver,) = escrow.bounties(id);
        assertEq(storedSolver, attacker);
    }

    function test_SubmitSolution_Revert_BountyNotFound() public {
        vm.prank(solver);
        vm.expectRevert(BountyEscrowOApp.BountyNotFound.selector);
        escrow.submitSolution{value: LZ_FEE}(999, PR_URL);
    }

    function test_SubmitSolution_Revert_BountyNotOpen() public {
        uint256 id = _createAndSubmit();
        vm.prank(solver);
        vm.expectRevert(BountyEscrowOApp.BountyNotOpen.selector);
        escrow.submitSolution{value: LZ_FEE}(id, PR_URL);
    }

    // ─── _lzReceive: verdict from GenLayer ───────────────────────────────────

    function test_LzReceive_Approved_SolverGetsUSDC() public {
        uint256 id = _createAndSubmit();
        uint256 solverBefore = usdc.balanceOf(solver);

        _deliverVerdict(id, true);

        assertEq(usdc.balanceOf(solver), solverBefore + REWARD);
        assertEq(usdc.balanceOf(address(escrow)), 0);
    }

    function test_LzReceive_Approved_StatusIsApproved() public {
        uint256 id = _createAndSubmit();
        _deliverVerdict(id, true);
        (,,,,,, BountyEscrowOApp.Status status) = escrow.bounties(id);
        assertEq(uint8(status), uint8(BountyEscrowOApp.Status.Approved));
    }

    function test_LzReceive_Rejected_CreatorGetsUSDC() public {
        uint256 id = _createAndSubmit();
        uint256 creatorBefore = usdc.balanceOf(creator);

        _deliverVerdict(id, false);

        assertEq(usdc.balanceOf(creator), creatorBefore + REWARD);
        assertEq(usdc.balanceOf(address(escrow)), 0);
    }

    function test_LzReceive_Rejected_StatusIsRejected() public {
        uint256 id = _createAndSubmit();
        _deliverVerdict(id, false);
        (,,,,,, BountyEscrowOApp.Status status) = escrow.bounties(id);
        assertEq(uint8(status), uint8(BountyEscrowOApp.Status.Rejected));
    }

    function test_LzReceive_EmitsEvent_Approved() public {
        uint256 id = _createAndSubmit();
        vm.expectEmit(true, false, false, true);
        emit BountyResolved(id, true);
        _deliverVerdict(id, true);
    }

    function test_LzReceive_EmitsEvent_Rejected() public {
        uint256 id = _createAndSubmit();
        vm.expectEmit(true, false, false, true);
        emit BountyResolved(id, false);
        _deliverVerdict(id, false);
    }

    function test_LzReceive_OnlyFromEndpoint() public {
        uint256 id = _createAndSubmit();
        Origin memory origin = Origin({
            srcEid: GENLAYER_EID,
            sender: bytes32(uint256(uint160(genlayerPeer))),
            nonce: 1
        });
        bytes memory payload = abi.encode(id, true);

        // Attacker cannot call lzReceive directly
        vm.prank(attacker);
        vm.expectRevert();
        escrow.lzReceive(origin, bytes32(0), payload, address(0), "");
    }

    function test_LzReceive_Idempotent_IgnoresDoubleVerdicts() public {
        uint256 id = _createAndSubmit();
        _deliverVerdict(id, true);
        uint256 solverBalance = usdc.balanceOf(solver);

        // Second verdict for same bounty is silently ignored
        _deliverVerdict(id, true);

        assertEq(usdc.balanceOf(solver), solverBalance); // no double-pay
    }

    function test_LzReceive_InvalidBountyId_Ignored() public {
        // Verdict for non-existent bountyId should not revert
        bytes memory payload = abi.encode(uint256(999), true);
        endpoint.deliverVerdict(address(escrow), GENLAYER_EID, genlayerPeer, payload);
    }

    // ─── quoteFee ─────────────────────────────────────────────────────────────

    function test_QuoteFee_ReturnsNonZeroFee() public {
        _createBounty();
        uint256 fee = escrow.quoteFee(0, PR_URL);
        assertEq(fee, MockEndpointV2(address(endpoint)).MOCK_NATIVE_FEE());
    }

    function test_QuoteFee_Revert_BountyNotFound() public {
        vm.expectRevert(BountyEscrowOApp.BountyNotFound.selector);
        escrow.quoteFee(999, PR_URL);
    }

    // ─── Multiple bounties ────────────────────────────────────────────────────

    function test_MultipleBounties_IndependentResolution() public {
        uint256 id0 = _createBounty();
        uint256 id1 = _createBounty();

        // Solver 1 submits bounty 0
        vm.prank(solver);
        escrow.submitSolution{value: LZ_FEE}(id0, PR_URL);

        // Solver 2 submits bounty 1
        address solver2 = makeAddr("solver2");
        vm.deal(solver2, 1 ether);
        vm.prank(solver2);
        escrow.submitSolution{value: LZ_FEE}(id1, PR_URL);

        // Bounty 0 approved, bounty 1 rejected
        _deliverVerdict(id0, true);
        _deliverVerdict(id1, false);

        assertEq(usdc.balanceOf(solver), REWARD);
        assertEq(usdc.balanceOf(solver2), 0);
        // Creator gets refund for id1
        // (initial balance was 10_000e6, spent 2 * REWARD = 1000e6)
        assertEq(usdc.balanceOf(creator), 10_000e6 - REWARD); // one REWARD returned
    }
}
