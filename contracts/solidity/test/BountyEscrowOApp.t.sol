// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {BountyEscrowOApp} from "../src/BountyEscrowOApp.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {Origin} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

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

    function setDelegate(address) external {}

    function quote(MessagingParams calldata, address)
        external
        pure
        returns (MessagingFeeLocal memory)
    {
        return MessagingFeeLocal(MOCK_NATIVE_FEE, 0);
    }

    function send(MessagingParams calldata params, address)
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

// ─── Fee-on-transfer USDC mock ────────────────────────────────────────────────

contract FeeOnTransferUSDC {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public constant FEE = 1e6; // 1 USDC fee per transfer

    function mint(address to, uint256 amount) external { balanceOf[to] += amount; }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        uint256 net = amount - FEE;
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += net;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        uint256 net = amount - FEE;
        balanceOf[from] -= amount;
        balanceOf[to] += net;
        return true;
    }
}

// ─── Test contract ────────────────────────────────────────────────────────────

contract BountyEscrowOAppTest is Test {
    event BountyCreated(uint256 indexed bountyId, address creator, string issueURL, uint256 amount);
    event SolutionSubmitted(uint256 indexed bountyId, address solver, string prURL);
    event BountyResolved(uint256 indexed bountyId, bool approved, address recipient, uint256 amount);
    event FundsClaimed(address indexed recipient, uint256 amount);

    BountyEscrowOApp public escrow;
    MockUSDC public usdc;
    MockEndpointV2 public endpoint;

    address public owner = makeAddr("owner");
    address public creator = makeAddr("creator");
    address public solver = makeAddr("solver");
    address public attacker = makeAddr("attacker");

    address public genlayerPeer = makeAddr("genlayerPeer");
    uint32 public constant GENLAYER_EID = 40999;

    string constant ISSUE_URL = "https://github.com/org/repo/issues/42";
    string constant PR_URL = "https://github.com/org/repo/pull/43";
    uint256 constant REWARD = 500e6;

    uint256 constant LZ_FEE = 0.01 ether;

    function setUp() public {
        usdc = new MockUSDC();
        endpoint = new MockEndpointV2();

        vm.prank(owner);
        escrow = new BountyEscrowOApp(address(endpoint), owner, address(usdc), GENLAYER_EID);

        vm.prank(owner);
        escrow.setPeer(GENLAYER_EID, bytes32(uint256(uint160(genlayerPeer))));

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

    function test_CreateBounty_RecordsActualReceived_FeeOnTransfer() public {
        FeeOnTransferUSDC feeToken = new FeeOnTransferUSDC();
        vm.prank(owner);
        BountyEscrowOApp feeEscrow = new BountyEscrowOApp(
            address(endpoint), owner, address(feeToken), GENLAYER_EID
        );
        feeToken.mint(creator, 10_000e6);
        vm.prank(creator);
        feeToken.approve(address(feeEscrow), type(uint256).max);

        vm.prank(creator);
        feeEscrow.createBounty(ISSUE_URL, REWARD);

        (,,,, uint256 storedAmount,,) = feeEscrow.bounties(0);
        // Should record REWARD - FEE, not REWARD
        assertEq(storedAmount, REWARD - FeeOnTransferUSDC(address(feeToken)).FEE());
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

    function test_SubmitSolution_FirstComeFirstServed() public {
        uint256 id = _createBounty();
        // First solver wins — second call reverts with BountyNotOpen
        vm.prank(solver);
        escrow.submitSolution{value: LZ_FEE}(id, PR_URL);

        vm.prank(attacker);
        vm.expectRevert(BountyEscrowOApp.BountyNotOpen.selector);
        escrow.submitSolution{value: LZ_FEE}(id, PR_URL);
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

    // ─── _lzReceive + claim (pull-over-push) ─────────────────────────────────

    function test_LzReceive_Approved_CreditsSolver() public {
        uint256 id = _createAndSubmit();
        _deliverVerdict(id, true);

        assertEq(escrow.pendingWithdrawals(solver), REWARD);
        assertEq(usdc.balanceOf(solver), 0); // not pushed yet
        assertEq(usdc.balanceOf(address(escrow)), REWARD); // still in escrow until claim
    }

    function test_Claim_Approved_SolverReceivesUSDC() public {
        uint256 id = _createAndSubmit();
        _deliverVerdict(id, true);

        uint256 before = usdc.balanceOf(solver);
        vm.prank(solver);
        escrow.claim();

        assertEq(usdc.balanceOf(solver), before + REWARD);
        assertEq(escrow.pendingWithdrawals(solver), 0);
        assertEq(usdc.balanceOf(address(escrow)), 0);
    }

    function test_LzReceive_Rejected_CreditsCreator() public {
        uint256 id = _createAndSubmit();
        _deliverVerdict(id, false);

        assertEq(escrow.pendingWithdrawals(creator), REWARD);
    }

    function test_Claim_Rejected_CreatorReceivesUSDC() public {
        uint256 id = _createAndSubmit();
        _deliverVerdict(id, false);

        uint256 before = usdc.balanceOf(creator);
        vm.prank(creator);
        escrow.claim();

        assertEq(usdc.balanceOf(creator), before + REWARD);
    }

    function test_LzReceive_Approved_StatusIsApproved() public {
        uint256 id = _createAndSubmit();
        _deliverVerdict(id, true);
        (,,,,,, BountyEscrowOApp.Status status) = escrow.bounties(id);
        assertEq(uint8(status), uint8(BountyEscrowOApp.Status.Approved));
    }

    function test_LzReceive_Rejected_StatusIsRejected() public {
        uint256 id = _createAndSubmit();
        _deliverVerdict(id, false);
        (,,,,,, BountyEscrowOApp.Status status) = escrow.bounties(id);
        assertEq(uint8(status), uint8(BountyEscrowOApp.Status.Rejected));
    }

    function test_LzReceive_EmitsEvent() public {
        uint256 id = _createAndSubmit();
        vm.expectEmit(true, false, false, true);
        emit BountyResolved(id, true, solver, REWARD);
        _deliverVerdict(id, true);
    }

    function test_LzReceive_Idempotent_NoDoublePay() public {
        uint256 id = _createAndSubmit();
        _deliverVerdict(id, true);
        uint256 credited = escrow.pendingWithdrawals(solver);

        _deliverVerdict(id, true); // second verdict silently ignored

        assertEq(escrow.pendingWithdrawals(solver), credited); // unchanged
    }

    function test_LzReceive_InvalidBountyId_Ignored() public {
        // Should not revert — silently ignored
        bytes memory payload = abi.encode(uint256(999), true);
        endpoint.deliverVerdict(address(escrow), GENLAYER_EID, genlayerPeer, payload);
    }

    function test_LzReceive_OnlyFromEndpoint() public {
        uint256 id = _createAndSubmit();
        Origin memory origin = Origin({
            srcEid: GENLAYER_EID,
            sender: bytes32(uint256(uint160(genlayerPeer))),
            nonce: 1
        });
        bytes memory payload = abi.encode(id, true);

        vm.prank(attacker);
        vm.expectRevert();
        escrow.lzReceive(origin, bytes32(0), payload, address(0), "");
    }

    function test_LzReceive_BlacklistedRecipient_DoesNotBlockChannel() public {
        // With pull-over-push, _lzReceive never calls usdc.transfer,
        // so a blacklisted recipient can never block the LZ channel.
        uint256 id = _createAndSubmit();
        _deliverVerdict(id, true);

        // Funds are credited — blacklisted user simply can't claim (handled outside contract)
        assertEq(escrow.pendingWithdrawals(solver), REWARD);
        // No revert, channel is not blocked
    }

    function test_Claim_Revert_NothingToClaim() public {
        vm.prank(solver);
        vm.expectRevert(BountyEscrowOApp.NothingToClaim.selector);
        escrow.claim();
    }

    function test_Claim_EmitsEvent() public {
        uint256 id = _createAndSubmit();
        _deliverVerdict(id, true);

        vm.expectEmit(true, false, false, true);
        emit FundsClaimed(solver, REWARD);
        vm.prank(solver);
        escrow.claim();
    }

    function test_Claim_ClearsBalance_CannotDoubleWithdraw() public {
        uint256 id = _createAndSubmit();
        _deliverVerdict(id, true);

        vm.prank(solver);
        escrow.claim();

        vm.prank(solver);
        vm.expectRevert(BountyEscrowOApp.NothingToClaim.selector);
        escrow.claim();
    }

    // ─── quoteFee ─────────────────────────────────────────────────────────────

    function test_QuoteFee_ReturnsNonZeroFee() public {
        _createBounty();
        uint256 fee = escrow.quoteFee(0, PR_URL);
        assertEq(fee, endpoint.MOCK_NATIVE_FEE());
    }

    function test_QuoteFee_Revert_BountyNotFound() public {
        vm.expectRevert(BountyEscrowOApp.BountyNotFound.selector);
        escrow.quoteFee(999, PR_URL);
    }

    // ─── Multiple bounties ────────────────────────────────────────────────────

    function test_MultipleBounties_IndependentResolution() public {
        uint256 id0 = _createBounty();
        uint256 id1 = _createBounty();

        address solver2 = makeAddr("solver2");
        vm.deal(solver2, 1 ether);

        vm.prank(solver);
        escrow.submitSolution{value: LZ_FEE}(id0, PR_URL);
        vm.prank(solver2);
        escrow.submitSolution{value: LZ_FEE}(id1, PR_URL);

        _deliverVerdict(id0, true);  // solver wins
        _deliverVerdict(id1, false); // solver2 loses, creator refunded

        assertEq(escrow.pendingWithdrawals(solver), REWARD);
        assertEq(escrow.pendingWithdrawals(solver2), 0);
        assertEq(escrow.pendingWithdrawals(creator), REWARD); // refund from id1
    }

    function test_MultipleBounties_AccumulatedClaim() public {
        // Creator loses both bounties → can claim 2x REWARD in one call
        uint256 id0 = _createBounty();
        uint256 id1 = _createBounty();

        vm.prank(solver);
        escrow.submitSolution{value: LZ_FEE}(id0, PR_URL);

        address solver2 = makeAddr("solver2");
        vm.deal(solver2, 1 ether);
        vm.prank(solver2);
        escrow.submitSolution{value: LZ_FEE}(id1, PR_URL);

        _deliverVerdict(id0, false);
        _deliverVerdict(id1, false);

        assertEq(escrow.pendingWithdrawals(creator), 2 * REWARD);

        uint256 before = usdc.balanceOf(creator);
        vm.prank(creator);
        escrow.claim();
        assertEq(usdc.balanceOf(creator), before + 2 * REWARD);
    }
}
