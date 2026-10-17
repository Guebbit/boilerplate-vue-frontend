---
source: src/modules/payments/tests/payment-drawer.spec.ts
sha256: 152780f0ed5ad354d410fbd238c9b911e6b481a0a68466ac89cf3e1692e3d16c
generated_at: 2026-10-17T01:24:48.414168+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/payment-drawer.spec.ts

## Purpose

Vitest spec for the `PaymentDrawer` component. Verifies that the drawer correctly renders payment details a table row cannot (provider reference, masked card, refund list with failure reasons), that the refund action appears only when the server advertises it, and that the full refund flow (confirm → store call → emit `changed` → close) and its error paths behave as expected.

## Key elements

- **`FULL`** — A fully-populated `Payment` fixture (provider ref, card last-4, one failed refund, `actions.refund: true`) used as the primary test input.
- **`router`** — A `createMemoryHistory` router wired with real module routes (`collectModuleRoutes(enabledModules)`), so the order link inside the drawer resolves to a concrete path.
- **`mountDrawer(payment)`** — Helper that mounts `PaymentDrawer` with `modelValue: true`, injects `router`/`vuetify`/`i18n`, and stubs `VNavigationDrawer` (the component expects a `v-layout` ancestor the test does not render).
- **`wireModulesIntoCore()`** — Called once at module scope to register enabled modules into the kernel registry before the router is built.
- **`describe('PaymentDrawer', …)`** — Eight `it` blocks covering: full-detail rendering, absent provider ref, no-refunds state, order link, conditional refund button, successful refund (emit `changed` + close), declined confirmation (no-op), rejected refund (error shown, drawer stays open), close button, and empty state (no payment).

## Relationships

- **`src/modules/payments/components/PaymentDrawer.vue`** — The component under test; every assertion targets its rendered DOM or emitted events.
- **`src/modules/payments/store.ts`** — `usePaymentsStore().refundForOrder` is spied on to verify it is (or isn't) called with the order id and to control success/failure outcomes.
- **`tests/support/unit/fixtures.ts`** — Provides the `aPayment()` factory used to build the `FULL` fixture and the minimal-payment variants.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is invoked at import time so `collectModuleRoutes` and the store can resolve module registrations.

## Notes

- `wireModulesIntoCore()` runs **once** at module scope, not in `beforeEach`; it is a one-time registry bootstrap, not per-test state.
- The `VNavigationDrawer` stub is necessary because `PaymentDrawer` is expected to live inside a Vuetify layout; the test intentionally does not render that layout.
- The router is pushed to `/en/sales/payments` in `beforeEach` so relative/absolute route links inside the drawer resolve; forgetting this would make the order-link assertion fail.
- The dialog store (`useDialogStore().confirm`) is spied per-test rather than mocked globally, keeping the "declined" and "confirmed" branches isolated.
