// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/BountyEscrow.sol";

contract BountyEscrowTest is Test {
    BountyEscrow escrow;
    address relayerAddr = address(0xBEEF);
    address creator = address(0xCAFE);
    address solver = address(0xDEAD);

    function setUp() public {
        escrow = new BountyEscrow(relayerAddr);
        vm.deal(creator, 10 ether);
        vm.deal(solver, 1 ether);
    }

    function test_createBounty() public {
        vm.prank(creator);
        escrow.createBounty{value: 1 ether}("https://github.com/org/repo/issues/1");
        (uint256 id, address c,,, uint256 amount,,) = escrow.bounties(0);
        assertEq(id, 0);
        assertEq(c, creator);
        assertEq(amount, 1 ether);
    }

    function test_createBounty_revert_noValue() public {
        vm.prank(creator);
        vm.expectRevert("Must send AVAX");
        escrow.createBounty{value: 0}("https://github.com/org/repo/issues/1");
    }

    function test_submitSolution() public {
        vm.prank(creator);
        escrow.createBounty{value: 1 ether}("https://github.com/org/repo/issues/1");

        vm.prank(solver);
        escrow.submitSolution(0, "https://github.com/org/repo/pull/2");

        (,,,,, address s, BountyEscrow.Status status) = escrow.bounties(0);
        assertEq(s, solver);
        assertEq(uint(status), uint(BountyEscrow.Status.Submitted));
    }

    function test_submitSolution_revert_notOpen() public {
        vm.prank(creator);
        escrow.createBounty{value: 1 ether}("https://github.com/org/repo/issues/1");

        vm.prank(solver);
        escrow.submitSolution(0, "https://github.com/org/repo/pull/2");

        vm.prank(solver);
        vm.expectRevert("Bounty not open");
        escrow.submitSolution(0, "https://github.com/org/repo/pull/3");
    }

    function test_resolveBounty_approved() public {
        vm.prank(creator);
        escrow.createBounty{value: 1 ether}("https://github.com/org/repo/issues/1");

        vm.prank(solver);
        escrow.submitSolution(0, "https://github.com/org/repo/pull/2");

        uint256 solverBefore = solver.balance;
        vm.prank(relayerAddr);
        escrow.resolveBounty(0, true);

        assertEq(solver.balance, solverBefore + 1 ether);
        (,,,,,, BountyEscrow.Status status) = escrow.bounties(0);
        assertEq(uint(status), uint(BountyEscrow.Status.Approved));
    }

    function test_resolveBounty_rejected() public {
        vm.prank(creator);
        escrow.createBounty{value: 1 ether}("https://github.com/org/repo/issues/1");

        vm.prank(solver);
        escrow.submitSolution(0, "https://github.com/org/repo/pull/2");

        uint256 creatorBefore = creator.balance;
        vm.prank(relayerAddr);
        escrow.resolveBounty(0, false);

        assertEq(creator.balance, creatorBefore + 1 ether);
        (,,,,,, BountyEscrow.Status status) = escrow.bounties(0);
        assertEq(uint(status), uint(BountyEscrow.Status.Rejected));
    }

    function test_resolveBounty_revert_notRelayer() public {
        vm.prank(creator);
        escrow.createBounty{value: 1 ether}("https://github.com/org/repo/issues/1");

        vm.prank(solver);
        escrow.submitSolution(0, "https://github.com/org/repo/pull/2");

        vm.prank(creator);
        vm.expectRevert("Only relayer");
        escrow.resolveBounty(0, true);
    }

    function test_resolveBounty_revert_notSubmitted() public {
        vm.prank(creator);
        escrow.createBounty{value: 1 ether}("https://github.com/org/repo/issues/1");

        vm.prank(relayerAddr);
        vm.expectRevert("Bounty not submitted");
        escrow.resolveBounty(0, true);
    }
}
