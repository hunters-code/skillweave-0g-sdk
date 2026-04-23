# PluginWeave 0G SDK — Development Plan

## TL;DR

Build contracts and SDK as plugin-first architecture for OpenClaw plugins. Contracts define the on-chain source of truth, and the SDK wraps those contracts plus 0G Storage integration.

## Phase 0: Foundation

- Finalize package scripts for compile, build, typecheck, and tests
- Keep ethers v6 + hardhat + typechain + vitest pipeline stable
- Verify both contract and SDK build pipelines

## Phase 1: Plugin Registry Contract

### Step 1.1 — `PluginRegistry.sol`

**Location:** `contracts/PluginRegistry.sol`

- Struct: `Plugin`
- Storage: `mapping(bytes32 => Plugin)` keyed by `keccak256(name, version, owner)`
- Functions:
  - `registerPlugin(name, version, slug, description)` returns `pluginId`
  - `updatePlugin(pluginId, slug, description)`
  - `deactivatePlugin(pluginId)`
  - `getPlugin(pluginId)`
  - `isRegistered(pluginId)`
  - `getPluginsByOwner(owner)`

### Step 1.2 — Contract Tests

**Location:** `tests/contracts/PluginRegistry.test.ts`

- Registration success and duplicate protection
- Update/deactivate authorization checks
- Query methods for plugin records and owner enumeration

## Phase 2: Monetization + Entitlement Contracts

- Pricing configuration per `pluginId`
- Usage recording and revenue withdrawal
- Entitlement grant/revoke/check for plugin access

## Phase 3: Deployment + Typechain

- Deploy registry and dependent monetization/entitlement contracts
- Generate typechain bindings
- Export network-specific contract addresses

## Phase 4: SDK Core

- Unified config object
- Normalized error hierarchy
- Wallet adapter and provider transport utilities

## Phase 5: SDK Contract Layer

- Wrap generated contract factories for registry, monetization, entitlement
- Surface typed plugin-first contract helpers

## Phase 6: SDK Modules

### Registration Module
- `registerPlugin`
- `getPlugin`
- `updatePlugin`
- `getPluginsByOwner`

### Monetization Module
- `setPricing`
- `getPricing`
- `recordUsage`
- `withdrawRevenue`

### Entitlement Module
- `checkAccess`
- `grantAccess`
- `revokeAccess`

## Phase 7: Storage Module

- `savePluginState`
- `getPluginState`
- `listPluginState`
- `deletePluginState` (soft delete)

## Phase 8: Client Integration + Docs

- Expose plugin-first API from `SkillweaveClient`
- Update examples to `publishPlugin` flow
- Keep docs aligned with OpenClaw plugin terminology

## Verification Checklist

1. `npm run compile`
2. `npm run test:contracts`
3. `npm run typecheck`
4. `npm run build`
5. `npm test`
