// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {BountyEscrow} from "../src/BountyEscrow.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract BountyEscrowTest is Test {
    event BountyCreated(uint256 indexed bountyId, address creator, string issueURL, uint256 amount);
    event SolutionSubmitted(uint256 indexed bountyId, address solver, string prURL);
    event BountyResolved(uint256 indexed bountyId, bool approved);

    BountyEscrow public escrow;
    MockUSDC public usdc;

    address public relayerAddr = makeAddr("relayer");
    address public creator = makeAddr("creator");
    address public solver = makeAddr("solver");
    address public attacker = makeAddr("attacker");

    string constant ISSUE_URL = "https://github.com/org/repo/issues/42";
    string constant PR_URL = "https://github.com/org/repo/pull/43";
    uint256 constant REWARD = 500e6; // 500 mUSDC

    function setUp() public {
        usdc = new MockUSDC();
        escrow = new BountyEscrow(relayerAddr, address(usdc));

        usdc.mint(creator, 10_000e6);
        usdc.mint(attacker, 1_000e6);

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
        vm.prank(relayerAddr);
        escrow.submitSolution(bountyId, PR_URL, solver);
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
            BountyEscrow.Status storedStatus
        ) = escrow.bounties(id);

        assertEq(storedId, id);
        assertEq(storedCreator, creator);
        assertEq(storedIssueURL, ISSUE_URL);
        assertEq(storedPrURL, "");
        assertEq(storedAmount, REWARD);
        assertEq(storedSolver, address(0));
        assertEq(uint8(storedStatus), uint8(BountyEscrow.Status.Open));
    }

    function test_CreateBounty_BountyCountIncreases() public {
        assertEq(escrow.bountyCount(), 0);
        _createBounty();
        assertEq(escrow.bountyCount(), 1);
        _createBounty();
        assertEq(escrow.bountyCount(), 2);
    }

    function test_CreateBounty_EmitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit BountyCreated(0, creator, ISSUE_URL, REWARD);

        vm.prank(creator);
        escrow.createBounty(ISSUE_URL, REWARD);
    }

    function test_CreateBounty_TransfersUSDC() public {
        uint256 creatorBefore = usdc.balanceOf(creator);
        uint256 escrowBefore = usdc.balanceOf(address(escrow));
        _createBounty();
        assertEq(usdc.balanceOf(creator), creatorBefore - REWARD);
        assertEq(usdc.balanceOf(address(escrow)), escrowBefore + REWARD);
    }

    function test_CreateBounty_Revert_ZeroAmount() public {
        vm.prank(creator);
        vm.expectRevert(BountyEscrow.ZeroAmount.selector);
        escrow.createBounty(ISSUE_URL, 0);
    }

    function test_CreateBounty_Revert_NoApproval() public {
        address noApproval = makeAddr("noApproval");
        usdc.mint(noApproval, 1_000e6);
        // no approve call
        vm.prank(noApproval);
        vm.expectRevert(); // MockUSDC reverts on insufficient allowance
        escrow.createBounty(ISSUE_URL, REWARD);
    }

    // ─── submitSolution ──────────────────────────────────────────────────────

    function test_SubmitSolution_StorageIsCorrect() public {
        uint256 id = _createBounty();

        vm.prank(relayerAddr);
        escrow.submitSolution(id, PR_URL, solver);

        (,,,string memory storedPrURL,, address storedSolver, BountyEscrow.Status storedStatus) =
            escrow.bounties(id);

        assertEq(storedPrURL, PR_URL);
        assertEq(storedSolver, solver);
        assertEq(uint8(storedStatus), uint8(BountyEscrow.Status.Submitted));
    }

    function test_SubmitSolution_EmitsEvent() public {
        uint256 id = _createBounty();

        vm.expectEmit(true, true, false, true);
        emit SolutionSubmitted(id, solver, PR_URL);

        vm.prank(relayerAddr);
        escrow.submitSolution(id, PR_URL, solver);
    }

    function test_SubmitSolution_Revert_NotRelayer() public {
        uint256 id = _createBounty();

        vm.prank(attacker);
        vm.expectRevert(BountyEscrow.OnlyRelayer.selector);
        escrow.submitSolution(id, PR_URL, solver);
    }

    function test_SubmitSolution_Revert_ZeroSolver() public {
        uint256 id = _createBounty();

        vm.prank(relayerAddr);
        vm.expectRevert(BountyEscrow.ZeroAddress.selector);
        escrow.submitSolution(id, PR_URL, address(0));
    }

    function test_SubmitSolution_Revert_BountyNotFound() public {
        vm.prank(relayerAddr);
        vm.expectRevert(BountyEscrow.BountyNotFound.selector);
        escrow.submitSolution(999, PR_URL, solver);
    }

    function test_SubmitSolution_Revert_BountyNotOpen_WhenSubmitted() public {
        uint256 id = _createAndSubmit();

        vm.prank(relayerAddr);
        vm.expectRevert(BountyEscrow.BountyNotOpen.selector);
        escrow.submitSolution(id, PR_URL, solver);
    }

    function test_SubmitSolution_Revert_BountyNotOpen_WhenApproved() public {
        uint256 id = _createAndSubmit();

        vm.prank(relayerAddr);
        escrow.resolveBounty(id, true);

        vm.prank(relayerAddr);
        vm.expectRevert(BountyEscrow.BountyNotOpen.selector);
        escrow.submitSolution(id, PR_URL, solver);
    }

    function test_SubmitSolution_Revert_BountyNotOpen_WhenRejected() public {
        uint256 id = _createAndSubmit();

        vm.prank(relayerAddr);
        escrow.resolveBounty(id, false);

        vm.prank(relayerAddr);
        vm.expectRevert(BountyEscrow.BountyNotOpen.selector);
        escrow.submitSolution(id, PR_URL, solver);
    }

    // ─── resolveBounty ───────────────────────────────────────────────────────

    function test_ResolveBounty_Approved_SolverReceivesUSDC() public {
        uint256 id = _createAndSubmit();

        uint256 solverBefore = usdc.balanceOf(solver);

        vm.prank(relayerAddr);
        escrow.resolveBounty(id, true);

        assertEq(usdc.balanceOf(solver), solverBefore + REWARD);
        assertEq(usdc.balanceOf(address(escrow)), 0);
    }

    function test_ResolveBounty_Approved_StatusIsApproved() public {
        uint256 id = _createAndSubmit();

        vm.prank(relayerAddr);
        escrow.resolveBounty(id, true);

        (,,,,,, BountyEscrow.Status storedStatus) = escrow.bounties(id);
        assertEq(uint8(storedStatus), uint8(BountyEscrow.Status.Approved));
    }

    function test_ResolveBounty_Rejected_CreatorReceivesUSDC() public {
        uint256 id = _createAndSubmit();

        uint256 creatorBefore = usdc.balanceOf(creator);

        vm.prank(relayerAddr);
        escrow.resolveBounty(id, false);

        assertEq(usdc.balanceOf(creator), creatorBefore + REWARD);
        assertEq(usdc.balanceOf(address(escrow)), 0);
    }

    function test_ResolveBounty_Rejected_StatusIsRejected() public {
        uint256 id = _createAndSubmit();

        vm.prank(relayerAddr);
        escrow.resolveBounty(id, false);

        (,,,,,, BountyEscrow.Status storedStatus) = escrow.bounties(id);
        assertEq(uint8(storedStatus), uint8(BountyEscrow.Status.Rejected));
    }

    function test_ResolveBounty_EmitsEvent_Approved() public {
        uint256 id = _createAndSubmit();

        vm.expectEmit(true, false, false, true);
        emit BountyResolved(id, true);

        vm.prank(relayerAddr);
        escrow.resolveBounty(id, true);
    }

    function test_ResolveBounty_EmitsEvent_Rejected() public {
        uint256 id = _createAndSubmit();

        vm.expectEmit(true, false, false, true);
        emit BountyResolved(id, false);

        vm.prank(relayerAddr);
        escrow.resolveBounty(id, false);
    }

    function test_ResolveBounty_Revert_OnlyRelayer_Creator() public {
        uint256 id = _createAndSubmit();

        vm.prank(creator);
        vm.expectRevert(BountyEscrow.OnlyRelayer.selector);
        escrow.resolveBounty(id, true);
    }

    function test_ResolveBounty_Revert_OnlyRelayer_Solver() public {
        uint256 id = _createAndSubmit();

        vm.prank(solver);
        vm.expectRevert(BountyEscrow.OnlyRelayer.selector);
        escrow.resolveBounty(id, true);
    }

    function test_ResolveBounty_Revert_OnlyRelayer_Attacker() public {
        uint256 id = _createAndSubmit();

        vm.prank(attacker);
        vm.expectRevert(BountyEscrow.OnlyRelayer.selector);
        escrow.resolveBounty(id, true);
    }

    function test_ResolveBounty_Revert_BountyNotFound() public {
        vm.prank(relayerAddr);
        vm.expectRevert(BountyEscrow.BountyNotFound.selector);
        escrow.resolveBounty(999, true);
    }

    function test_ResolveBounty_Revert_NotSubmitted_WhenOpen() public {
        uint256 id = _createBounty();

        vm.prank(relayerAddr);
        vm.expectRevert(BountyEscrow.BountyNotSubmitted.selector);
        escrow.resolveBounty(id, true);
    }

    function test_ResolveBounty_Revert_NotSubmitted_WhenAlreadyApproved() public {
        uint256 id = _createAndSubmit();

        vm.prank(relayerAddr);
        escrow.resolveBounty(id, true);

        vm.prank(relayerAddr);
        vm.expectRevert(BountyEscrow.BountyNotSubmitted.selector);
        escrow.resolveBounty(id, true);
    }

    function test_ResolveBounty_Revert_NotSubmitted_WhenAlreadyRejected() public {
        uint256 id = _createAndSubmit();

        vm.prank(relayerAddr);
        escrow.resolveBounty(id, false);

        vm.prank(relayerAddr);
        vm.expectRevert(BountyEscrow.BountyNotSubmitted.selector);
        escrow.resolveBounty(id, false);
    }

    // ─── Multiple bounties ───────────────────────────────────────────────────

    function test_MultipleBounties_IndependentIds() public {
        vm.prank(creator);
        escrow.createBounty(ISSUE_URL, 1_000e6);

        vm.prank(creator);
        escrow.createBounty(ISSUE_URL, 2_000e6);

        assertEq(escrow.bountyCount(), 2);

        (uint256 id0,,,, uint256 amount0,,) = escrow.bounties(0);
        (uint256 id1,,,, uint256 amount1,,) = escrow.bounties(1);

        assertEq(id0, 0);
        assertEq(id1, 1);
        assertEq(amount0, 1_000e6);
        assertEq(amount1, 2_000e6);
    }
}
