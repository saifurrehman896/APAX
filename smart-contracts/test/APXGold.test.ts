import { expect } from "chai";
import { network } from "hardhat";

describe("APXGold", function () {

    async function deployFixture() {
        const { ethers } = await network.connect();

        const [admin, compliance, minter, holder1, holder2, stranger] =
            await ethers.getSigners();

        const APXGold = await ethers.getContractFactory("APXGold");
        const token = await APXGold.deploy(
            admin.address,
            compliance.address,
            minter.address
        );
        await token.waitForDeployment();

        const MINTER_ROLE = await token.MINTER_ROLE();
        const COMPLIANCE_ROLE = await token.COMPLIANCE_ROLE();

        return { token, admin, compliance, minter, holder1, holder2, stranger, ethers, MINTER_ROLE, COMPLIANCE_ROLE };
    }

    // ─── Deployment ─────────────────────────────────────────────────────────

    describe("Deployment", function () {
        it("Should set correct roles", async function () {
            const { token, admin, compliance, minter, MINTER_ROLE, COMPLIANCE_ROLE } =
                await deployFixture();

            const ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();
            expect(await token.hasRole(ADMIN_ROLE, admin.address)).to.equal(true);
            expect(await token.hasRole(COMPLIANCE_ROLE, compliance.address)).to.equal(true);
            expect(await token.hasRole(MINTER_ROLE, minter.address)).to.equal(true);
        });

        it("Should auto-approve the admin", async function () {
            const { token, admin } = await deployFixture();
            expect(await token.isApproved(admin.address)).to.equal(true);
        });

        it("Should start with zero supply", async function () {
            const { token } = await deployFixture();
            expect(await token.totalSupply()).to.equal(0n);
        });
    });

    // ─── Mint (vault deposit) ────────────────────────────────────────────────

    describe("Mint (vault deposit)", function () {
        it("Should allow MINTER_ROLE to mint to an approved holder", async function () {
            const { token, compliance, minter, holder1, ethers } = await deployFixture();
            await token.connect(compliance).approveHolder(holder1.address);

            const amount = ethers.parseEther("100"); // 100 grams
            await token.connect(minter).mint(holder1.address, amount);

            expect(await token.balanceOf(holder1.address)).to.equal(amount);
            expect(await token.totalSupply()).to.equal(amount);
        });

        it("Should revert mint to unapproved holder", async function () {
            const { token, minter, holder1, ethers } = await deployFixture();
            await expect(
                token.connect(minter).mint(holder1.address, ethers.parseEther("100"))
            ).to.be.revertedWithCustomError(token, "TransferNotAllowed")
                .withArgs(holder1.address);
        });

        it("Should revert mint from non-minter", async function () {
            const { token, compliance, stranger, holder1, ethers, MINTER_ROLE } =
                await deployFixture();
            await token.connect(compliance).approveHolder(holder1.address);
            await expect(
                token.connect(stranger).mint(holder1.address, ethers.parseEther("100"))
            ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount")
                .withArgs(stranger.address, MINTER_ROLE);
        });
    });

    // ─── Transfer whitelist ─────────────────────────────────────────────────

    describe("Transfer whitelist", function () {
        it("Should allow transfer between approved holders", async function () {
            const { token, compliance, minter, holder1, holder2, ethers } =
                await deployFixture();
            await token.connect(compliance).approveHolder(holder1.address);
            await token.connect(compliance).approveHolder(holder2.address);

            const amount = ethers.parseEther("50");
            await token.connect(minter).mint(holder1.address, amount);
            await token.connect(holder1).transfer(holder2.address, amount);

            expect(await token.balanceOf(holder2.address)).to.equal(amount);
        });

        it("Should reject transfer to unapproved holder", async function () {
            const { token, compliance, minter, holder1, holder2, ethers } =
                await deployFixture();
            await token.connect(compliance).approveHolder(holder1.address);
            await token.connect(minter).mint(holder1.address, ethers.parseEther("50"));

            await expect(
                token.connect(holder1).transfer(holder2.address, ethers.parseEther("50"))
            ).to.be.revertedWithCustomError(token, "TransferNotAllowed")
                .withArgs(holder2.address);
        });

        it("Should reject transfer from revoked holder", async function () {
            const { token, compliance, minter, holder1, holder2, ethers } =
                await deployFixture();
            await token.connect(compliance).approveHolder(holder1.address);
            await token.connect(compliance).approveHolder(holder2.address);
            await token.connect(minter).mint(holder1.address, ethers.parseEther("50"));

            // Revoke holder1
            await token.connect(compliance).revokeHolder(holder1.address);

            await expect(
                token.connect(holder1).transfer(holder2.address, ethers.parseEther("50"))
            ).to.be.revertedWithCustomError(token, "TransferNotAllowed")
                .withArgs(holder1.address);
        });
    });

    // ─── Burn (redemption) ──────────────────────────────────────────────────

    describe("Burn (redemption)", function () {
        it("Should allow approved holder to burn their tokens", async function () {
            const { token, compliance, minter, holder1, ethers } = await deployFixture();
            await token.connect(compliance).approveHolder(holder1.address);
            const amount = ethers.parseEther("30");
            await token.connect(minter).mint(holder1.address, amount);

            await token.connect(holder1).burn(amount);

            expect(await token.balanceOf(holder1.address)).to.equal(0n);
            expect(await token.totalSupply()).to.equal(0n);
        });

        it("Should allow partial burn", async function () {
            const { token, compliance, minter, holder1, ethers } = await deployFixture();
            await token.connect(compliance).approveHolder(holder1.address);
            const mintAmount = ethers.parseEther("100");
            const burnAmount = ethers.parseEther("40");
            await token.connect(minter).mint(holder1.address, mintAmount);

            await token.connect(holder1).burn(burnAmount);

            expect(await token.balanceOf(holder1.address)).to.equal(mintAmount - burnAmount);
        });
    });

    // ─── Pause ──────────────────────────────────────────────────────────────

    describe("Pause", function () {
        it("Should allow COMPLIANCE_ROLE to pause", async function () {
            const { token, compliance, minter, holder1, holder2, ethers } =
                await deployFixture();
            await token.connect(compliance).approveHolder(holder1.address);
            await token.connect(compliance).approveHolder(holder2.address);
            await token.connect(minter).mint(holder1.address, ethers.parseEther("50"));

            await token.connect(compliance).pause();

            await expect(
                token.connect(holder1).transfer(holder2.address, ethers.parseEther("10"))
            ).to.be.revertedWithCustomError(token, "EnforcedPause");
        });

        it("Should resume transfers after unpause", async function () {
            const { token, compliance, minter, holder1, holder2, ethers } =
                await deployFixture();
            await token.connect(compliance).approveHolder(holder1.address);
            await token.connect(compliance).approveHolder(holder2.address);
            const amount = ethers.parseEther("50");
            await token.connect(minter).mint(holder1.address, amount);

            await token.connect(compliance).pause();
            await token.connect(compliance).unpause();

            await token.connect(holder1).transfer(holder2.address, amount);
            expect(await token.balanceOf(holder2.address)).to.equal(amount);
        });

        it("Should prevent non-compliance from pausing", async function () {
            const { token, stranger, COMPLIANCE_ROLE } = await deployFixture();
            await expect(
                token.connect(stranger).pause()
            ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount")
                .withArgs(stranger.address, COMPLIANCE_ROLE);
        });

        it("Should also block mint while paused", async function () {
            const { token, compliance, minter, holder1, ethers } = await deployFixture();
            await token.connect(compliance).approveHolder(holder1.address);
            await token.connect(compliance).pause();

            await expect(
                token.connect(minter).mint(holder1.address, ethers.parseEther("100"))
            ).to.be.revertedWithCustomError(token, "EnforcedPause");
        });
    });

    // ─── Holder Management ──────────────────────────────────────────────────

    describe("Holder Management", function () {
        it("Should emit HolderApproved event", async function () {
            const { token, compliance, holder1 } = await deployFixture();
            await expect(token.connect(compliance).approveHolder(holder1.address))
                .to.emit(token, "HolderApproved")
                .withArgs(holder1.address);
        });

        it("Should emit HolderRevoked event", async function () {
            const { token, compliance, holder1 } = await deployFixture();
            await token.connect(compliance).approveHolder(holder1.address);
            await expect(token.connect(compliance).revokeHolder(holder1.address))
                .to.emit(token, "HolderRevoked")
                .withArgs(holder1.address);
        });

        it("Should revert double-approval", async function () {
            const { token, compliance, holder1 } = await deployFixture();
            await token.connect(compliance).approveHolder(holder1.address);
            await expect(
                token.connect(compliance).approveHolder(holder1.address)
            ).to.be.revertedWithCustomError(token, "AlreadyApproved")
                .withArgs(holder1.address);
        });

        it("Should revert revoking non-approved holder", async function () {
            const { token, compliance, holder1 } = await deployFixture();
            await expect(
                token.connect(compliance).revokeHolder(holder1.address)
            ).to.be.revertedWithCustomError(token, "NotApproved")
                .withArgs(holder1.address);
        });

        it("Should revert zero-address approval", async function () {
            const { token, compliance, ethers } = await deployFixture();
            await expect(
                token.connect(compliance).approveHolder(ethers.ZeroAddress)
            ).to.be.revertedWithCustomError(token, "InvalidAddress");
        });
    });
});
