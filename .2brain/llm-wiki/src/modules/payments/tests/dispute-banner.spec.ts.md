---
source: src/modules/payments/tests/dispute-banner.spec.ts
sha256: ea5901851fbcb44b249c0ac61d859e88b095fedecbe9bdf306b8a32df0b82d5b
signature: be5513f4d91f338f8ec4a8e7adc7089d3aab74b801f50f28dd0180ecd630a4d6
generated_at: 2026-11-10T05:13:35.910414+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/dispute-banner.spec.ts

## Purpose

Vitest spec that verifies the staff-facing dispute display: `DisputeBanner` (the alert shown above an order) and `OrderDisputes` (the order-scoped wrapper). It locks in the rendered copy, the deadline countdown logic, the refund-pause indicator, the dashboard-link security guard, and the per-order filtering that `OrderDisputes` applies.

## Key elements

- **`aDispute(overrides?)`** — local factory returning a fully-populated `Dispute` (chargeback, `needs_response`, EUR 40.00, `fundsWithdrawn: true`) with shallow-merge overrides.
- **`mountBanner(disputes)`** — mounts `DisputeBanner` with Vuetify + i18n plugins and the given `disputes` prop.
- **`describe('DisputeBanner')`** — six tests:
  - Empty array → no `[data-test="dispute-banner"]` element.
  - Kind, status, amount, and reason text appear in the rendered alert.
  - `evidenceDueBy` in the future → "N days left"; in the past → "deadline passed N days ago".
  - Refunds-paused badge shown only for an open chargeback with funds withdrawn; absent for an inquiry or a decided dispute.
  - `under_review` status suppresses the deadline element even if `evidenceDueBy` is set.
  - `dashboardUrl` is linked only when it is `https://…` (with `rel="noopener noreferrer"`); `javascript:` URLs produce no link.
- **`describe('OrderDisputes')`** — one test confirming that only disputes belonging to the given `orderId` are rendered (seeds the Pinia store via `usePaymentsStore`).
- **`beforeEach`** — resets Pinia and loads the `en` locale.

## Relationships

- **`src/modules/payments/components/DisputeBanner.vue`** — the primary component under test; mounted directly and asserted on via `data-test` attributes.
- **`src/modules/payments/components/OrderDisputes.vue`** — second component under test; verifies it filters disputes by `orderId` before delegating to `DisputeBanner`.
- **`src/modules/payments/store.ts`** — exports `usePaymentsStore`, which the `OrderDisputes` test imports and calls to seed a payment (with its disputes) before mounting the component.
- **`tests/support/unit/fixtures.ts`** — supplies `aPayment`, used to construct the payment object stored in Pinia.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called once at module scope to register stub modules so the component graph resolves under Vitest.

## Notes

- Deadline tests use `Date.now() ± 2 days − 1 hour` rather than exact boundary values, keeping them stable across time-zone edges while still asserting the "2 days" copy.
- The dashboard-link test is a security guard: any non-`https` scheme (e.g. `javascript:`) must not produce an anchor. The expected `rel` attribute is part of the contract.
- The `OrderDisputes` test relies on the Pinia store holding a single payment; it does not mock the network or the dispute-list endpoint.
- `wireModulesIntoCore()` is called at the top of the file (outside `describe`), not in `beforeEach` — it is idempotent and only needs to run once per worker.
