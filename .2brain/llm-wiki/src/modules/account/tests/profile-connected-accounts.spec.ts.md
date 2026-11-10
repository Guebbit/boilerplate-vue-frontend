---
source: src/modules/account/tests/profile-connected-accounts.spec.ts
sha256: 01d8040f2d7bf7cc886d892cf07032b93ff3b2931b2277bfdbcee5408a3fdf52
signature: afa10e3eb51d49bd6be15e7b1f37d176e39c1ea1e5f2b6d783a640f2241a02bf
generated_at: 2026-11-10T03:39:09.474956+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile-connected-accounts.spec.ts

## Purpose

Vitest unit tests for the `ProfileConnectedAccounts.vue` panel. Verifies that linked providers render with correct labels, the empty state appears when none are connected, removal requires a confirmation dialog before calling the store, the connect flow filters already-linked providers and navigates to the server-issued consent URL, and error/refusal responses are surfaced in-place.

## Key elements

- **`mountPanel`** — helper that mounts the component with Pinia, Vuetify, and i18n plugins.
- **`unlinkProvider` / `startLink`** — `vi.fn()` spies standing in for the store's removal and connect actions.
- **`links` / `offered`** — mutable arrays backing the mocked store state; reassigned in `beforeEach` and individual tests.
- **`vi.mock('../stores/oauth-links.ts', …)`** — replaces the store with a plain object exposing `links`, `fetchLinks`, `unlinkProvider`, and `startProviderLink`.
- **`vi.mock('../stores/oauth-providers.ts', …)`** — replaces `useAccountOAuthProvidersStore` to return `{ providers: offered, fetchProviders }`.
- **`vi.mock('pinia', …)`** — overrides `storeToRefs` with an identity function (the mocked stores are plain objects, not real Pinia stores).
- **`wireModulesIntoCore()`** — called once at module scope before any test runs.
- **`describe('ProfileConnectedAccounts')`** — rendering, empty state, confirmation-declined, confirmation-accepted, and double-click idempotency tests.
- **`describe('ProfileConnectedAccounts — connecting a provider')`** — provider filtering, consent-URL navigation (stubs `location`), and server-refusal error display.

## Relationships

- **`src/modules/account/components/ProfileConnectedAccounts.vue`** — the component under test; imported and mounted directly.
- **`tests/support/unit/wire-modules.ts`** — provides `wireModulesIntoCore()`, called at module top-level to register shared test infrastructure before the component's own module-resolution mocks take effect.

## Notes

- The Pinia `storeToRefs` mock is an **identity** function because the stores are plain objects, not real Pinia stores. Adding a real Pinia store to this file without adjusting that mock will break `storeToRefs` calls inside the component.
- `wireModulesIntoCore()` runs at **module scope**, not inside a test or `beforeEach`. This is a project convention for unit tests that import component modules with mocked dependencies.
- The "double-click" test asserts `confirm` and `unlinkProvider` are each called exactly once, guarding against a race where two rapid clicks both fire the store action.
- Tests that stub `location` (`vi.stubGlobal`) must call `vi.unstubAllGlobals()` in the same test body; the global is not restored by `vi.clearAllMocks()` in `beforeEach`.
