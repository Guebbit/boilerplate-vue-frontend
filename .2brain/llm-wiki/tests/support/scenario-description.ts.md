---
source: tests/support/scenario-description.ts
sha256: af9e4635a21e23791997d9dd487313a66aed4747322297e9f19b4d4458850914
signature: b350005d468c0534cca4c041e8609fe925156145aa7c359faaa435b35a05413f
generated_at: 2026-11-10T07:38:58.920556+00:00
model: ollama:qwen3.8:27b
---

# tests/support/scenario-description.ts

## Purpose

Defines the shared TypeScript types that describe what a running backend reports about its seeded test state (accounts and row IDs per guarantee). The module is intentionally framework-free so that both the Cypress e2e suite and the Node-based Lighthouse runner consume the same shape without importing each other.

## Key elements

- **`ScenarioAccount`** (interface) — One seeded login: `email`, `password`, optional `backupCodes` (2FA persona), optional `totpSecret` (staff authenticator).
- **`ScenarioDescription`** (interface) — The full backend response: `scenario` (name or `null`), `accounts` (record of role → `ScenarioAccount`), `subjects` (record of guarantee name → row ID).
- **`E2ERole`** (type alias) — Union of 13 string literals covering four generic roles (`admin`, `user`, `editor`, `moderator`), five customer personas (`unverified`, `twoFactor`, `pendingEmail`, `banned`, `secondShopper`), and four staff roles (`manager`, `warehouse`, `support`, `operator`).

## Relationships

- **`tests/support/e2e/scenario.ts`** — Imports these types as the contract for the seeded-state object it fetches during a scenario run.
- **`scripts/lighthouse/collect.ts` / `scripts/lighthouse/run.ts`** — The Lighthouse runner reads `GET /__test/scenario` and casts the JSON body to `ScenarioDescription`.
- **`tests/support/lighthouse/case.ts`** — Likely types its Lighthouse case inputs against `E2ERole` / `ScenarioAccount`.
- **`tests/support/e2e/commands.ts`, `steps.ts`, `fixtures.ts`, `harness.ts`, `role-sweep.ts`, `a11y-sweep.ts`, `action-table.ts`, `visual-sweep.ts`** — E2E support files that reference `E2ERole` to select which seeded account to act as.
- **`tests/e2e/specs/journeys/op19-only-a-role-manager-hands-out-roles.cy.ts`** — Spec that exercises the `manager` role from the `E2ERole` union.

## Notes

- The `E2ERole` docblock states every compatible backend must seed **all thirteen** roles; there is no partial-seeding path.
- `backupCodes` is populated **only** for the `twoFactor` persona; `totpSecret` is populated **only** for staff accounts. Both are absent for a plain shopper.
- `operator` is a *platform* role with no shop membership — distinct from the three shop-level staff roles.
- The module is pure type declarations (no runtime code), so it adds zero bundle weight to either test runner.
