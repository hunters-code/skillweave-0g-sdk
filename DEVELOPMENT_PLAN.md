# SkillWeave 0G SDK — Development Plan

## TL;DR

Build the complete SkillWeave system: Solidity smart contracts (Hardhat) first, then the TypeScript SDK wrapping them. The codebase is 100% stubs today. Contracts come first because they define the on-chain API that 3 of 4 SDK modules wrap. We use ethers v6 (required by `@0gfoundation/0g-ts-sdk`), Hardhat for contracts, typechain for auto-generated bindings, and vitest for SDK unit tests.

## Key Decisions

- **ethers v6** for all blockchain interaction (`0g-ts-sdk` peer dependency)
- **Hardhat** for smart contract development, testing, and deployment
- **Contracts first** — built and tested before SDK modules, to avoid mock drift
- **typechain** generates TypeScript bindings from contract ABIs → SDK consumes these directly
- **vitest** for SDK unit tests
- **OpenZeppelin** for battle-tested contract patterns (AccessControl, Pausable, ReentrancyGuard)
- **0G chain** is EVM-compatible; Hardhat config targets 0G testnet RPC (`https://evmrpc-testnet.0g.ai`)
- **Remove axios** — ethers has built-in HTTP
- **Soft-delete for 0G Storage** — 0G is append-only

---

## Phase 0: Toolchain & Project Foundation

> Goal: Make the project buildable, testable, and correctly configured for both contracts and SDK.

### Step 0.1 — Fix `package.json`

- Add devDependencies: `typescript`, `tsup`, `vitest`, `@types/node`, `hardhat`, `@nomicfoundation/hardhat-toolbox`, `@typechain/hardhat`, `@typechain/ethers-v6`, `typechain`, `@openzeppelin/contracts`, `hardhat-gas-reporter`, `solidity-coverage`
- Fix `main` → `dist/index.js`, add `module` → `dist/index.mjs`, add `types` → `dist/index.d.ts`
- Pin `ethers` to `^6.13.1` (match `0g-ts-sdk` peer dep)
- Add scripts: `build` (tsup), `test` (vitest), `test:contracts` (hardhat test), `compile` (hardhat compile), `typecheck` (tsc --noEmit), `deploy:testnet`
- Remove unused `axios` dependency

### Step 0.2 — Hardhat project setup

- Create `hardhat.config.ts` at project root
- Configure: Solidity 0.8.24+, typechain (ethers-v6 target), networks (hardhat local, 0G testnet), gas reporter
- Create `contracts/` directory at project root for Solidity files
- Create `deploy/` directory for deployment scripts

### Step 0.3 — Verify both pipelines

- `npx hardhat compile` succeeds
- `npm run build` succeeds for SDK
- `npm run typecheck` passes

**Files:** `package.json`, `tsconfig.json`, `hardhat.config.ts` (new), `contracts/` (new dir), `deploy/` (new dir)

---

## Phase 1: Smart Contracts — Registry

> Goal: On-chain skill registration. This is the foundation contract.

### Step 1.1 — `SkillRegistry.sol`

**Location:** `contracts/SkillRegistry.sol`

- **Struct:** `Skill` (id, name, version, owner, slug, description, isActive, createdAt, updatedAt)
- **Storage:** `mapping(bytes32 => Skill)` keyed by `keccak256(name, version, owner)`
- **Functions:**
  - `registerSkill(name, version, slug, description)` → emits `SkillRegistered(skillId, owner, name, version)`, returns `bytes32 skillId`
  - `updateSkill(skillId, slug, description)` → owner-only, emits `SkillUpdated(skillId)`
  - `deactivateSkill(skillId)` → owner-only, emits `SkillDeactivated(skillId)`
  - `getSkill(skillId)` → view, returns Skill struct
  - `isRegistered(skillId)` → view, returns bool
  - `getSkillsByOwner(owner)` → view (with enumeration via `owner → skillId[]` mapping)
- **Access:** `Ownable` for admin functions, skill-level ownership for updates
- **Guards:** `ReentrancyGuard`, input validation (name length, non-empty version)

### Step 1.2 — Hardhat tests

**Location:** `test/SkillRegistry.test.ts`

- Register a skill → verify event + returned skillId
- Duplicate registration → revert
- Update skill → owner succeeds, non-owner reverts
- Deactivate → verify isActive flag
- `getSkill` returns correct data
- `getSkillsByOwner` enumeration

---

## Phase 2: Smart Contracts — Monetization & Entitlement

> Goal: On-chain pricing, access control, and usage tracking. Depends on Phase 1 (references skillId).

### Step 2.1 — `SkillMonetization.sol`

**Location:** `contracts/SkillMonetization.sol`

- Links to SkillRegistry (constructor takes registry address, validates skill existence)
- **Struct:** `PricingConfig` (strategy enum [PayPerUse, Subscription, Tiered], amount, currency/token address, period for subscriptions, tierThresholds for tiered)
- **Storage:** `mapping(bytes32 => PricingConfig)` keyed by skillId
- **Functions:**
  - `setPricing(skillId, strategy, amount, token, period, tierThresholds)` → skill owner only, emits `PricingSet(skillId)`
  - `getPricing(skillId)` → view
  - `recordUsage(skillId, user)` → payable (for pay-per-use), emits `UsageRecorded(skillId, user, amount)`
  - `getRevenue(skillId)` → view, returns accumulated revenue
  - `withdrawRevenue(skillId)` → skill owner withdraws accumulated fees, emits `RevenueWithdrawn(skillId, amount)`
- **Guards:** `ReentrancyGuard` on payable functions, `Pausable` for emergency stops

### Step 2.2 — `SkillEntitlement.sol`

**Location:** `contracts/SkillEntitlement.sol`

- Links to SkillRegistry + SkillMonetization
- **Storage:** `mapping(bytes32 => mapping(address => Entitlement))` where `Entitlement` = (status enum, grantedAt, expiresAt, tier)
- **Functions:**
  - `checkAccess(skillId, account)` → view, returns bool (checks expiry, status)
  - `grantAccess(skillId, account, duration)` → called after payment validation, emits `AccessGranted`
  - `revokeAccess(skillId, account)` → skill owner only, emits `AccessRevoked`
  - `getEntitlement(skillId, account)` → view, returns full details
- **Auto-expiry:** `checkAccess` returns false if `block.timestamp > expiresAt`

### Step 2.3 — Hardhat tests

- `test/SkillMonetization.test.ts`: set/get/update pricing, pay-per-use payment flow, revenue tracking, withdrawal, non-owner reverts
- `test/SkillEntitlement.test.ts`: grant/check/revoke, expiry logic, payment-gated access, cross-contract integration with monetization

---

## Phase 3: Contract Deployment & Typechain

> Goal: Deployment scripts and auto-generated TypeScript bindings. Depends on Phase 1 + 2.

### Step 3.1 — Deployment scripts

- `deploy/001_deploy_registry.ts` — deploy SkillRegistry
- `deploy/002_deploy_monetization.ts` — deploy SkillMonetization with registry address
- `deploy/003_deploy_entitlement.ts` — deploy SkillEntitlement with registry + monetization addresses
- Network config for 0G testnet in `hardhat.config.ts`

### Step 3.2 — Generate typechain bindings

- `npx hardhat compile` → generates `typechain-types/` with ethers-v6 typed contracts
- Verify: `SkillRegistry`, `SkillMonetization`, `SkillEntitlement` factories are generated
- These become the source of truth for SDK contract interaction — no manual interface definitions needed

### Step 3.3 — Contract address management

- `src/contracts/addresses.ts` — exported constant map of known deployments per network (`chainId → addresses`)
- Placeholder values for testnet, updated after actual deployment

---

## Phase 4: SDK Core Infrastructure

> Goal: Unified config, error hierarchy, wallet abstraction, transport. All SDK modules depend on this. Can start parallel with Phase 1-3.

### Step 4.1 — Unified SDK configuration

**Location:** `src/config/index.ts`

- Single `SkillweaveConfig` type
- Fields: `rpcUrl`, `chainId`, `contracts` (registry, monetization, entitlement addresses — auto-resolved from `addresses.ts` if chainId is known), `storage` (indexerUrl, flowContractAddress), `signer` (ethers Signer or private key), `transport` (timeoutMs, retries, retryDelayMs), `environment` (development | staging | production)
- `validateConfig()` with clear error messages
- Config defaults per environment

### Step 4.2 — Error hierarchy

**Location:** `src/errors/index.ts`

- Base: `SkillweaveError` with `code` field
- Subclasses: `WalletError`, `NetworkError`, `ContractError` (tx hash, revert reason), `StorageError`, `ValidationError`, `EntitlementError`
- Error code enum: `SkillweaveErrorCode`

### Step 4.3 — Shared types

**Location:** `src/types/index.ts`

- `Address`, `TransactionResult`, `SkillMetadata`, `SkillId`, `PricingStrategy`, `PricingConfig`, `MemoryRecord`, `EntitlementStatus`
- Types should align with contract struct shapes from typechain

### Step 4.4 — Wallet adapter

**Location:** `src/client/wallet.ts` (new)

- `WalletAdapter` wrapping ethers `Signer`
- Accept: ethers `Signer`, `Wallet` (from private key), `JsonRpcSigner`
- Methods: `getAddress()`, `signMessage()`, `sendTransaction()`
- Factory: `createWallet(config)`

### Step 4.5 — Transport layer

**Location:** `src/transports/index.ts`

- `createProvider(config)` → ethers `JsonRpcProvider`
- Retry wrapper with exponential backoff
- Timeout enforcement

### Step 4.6 — Unit tests (vitest)

- Config validation, error classes, wallet adapter (mock signer), transport (mock provider)
- Files: `tests/unit/config.test.ts`, `tests/unit/errors.test.ts`, `tests/unit/wallet.test.ts`, `tests/unit/transports.test.ts`

---

## Phase 5: SDK Contract Layer

> Goal: Wire typechain-generated bindings into the SDK. Depends on Phase 3 (typechain) + Phase 4.

### Step 5.1 — Contract wrappers

**Location:** `src/contracts/index.ts`

- Import typechain factories: `SkillRegistry__factory`, `SkillMonetization__factory`, `SkillEntitlement__factory`
- `createRegistryContract(address, signer)` → typed contract instance
- `createMonetizationContract(address, signer)` → typed contract instance
- `createEntitlementContract(address, signer)` → typed contract instance
- Follow the same pattern as `0g-ts-sdk`'s `getFlowContract()` / `getMarketContract()` helpers

### Step 5.2 — Unit tests

- Factory returns correctly typed contracts
- Error wrapping when contract call fails
- File: `tests/unit/contracts.test.ts`

---

## Phase 6: SDK Modules (Registration, Monetization, Entitlement)

> Goal: Implement the three on-chain modules using real typechain contracts. Depends on Phase 5. These three can be built in parallel.

### Step 6.1 — Registration module

**Location:** `src/modules/registration/index.ts`

- `RegistrationModule` class (takes typed SkillRegistry contract)
- `registerSkill(input)`: validate → call `contract.registerSkill()` → wait for receipt → parse `SkillRegistered` event → return `RegistrationResult` (skillId, txHash, blockNumber)
- `getSkill(skillId)`, `updateSkill(skillId, updates)`, `isRegistered(skillId)`, `getSkillsByOwner(owner)`
- Input validation: name length, version format (semver)

### Step 6.2 — Monetization module

**Location:** `src/modules/monetization/index.ts`

- `MonetizationModule` class (takes typed SkillMonetization contract)
- `setPricing(skillId, config)`, `getPricing(skillId)`, `updatePricing()`, `recordUsage()`, `getRevenue()`, `withdrawRevenue(skillId)`

### Step 6.3 — Entitlement module

**Location:** `src/modules/entitlement/index.ts`

- `EntitlementModule` class (takes typed SkillEntitlement contract)
- `checkAccess(skillId, account)`, `grantAccess()`, `revokeAccess()`, `getEntitlementDetails()`

### Step 6.4 — Unit tests (vitest, mocked contracts)

- `tests/unit/registration.test.ts`, `tests/unit/monetization.test.ts`, `tests/unit/entitlement.test.ts`
- Each tests the module logic with mocked typechain contract instances

---

## Phase 7: SDK Storage Module

> Goal: 0G Storage memory persistence. Depends on Phase 4. Parallel with Phase 5-6 (independent of our contracts).

### Step 7.1 — Storage module

**Location:** `src/modules/storage-memory/index.ts`

- `StorageModule` class (receives `0g-ts-sdk` client config)
- `saveMemory(record)`: serialize → upload to 0G Storage via KvClient → return content hash + reference
- `getMemory(key, skillId)`: retrieve → deserialize → return
- `listMemory(skillId, options?)`: list records (filter by category)
- `deleteMemory(key, skillId)`: soft-delete via metadata flag
- Content hashing for integrity verification
- Memory categories: session, persistent, operational

### Step 7.2 — Storage client wrapper

**Location:** `src/modules/storage-memory/storage-client.ts` (new)

- Thin wrapper around `@0gfoundation/0g-ts-sdk` `KvClient` / `Indexer`
- Connection init, error mapping to `StorageError`
- Key → content hash index management

### Step 7.3 — Unit tests (mocked `0g-ts-sdk`)

- File: `tests/unit/storage.test.ts`

---

## Phase 8: Client Integration & Polish

> Goal: Wire everything into SkillweaveClient, update examples and docs. Depends on all prior phases.

### Step 8.1 — Rewrite `SkillweaveClient`

**Location:** `src/client/SkillweaveClient.ts`

- Accept `SkillweaveConfig`, validate on construction
- Initialize wallet, provider, contract instances, modules
- Expose: `client.registration.registerSkill()`, `client.monetization.setPricing()`, `client.entitlement.checkAccess()`, `client.storage.saveMemory()`, etc.
- Also expose top-level convenience methods: `client.registerSkill()`, etc.
- `client.destroy()` for cleanup

### Step 8.2 — Update barrel exports

**Location:** `src/index.ts`

- All types, classes, errors, modules exported
- Named exports only for tree-shaking

### Step 8.3 — Update example

**Location:** `examples/basic.ts`

- Full end-to-end: init → register → price → store → check access
- Commented steps

### Step 8.4 — Update docs

- `docs/architecture.md` — real architecture description including contract layer
- `docs/getting-started.md` — install, config, first skill registration
- `docs/api/README.md` — API overview

### Step 8.5 — Final unit tests

- `tests/unit/client.test.ts` — module wiring, config validation, method delegation

---

## Dependency Graph

```
Phase 0 (toolchain)
    ↓
Phase 1 (Registry contract) ──→ Phase 2 (Monetization + Entitlement contracts)
    ↓                                        ↓
Phase 3 (deploy scripts + typechain) ←───────┘
    ↓
Phase 4 (SDK core infra) ←── can start parallel with Phase 1-3
    ↓
Phase 5 (SDK contract layer) ←── needs Phase 3 + 4
    ↓
Phase 6 (SDK modules) ←── needs Phase 5       Phase 7 (storage) ←── needs Phase 4 only
    ↓                                              ↓
Phase 8 (client integration + polish) ←────────────┘
```

---

## Verification Checklist

1. `npx hardhat compile` — contracts compile cleanly
2. `npx hardhat test` — all contract tests pass
3. `npm run typecheck` — SDK type-checks with zero errors
4. `npm run build` — produces CJS + ESM bundles in `dist/`
5. `npm test` — all SDK unit tests pass (vitest)
6. `npx ts-node examples/basic.ts` — runs end-to-end with local Hardhat node
7. Manual review: SDK API matches `PROJECT_KNOWLEDGE.md` §6 spec
8. Gas report: `hardhat-gas-reporter` output shows no unexpected gas costs

---

## Scope Boundaries

**Included:**

- 3 Solidity contracts with Hardhat tests
- Deployment scripts for local + testnet
- Typechain-generated TypeScript bindings
- All 5 SDK modules from PROJECT_KNOWLEDGE §6
- Unified config, error handling, wallet adapter
- SDK unit tests (vitest)
- Basic docs and working example

**Excluded:**

- Mainnet deployment
- Contract auditing
- Contract upgradeability (proxy pattern — can add later)
- Integration / E2E tests
- CI/CD pipeline
- npm publishing config
- Analytics dashboards
- Multi-framework adapters
