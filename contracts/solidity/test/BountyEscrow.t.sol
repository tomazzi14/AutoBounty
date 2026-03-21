// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/BountyEscrow.sol";

contract BountyEscrowTest is Test {
    BountyEscrow escrow;
    address owner = address(this);
    address relayer = address(0xBEEF);
    address sponsor = address(0xCAFE);
    address reporter = address(0xDEAD);

    function setUp() public {
        escrow = new BountyEscrow(relayer);
        vm.deal(sponsor, 10 ether);
        vm.deal(reporter, 0);
    }

    function test_createBounty() public {
        vm.prank(sponsor);
        uint256 bountyId = escrow.createBounty{value: 1 ether}();
        assertEq(bountyId, 0);
        (address s, uint256 pool, bool active) = escrow.bounties(bountyId);
        assertEq(s, sponsor);
        assertEq(pool, 1 ether);
        assertTrue(active);
    }

    function test_releasePayout() public {
        vm.prank(sponsor);
        uint256 bountyId = escrow.createBounty{value: 1 ether}();

        vm.prank(relayer);
        escrow.releasePayout(bountyId, reporter, 0.5 ether);

        assertEq(reporter.balance, 0.5 ether);
        (, uint256 pool,) = escrow.bounties(bountyId);
        assertEq(pool, 0.5 ether);
    }

    function test_releasePayout_revert_notRelayer() public {
        vm.prank(sponsor);
        uint256 bountyId = escrow.createBounty{value: 1 ether}();

        vm.prank(sponsor);
        vm.expectRevert(BountyEscrow.OnlyRelayer.selector);
        escrow.releasePayout(bountyId, reporter, 0.5 ether);
    }

    function test_releasePayout_revert_alreadyPaid() public {
        vm.prank(sponsor);
        uint256 bountyId = escrow.createBounty{value: 2 ether}();

        vm.startPrank(relayer);
        escrow.releasePayout(bountyId, reporter, 0.5 ether);

        vm.expectRevert(BountyEscrow.AlreadyPaid.selector);
        escrow.releasePayout(bountyId, reporter, 0.5 ether);
        vm.stopPrank();
    }

    function test_releasePayout_revert_insufficientPool() public {
        vm.prank(sponsor);
        uint256 bountyId = escrow.createBounty{value: 1 ether}();

        vm.prank(relayer);
        vm.expectRevert(BountyEscrow.InsufficientPool.selector);
        escrow.releasePayout(bountyId, reporter, 2 ether);
    }

    function test_closeBounty() public {
        vm.prank(sponsor);
        uint256 bountyId = escrow.createBounty{value: 1 ether}();

        uint256 balanceBefore = sponsor.balance;
        vm.prank(sponsor);
        escrow.closeBounty(bountyId);

        assertEq(sponsor.balance, balanceBefore + 1 ether);
        (,, bool active) = escrow.bounties(bountyId);
        assertFalse(active);
    }

    function test_closeBounty_revert_notSponsor() public {
        vm.prank(sponsor);
        uint256 bountyId = escrow.createBounty{value: 1 ether}();

        vm.prank(reporter);
        vm.expectRevert("Not sponsor");
        escrow.closeBounty(bountyId);
    }

    function test_setRelayer() public {
        address newRelayer = address(0x1234);
        escrow.setRelayer(newRelayer);
        assertEq(escrow.relayer(), newRelayer);
    }

    function test_setRelayer_revert_notOwner() public {
        vm.prank(sponsor);
        vm.expectRevert(BountyEscrow.OnlyOwner.selector);
        escrow.setRelayer(address(0x1234));
    }
}
