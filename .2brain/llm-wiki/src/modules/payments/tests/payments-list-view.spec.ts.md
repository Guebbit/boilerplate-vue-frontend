---
source: src/modules/payments/tests/payments-list-view.spec.ts
sha256: 4aa984b5d3567c4f67322c32ba1731f12d02533507b730bd02c97c02050bda12
generated_at: 2026-10-17T01:25:14.521243+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/payments-list-view.spec.ts

## Purpose

Unit spec for the staff payments page (`PaymentsList.vue`). It verifies which tabs appear based on module slot contributions, how the active tab is read from and written to the URL, that a row selection opens the drawer with the correct payment, and that the order-reference lookup is gated by ability and navigates to the order edit page. Tab *bodies* are stubbed to markers; their logic lives in separate specs.

## Key elements

- **`mountAt(url, slots?)`** — pushes the URL on the real router, mounts `PaymentsList` with Vuetify, i18n, Pinia, the provided slots, and the `STUBS` table, then flushes promises. All tests go through this helper.
- **`STUBS`** — replaces `PaymentsTable`, `RefundsTable`, `AttentionList`, `PaymentDrawer`, and `OrderReferenceSearch` with single-`<div>` markers (or a `PaymentDrawer` that exposes `data-open` / `data-id` attributes) so the spec can assert on the page shell without rendering real tables.
- **`AwaitingStub`** — a minimal component representing what the orders module injects into the `payments-awaiting-transfer` slot.
- **`router`** — a `createMemoryHistory` router wired with the *real* module route tree (`collectModuleRoutes(enabledModules)`), so URL-driven tab selection and the order-edit navigation are tested against actual routes.
- **`describe('…the tabs')`** — six tests covering: four tabs present when the slot is filled; three tabs when it isn't; default to "All"; `?tab=awaiting` lands on the awaiting tab; unknown tab falls back to All; clicking a tab writes the query param (and "All" clears it).
- **`describe('…the drawer and the reference lookup')`** — three tests covering: row `select` event opens the drawer with the right payment id; `OrderReferenceSearch` is hidden without `create Payment` ability and visible with it; a `found` event navigates to `/en/orders/:id/edit`.

## Relationships

- **`src/modules/payments/views/PaymentsList.vue`** — the component under test; mounted directly (not through a parent route) with its child components stubbed.
- **`tests/support/unit/fixtures.ts`** — supplies `aPayment` and `anOrder` factory helpers used to craft the event payloads passed via `emitOn`.
- **`tests/support/unit/mounted-vm.ts`** — supplies `emitOn`, which finds a stubbed child component and emits an event on it to simulate row-selection or lookup-found flows.
- **`tests/support/unit/wire-modules.ts`** — supplies `wireModulesIntoCore`, called once at module scope to register module-level providers and routes so the real router tree is available.

## Notes

- `wireModulesIntoCore()` runs at **module load time** (top-level), not inside `beforeEach`; mutating it per-test would require a fresh module registry.
- The "All" tab is the *default* and also the *clearing* action: clicking it removes `?tab` from the query entirely (asserted as `toBeUndefined()`), rather than setting it to `"all"`.
- Ability gating is tested by directly mutating the Pinia session store (`session.setAbilities(…)`) between two `mountAt` calls in the same test — no separate store reset is needed because `beforeEach` recreates Pinia.
- The drawer assertion reads `data-open` / `data-id` from the stub's template rather than inspecting the real `PaymentDrawer` component, keeping the spec focused on the page-level wiring.
