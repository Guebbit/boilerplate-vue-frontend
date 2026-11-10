---
source: src/modules/returns/tests/withdrawal-panel.spec.ts
sha256: 61e757d5ba76690fe12177fad3a9bbec2f622bf5685ef09a27efe076cff60be3
signature: 0bb14d7edbdcf007627d4b6e18e4a6974ee129e4b73a1c30d37698a558d2102d
generated_at: 2026-11-10T05:41:25.888394+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/tests/withdrawal-panel.spec.ts

## Purpose

Vitest unit spec for `WithdrawalPanel.vue`. Verifies the panel's conditional rendering (server-driven button visibility, blocked-reason messaging, deadline text), the confirmation-gated withdrawal call, error surfacing, staff permission gating for "Record a withdrawal," and the hand-off of returnable/reason data into the nested `ReturnRequestForm`. Store actions are spied here; HTTP transport is deliberately left to `store.spec.ts`.

## Key elements

- **`mountPanel(props, existing?, options?)`** – Mounts `WithdrawalPanel` with Pinia, Vuetify, i18n, and a memory router already wired. Spies `fetchOrderReturns`, `fetchReturnOptions`, and `openReturn` *before* mount (the component destructures actions in `setup`). Returns `{ wrapper, store }`.
- **`signInWith(abilities)`** – Populates the session store with a test token, viewer, and `[action, subject]` ability pairs so permission-gated UI can be asserted.
- **`NO_OPTIONS` / `FOR_BUYER` / `RETURNABLE`** – Inline `ReturnOptions` fixtures representing "nothing returnable," "staff can withdraw + return," and "items still returnable" respectively.
- **`router`** – `createMemoryHistory` router exposing `ReturnTarget` and `Contact` routes the panel links to.
- **`describe('WithdrawalPanel')`** – Main suite: empty-state, deadline rendering (date-only, no time), confirmation flow (confirm/decline), server-error blocking, three `withdrawBlocked` reasons via `it.each`, disabled-button no-op, and "already opened" withdrawal listing.
- **`describe('staff acting for the buyer')`** – Asserts `record-withdrawal-open` button and `ReturnRequestForm` visibility based on `update:Return` ability and `canWithdraw` prop.
- **`describe('returns form')`** – Asserts `ReturnRequestForm` receives correct `lines`, `reasons` (withdrawal excluded), and `exceptions` props, and that the panel renders nothing when no options exist.

## Relationships

- **`WithdrawalPanel.vue`** – The component under test; imported and mounted directly via `mount()`.
- **`ReturnRequestForm.vue`** – Imported and asserted against inside the mounted `WithdrawalPanel` tree; the spec checks the props the panel passes down (`staff`, `lines`, `reasons`, `exceptions`) by locating the rendered form element.
- **`store.ts` (`useReturnsStore`)** – Imported; its actions are spied on before mount so no real HTTP occurs.
- **`wire-modules.ts`** – `wireModulesIntoCore()` called once at module scope to register shared DI/i18n wiring before any test runs.
- **`fixtures.ts` (`aReturn`)** – Imported factory for a default `Return` object used in "already opened" assertions and as the mock resolution for `openReturn`.
- **`mounted-vm.ts` (`emitOn`)** – Imported for use in assertions on emitted events (file is truncated; the import is present at the top).

## Notes

- Spies are attached **before** `mount()` because `WithdrawalPanel` destructures store actions during `setup`; spying after mount would be too late.
- `VDialog` is stubbed to a bare `<div><slot /></div>` so the confirm dialog's slot content is accessible without Vuetify's overlay machinery.
- Element queries rely exclusively on `data-test` attributes, not on Vuetify class names or component structure.
- `wireModulesIntoCore()` is called at module top-level (once per test file), not in `beforeEach` — it mutates global module registries.
- The `beforeEach` block recreates Pinia and loads the `'en'` locale; each test gets a fresh store instance.
