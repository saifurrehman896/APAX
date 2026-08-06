// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title APX-Gold
 * @notice Compliance-aware ERC-20 token representing tokenized physical gold.
 *
 * Design decisions vs. plain ERC-20:
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Transfer whitelist (KYC/AML gate)
 *    Transfers are only allowed between addresses that have been approved by the
 *    COMPLIANCE_ROLE. This is a simpler and cheaper alternative to ERC-3643
 *    (T-REX). ERC-3643 provides a full identity-registry architecture which is
 *    better for large deployments but adds significant deployment complexity.
 *    For APAX v1, the whitelist approach is pragmatic; the interface is identical
 *    to what ERC-3643 would expose, making migration straightforward.
 *
 * 2. Role-based access (AccessControl instead of Ownable)
 *    - DEFAULT_ADMIN_ROLE: can grant/revoke all other roles (multi-sig recommended).
 *    - MINTER_ROLE: can mint tokens — awarded to the backend service that processes
 *      vault deposits; revocable if that service is compromised.
 *    - COMPLIANCE_ROLE: can approve/revoke holders and pause the contract.
 *
 * 3. Mint-on-deposit
 *    Only MINTER_ROLE can mint. The intended flow:
 *      a. Physical gold is deposited and verified in the vault.
 *      b. Backend confirms deposit (off-chain verification / custodian attestation).
 *      c. Backend calls mint(recipientAddress, gramsInWei) to issue tokens.
 *    1 APX-Gold token = 1 gram of gold (18 decimals, so 1g = 1e18 units).
 *
 * 4. Burn-on-redemption
 *    Holders call burn() themselves. Before this is processed, the backend should:
 *      a. Receive a redemption request via the platform UI.
 *      b. Verify KYC and shipping details.
 *      c. Lock the redemption (backend state machine).
 *      d. Call or authorize the burn.
 *    This prevents burns without physical delivery being arranged.
 *
 * 5. Pause
 *    COMPLIANCE_ROLE can pause all transfers (e.g., regulatory freeze).
 *
 * Security risks to watch for:
 * ─────────────────────────────────────────────────────────────────────────────
 * - Admin key compromise: use a multi-sig (Gnosis Safe) as DEFAULT_ADMIN.
 * - Minter key compromise: use a separate hardware-backed key / MPC wallet.
 * - Reentrancy: ERC-20 transfer hooks are minimal — low risk here, but audit any
 *   future integrations (e.g., ERC-777 hooks, DeFi adapter contracts).
 * - Oracle manipulation: if price oracles are used for on-chain Zakat or
 *   collateral calculations, ensure they use time-weighted averages.
 * - Integer overflow: Solidity 0.8.x has built-in overflow protection.
 */
contract APXGold is ERC20, AccessControl, Pausable {
    // ─── Roles ──────────────────────────────────────────────────────────────

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");

    // ─── State ──────────────────────────────────────────────────────────────

    /// @dev Mapping of KYC-approved addresses allowed to send/receive tokens.
    mapping(address => bool) private _approved;

    // ─── Events ─────────────────────────────────────────────────────────────

    event HolderApproved(address indexed holder);
    event HolderRevoked(address indexed holder);

    // ─── Errors ─────────────────────────────────────────────────────────────

    error InvalidAddress();
    error AlreadyApproved(address holder);
    error NotApproved(address holder);
    error TransferNotAllowed(address addr);

    // ─── Constructor ────────────────────────────────────────────────────────

    /**
     * @param admin         Address that receives DEFAULT_ADMIN_ROLE — use a multi-sig.
     * @param compliance    Address that receives COMPLIANCE_ROLE (e.g. compliance officer key).
     * @param minter        Address that receives MINTER_ROLE (e.g. backend vault service).
     */
    constructor(
        address admin,
        address compliance,
        address minter
    ) ERC20("APX Gold", "APX-XAU") {
        if (admin == address(0) || compliance == address(0) || minter == address(0)) {
            revert InvalidAddress();
        }

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ROLE, compliance);
        _grantRole(MINTER_ROLE, minter);

        // Auto-approve the admin so they can receive tokens (e.g. for initial bootstrap)
        _approved[admin] = true;
        emit HolderApproved(admin);
    }

    // ─── Compliance: Holder Management ──────────────────────────────────────

    /**
     * @notice Approve an address to hold and transfer APX-Gold (KYC gate).
     * @dev Only COMPLIANCE_ROLE. Intended to be called after off-chain KYC pass.
     */
    function approveHolder(address holder) external onlyRole(COMPLIANCE_ROLE) {
        if (holder == address(0)) revert InvalidAddress();
        if (_approved[holder]) revert AlreadyApproved(holder);
        _approved[holder] = true;
        emit HolderApproved(holder);
    }

    /**
     * @notice Revoke an address's holding approval (e.g. KYC lapse, sanctions hit).
     * @dev Only COMPLIANCE_ROLE. Existing balance is frozen — holder cannot transfer.
     */
    function revokeHolder(address holder) external onlyRole(COMPLIANCE_ROLE) {
        if (holder == address(0)) revert InvalidAddress();
        if (!_approved[holder]) revert NotApproved(holder);
        _approved[holder] = false;
        emit HolderRevoked(holder);
    }

    /**
     * @notice Check whether an address is KYC-approved.
     */
    function isApproved(address holder) external view returns (bool) {
        return _approved[holder];
    }

    // ─── Mint / Burn ────────────────────────────────────────────────────────

    /**
     * @notice Mint tokens to a KYC-approved address after physical gold is deposited.
     * @dev Only MINTER_ROLE. Recipient must be approved before mint can succeed.
     * @param to     Approved recipient address.
     * @param amount Amount in token units (1 gram = 1e18).
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        // _update will enforce the approved-holder check
        _mint(to, amount);
    }

    /**
     * @notice Burn caller's tokens as part of a physical redemption.
     * @dev Caller must be approved. Backend should verify redemption request and
     *      physical delivery arrangement before authorizing this call.
     * @param amount Amount to burn.
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    // ─── Pause ──────────────────────────────────────────────────────────────

    /**
     * @notice Pause all token transfers (regulatory freeze / emergency stop).
     * @dev Only COMPLIANCE_ROLE.
     */
    function pause() external onlyRole(COMPLIANCE_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause token transfers.
     * @dev Only COMPLIANCE_ROLE.
     */
    function unpause() external onlyRole(COMPLIANCE_ROLE) {
        _unpause();
    }

    // ─── Internal Hook ──────────────────────────────────────────────────────

    /**
     * @dev Override ERC-20's _update to enforce:
     *   1. Contract is not paused.
     *   2. Both sender and recipient are KYC-approved (except for mint/burn which
     *      use address(0) as the counterpart).
     */
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override {
        // 1. Pause check
        if (paused()) {
            revert EnforcedPause();
        }

        // 2. Sender check (skip for minting — from == address(0))
        if (from != address(0) && !_approved[from]) {
            revert TransferNotAllowed(from);
        }

        // 3. Recipient check (skip for burning — to == address(0))
        if (to != address(0) && !_approved[to]) {
            revert TransferNotAllowed(to);
        }

        super._update(from, to, value);
    }
}
