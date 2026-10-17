---
source: src/modules/payments/tests/payments-tables.spec.ts
sha256: f2b6924c98ec2d2de2683691b99dd399f2b7aaf4b67cc9f5f0d0176f49c65579
generated_at: 2026-10-17T01:25:26.915812+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/payments-tables.spec.ts

## Purpose

Integration-level unit tests for the three tab bodies of the staff payments page (`PaymentsTable`, `RefundsTable`, `AttentionList`). The store's read methods are stubbed, so each test verifies what query the component sends and how it renders the response — without hitting the network.

## Key elements

- **`answerPaymentsWith(items)`** — Spies on `store.fetchPaymentsPage`, sets `paymentsPage`/`paymentsTotal`, resolves the given array. Returns the spy for assertion.
- **`answerRefundsWith(items)`** — Same pattern for `store.fetchRefundsPage` and `refundsPage`/`refundsTotal`.
- **`answerAttentionWith(items)`** — Same pattern for `store.fetchAttention` and `attention`.
- **`GLOBAL`** — Shared `mount` options: router, Vuetify, i18n plugins.
- **`router`** — Memory-history router built from the real module route tree (`collectModuleRoutes(enabledModules)`) so order links resolve to `/orders/:id`.
- **`beforeEach`** — Resets Pinia, pushes to `/en/sales/payments`, loads the `en` locale.
- **`describe('PaymentsTable')`** — Covers column rendering (date, amount, status, method, provider, order link, customer, refunded), default page-size query, full filter submission (dates as instants, amounts as numbers), invalid-amount dropping, Reset button, header-sort → page reset, non-sortable columns, row-click → `select` emit, empty state, and error toast.
- **`describe('RefundsTable')`** — Covers refund row rendering (amount, status, humanised failure reason, provider ref, order link), dash for missing fields, filter submission, and empty state.
- **`describe('AttentionList')`** — (truncated in source) tests the attention tab's rendering and read.

## Relationships

- **`../components/PaymentsTable.vue`**, **`../components/RefundsTable.vue`**, **`../components/AttentionList.vue`** — The components mounted and asserted against in every test.
- **`../store.ts`** (`usePaymentsStore`) — Its read methods are spied on and mocked; its reactive state (`paymentsPage`, `refundsPage`, `attention`, etc.) is set directly inside the mocks.
- **`tests/support/unit/fixtures.ts`** — Supplies the `aPayment()` factory used to build realistic payment objects.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module scope so the module registry (routes, components) is populated before the router is created.

## Notes

- `wireModulesIntoCore()` runs once at import time, not inside `beforeEach` — it mutates shared kernel state. Tests rely on it having already executed.
- The `beforeEach` pushes a router path *before* mounting; components that call `router.resolve` for order links depend on this.
- Date filters are asserted as exact `Date` instants (local-time construction with `new Date(2026, 2, 1)`), not ISO strings — a mismatch between UTC and local expectations here will cause silent test failures.
- The "drops invalid amount" test asserts `amountMin` is `undefined` (not `NaN`) in the query object, guarding against a regression where `parseFloat` output is passed straight through.
- Row selection is verified via the `select` emit, not via a route navigation, so the test does not assert the detail page actually loads.
