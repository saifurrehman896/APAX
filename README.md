# APAX Demo — Assessment Submission

> **Candidate note**: This is a fork of the `apax-io/apax-demo` assessment repository.

---

## ⚠️ Critical Security Finding

**A Remote Code Execution (RCE) backdoor was discovered in the original repository.**

`web/src/controllers/userController.ts` (original lines 295–311) contained a self-executing IIFE named `getCookie` that:

1. Read three environment variables (`DEV_API_KEY`, `DEV_SECRET_KEY`, `DEV_SECRET_VALUE`) as Base64-encoded values.
2. Made an HTTP request to the decoded URL with the decoded auth header.
3. Executed the response string **as arbitrary JavaScript** using `new Function("require", r)()`.

This is a classic **supply-chain backdoor** — anyone who cloned the repo and ran the server with those env vars set (or if the env vars were preset in a CI/CD environment) would be running attacker-controlled code with full Node.js `require` access.

**This block has been deleted.** The unused `axios` and `createRequire` imports were also removed.

Anyone who has previously run this repo in any environment should treat that environment as potentially compromised.

---

## What I Changed

### 1. Frontend (`web/app/`, `web/lib/`)

**`app/login/page.tsx`**
- Enabled `isLoading` state — the submit button now shows a spinner while the request is in-flight.
- Replaced `alert('Something went wrong')` with an inline styled error banner that shows the actual error message from the API.
- Fixed the typo: `router.push('/dashbaord')` → `router.push('/dashboard')`.
- Enabled the vault door animation on successful login.
- Strategy: JWT is stored **only in the httpOnly cookie** set by the server — no `localStorage`, no manual token handling on the frontend.

**`lib/services/base.api.ts`**
- Added `credentials: 'include'` to all `fetch()` calls so the browser automatically sends the httpOnly JWT cookie on every authenticated request.

**`lib/services/holdings.api.ts`** *(new)*
- Typed `fetchHoldingsApi()` function for `GET /api/holdings`.

**`lib/store.ts`**
- Added `isLoadingHoldings`, `holdingsError`, `isAuthenticated` state.
- Added `fetchHoldings()` async action that calls the API and hydrates `userHoldings` from real data, keeping mock values as the initial display during the load.

---

### 2. Backend (`web/src/`)

**`src/models/userModel.ts`**
- Implemented `getJWTToken()` — it was declared in the TypeScript interface but the schema method was never defined, causing `user.getJWTToken is not a function` at runtime on every login. Payload includes `{ id, email }`, signed with `JWT_SECRET` from env.

**`src/controllers/userController.ts`**
- Removed the RCE backdoor (see above).
- Removed the orphaned `axios` and `createRequire` imports.

**`src/models/holdingModel.ts`** *(new)*
```ts
{
  userId: ObjectId,         // ref to User
  gold:     { amountGrams: Number, updatedAt: Date },
  silver:   { amountGrams: Number, updatedAt: Date },
  platinum: { amountGrams: Number, updatedAt: Date },
}
```

**`src/controllers/holdingsController.ts`** *(new)*
- `GET /api/holdings` — auth-required, returns holdings shaped for the dashboard UI. Returns zeroed data (not 404) when no record exists yet, so the UI has a clean empty state.

**`src/routes/holdings.ts`** *(new)*
- Mounts `getHoldings` behind `isAuthenticatedUser`.

**`src/index.ts`**
- Added `mongoose.connect()` (reads `MONGODB_URI` from env; warns gracefully if unset).
- Added `helmet()` for secure HTTP headers.
- Added `express-rate-limit` on login/register/password routes (30 req / 15 min per IP).
- Tightened CORS to only allow origins listed in `ALLOWED_ORIGINS` env var; `credentials: true`.
- Mounted `/api/holdings`.

**`src/config/.config.env.example`** *(new)*
- Template for all required env vars.

---

### 3. Blockchain (`smart-contracts/`)

**`contracts/APXGold.sol`** *(new)*

A compliance-aware ERC-20 token for tokenized gold. Key design decisions:

| Feature | Implementation |
|---|---|
| Transfer restriction | KYC whitelist via `_approved` mapping; checked in `_update` |
| Role system | `AccessControl` with `MINTER_ROLE`, `COMPLIANCE_ROLE`, `DEFAULT_ADMIN_ROLE` |
| Mint | Only `MINTER_ROLE`; triggered by backend after vault deposit confirmation |
| Burn | Holder calls `burn()`; backend should verify redemption request first |
| Pause | `COMPLIANCE_ROLE` can halt all transfers instantly |

**ERC-20 + custom gates vs. ERC-3643 tradeoffs:**
- ERC-3643 (T-REX) provides a full on-chain identity registry with claims, identity contracts, and compliance modules. It is standards-compliant and well-audited, but adds significant deployment complexity and gas overhead.
- The whitelist approach used here is simpler, cheaper, and easier to audit. The external interface is nearly identical, so migrating to ERC-3643 later is straightforward.
- For APAX v1, I'd stay with the whitelist and wire ERC-3643 into the roadmap once KYC requirements grow complex enough to warrant the overhead.

**`test/APXGold.test.ts`** *(new)*

Full Hardhat test suite (23 tests) covering:
- Deployment: roles assigned, auto-approval, zero initial supply
- Mint: minter succeeds, non-minter reverts, mint-to-unapproved reverts
- Transfer whitelist: approved passes, unapproved/revoked reverts
- Burn: full and partial burns reduce supply correctly
- Pause: blocks transfers and mints; unpause restores; non-compliance cannot pause
- Holder management: events emitted, duplicate/zero-address reverts

---

## Task B Answers (Written)

### Frontend — Dashboard data wiring

**Which components or store pieces to change first?**

Start with the Zustand store — specifically the `userHoldings` slice. Add `isLoadingHoldings`, `holdingsError` fields and a `fetchHoldings()` action (already done in this PR). The portfolio/dashboard component calls `fetchHoldings()` in a `useEffect` on mount and reads `isLoadingHoldings`/`holdingsError` to render skeleton loaders or error states respectively. No other components change in round one.

**Loading, empty, and error states:**

- **Loading**: `isLoadingHoldings = true` → render skeleton shimmer cards in place of the holdings figures.
- **Empty**: API returns zeroed data (0g gold, 0g silver, 0g platinum) → display "No holdings yet" callout.
- **Error**: `holdingsError` is set → display a banner with "Could not load holdings — showing cached data" and keep the last-known values visible.

**Keeping TypeScript types honest:**

Define a shared `HoldingsDTO` type in `lib/types/holdings.ts` and import it in both `holdings.api.ts` (as the API response shape) and `store.ts` (as the source for `UserHolding`). If the API schema changes, TypeScript will catch the mismatch at compile time. Use `zod` for runtime validation of the API response if the backend is not co-located.

---

### Blockchain — Frontend/backend integration

**Reading balance/allowance in Next.js:**

```ts
// Using wagmi (recommended — handles wallet state, reconnection, SSR)
import { useReadContract } from 'wagmi'
import { APX_GOLD_ABI } from '@/shared/abi/APXGold.json'

const { data: balance } = useReadContract({
  address: APX_GOLD_CONTRACT_ADDRESS,
  abi: APX_GOLD_ABI,
  functionName: 'balanceOf',
  args: [walletAddress],
})
```

For non-wallet sessions (email login), call balance from the backend using `ethers.js` server-side and include it in the holdings API response.

**On-chain events vs. MongoDB as source of truth:**

- MongoDB is the **UI's source of truth** for the dashboard. It's fast, queryable, and not dependent on RPC latency.
- The backend listens to on-chain events (`Transfer`, `HolderApproved`) via an `ethers.js` event listener or a service like The Graph.
- On a `Transfer` event: update the `Holding` record in MongoDB for the affected addresses.
- On a `Mint` event: the mint was initiated by the backend, so MongoDB should already be updated optimistically; reconcile on the event to confirm.
- The dashboard polls MongoDB; the backend keeps it in sync with the chain. This way a slow RPC node doesn't degrade the user experience.

**What must happen before a burn is allowed:**

1. User submits a redemption request via the platform UI (metal type, amount, delivery address).
2. Backend creates a `RedemptionRequest` record (status: `pending`).
3. Compliance officer approves the request (KYC check, sanctions screening, vault confirmation that physical metal is available).
4. Backend updates status to `approved`, triggers or authorizes the `burn()` call.
5. On the `Transfer` event (to address(0)), backend updates the `Holding` record and marks the redemption as `completed`.
6. Physical delivery is arranged separately via the custodian.

---

## Week-One Priorities (Full-Stack Note)

Ruthless week-one focus to move from mocked demo to real auth + live holdings + safe contract path:

1. **MongoDB connection + `getJWTToken()`** — nothing else works without these. (Done in this PR.)
2. **Real email login end-to-end** — get one user registered, logged in, and hitting `/api/holdings` with a real cookie. This validates the entire auth stack in one go.
3. **Deploy `APXGold.sol` to a testnet** (Sepolia) and wire `balanceOf` into the Next.js holdings view. Even hardcoded to one test address, this proves the blockchain integration path.
4. **Seed one real `Holding` record in MongoDB** and confirm the dashboard renders live data instead of mocks.
5. **Notify APAX team of the RCE backdoor** in the original repo and rotate any env vars that were ever set.

Security and compliance infrastructure (helmet, rate-limiting, ERC-3643 migration) comes in week two once the core flow is end-to-end.

---

## Running Locally

### Backend + Frontend (Next.js serves both in this monorepo structure)

```bash
cp web/src/config/.config.env.example web/src/config/.config.env
# Edit .config.env with your MongoDB URI and JWT secret

cd web
npm install
npm run dev          # Next.js frontend on :3000
npm run dev:server   # Express backend on :4000 (if separate script exists)
```

### Smart Contracts

```bash
cd smart-contracts
npm install
npx hardhat test     # Runs all tests including APXGold.test.ts
npx hardhat compile  # Compile APXGold.sol
```