---
source: src/modules/payments/tests/payment-drawer.spec.ts
sha256: f1ed1ae6b8b5e866841810cf94767faea2acf02377bad8260a9cdc74a7f5235e
signature: 56688ea2b9801340758f502c4110563f119840e3b90b680868006fe2747f3a36
generated_at: 2026-11-10T05:14:50.926706+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/payment-drawer.spec.ts

## Purpose

Vitest spec for `PaymentDrawer.vue` that verifies the information a table row cannot display (provider reference, card last-4, per-refund detail, dispute banners) and the actions the server authorises (issue refund, settle a hand-paid refund, cancel refund). It also locks down the component's open/close and event-emission contract after each action.

## Key elements

- **`mountDrawer(payment)`** – shared helper that mounts `PaymentDrawer` with `modelValue: true`, the real router, Vuetify, i18n, and a `VNavigationDrawer` stub (the test never renders a `v-layout`).
- **`router`** – built with `collectModuleRoutes(enabledModules)` over a memory history so the "open order" link resolves to a real path.
- **`FULL`** – a fully-populated `Payment` (provider ref, card, one failed refund, `actions.refund: true`) used by most display and action specs.
- **`SETTLED_REFUND`** – a canonical `Refund` record injected into store-mock return values.
- **`OWED`** – a `Payment` with `provider: 'manual'` and `actions.settleByHand` naming one refund, used by the "hand-paid" describe block.
- **Display specs** – assert provider-ref line, masked card, refund list with provider refund ref and failure reason, "no refunds" empty state, dispute banner presence/absence, and order-link `href`.
- **Refund-flow specs** – cover: confirmation gate, success (event + close), provider decline (stays open, event fires), double-click guard (single call), 403 from server (error text, no events, stays open), and declined confirmation (no-op).
- **Hand-paid specs** – "Mark returned" button appears only for refunds named in `actions.settleByHand`; on confirm it calls `settleRefundByHand` and emits `changed`.
- **`wireModulesIntoCore()`** – called at module scope (outside `beforeEach`) so route collection and store wiring happen once.

## Relationships

- **`src/modules/payments/components/PaymentDrawer.vue`** – the component under test; mounted and driven via `mountDrawer`.
- **`src/modules/payments/store.ts`** – `usePaymentsStore` is spied on for `refundPayment` and `settleRefundByHand`; their return/reject values shape the assertions.
- **`tests/support/unit/fixtures.ts`** – supplies `aPayment` (payment factory) and `aProblem` (error-object factory) used throughout the spec.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` registers module stores and routes so the component's internals (router links, i18n keys) resolve without a full app shell.

## Notes

- The router is **real**, not mocked; tests depend on `collectModuleRoutes` producing a resolvable `/en/sales/payments` path and an `/orders/:id/edit` child. If route shape changes, the "links to the order page" spec breaks.
- `VNavigationDrawer` is stubbed with a bare `<aside><slot/></aside>`; any test that needs real layout behaviour must add its own stub or a full `v-layout` wrapper.
- The double-click guard test fires both clicks via `Promise.all` before either microtask resolves, so it relies on the component's in-flight lock rather than on async timing.
- "Provider declined" (HTTP 200, refund `status: 'failed'`) and "server 403" (rejected promise) are distinct paths: the former emits `changed`, the latter does not. Do not conflate them when updating the component.
- `wireModulesIntoCore()` runs at import time; if another spec in the same worker imports this file, the wiring is idempotent (assumed). A failing re-import will surface as a duplicate-route or duplicate-store error, not a silent no-op.
