---
tags:
  - 2repo
  - 2repo/module
  - project/boilerplate-vue-frontend
type: module
module: src/modules/payments/
files: 8
updated: 2026-08-30T17:11:13.137130+00:00
---

# src/modules/payments/

## Purpose

The payments module owns the card-payment and refund interaction for a single order. It is not a standalone page; the orders module mounts it. All PSP-specific logic (the intent → confirm sequence, the "404 means no payment yet" rule) is concentrated in an internal Pinia store, while the public surface is limited to one component and one composable so callers cannot bypass the order-scoped flow.

## Key parts

- **`store.ts`** – Pinia store that mirrors the API's payment record and enforces the two PSP rules (intent → confirm, 404-as-absent). Everything else in the module reads through this store.
- **`components/PaymentPanel.vue`** – The only UI entry point. Renders either the card form (while payable) or a status summary; delegates all state transitions to the store and notifies the parent on success.
- **`composables/use-order-refund.ts`** – Thin composable exposing refund eligibility + action from the store, reactive to a route-driven order ID. Lets views bind a refund control without importing the store directly.
- **`response-schemas.ts`** – Registers Zod-style schemas (method + URL pattern) for the four payments endpoints so the shared HTTP layer can validate responses at runtime.
- **`module.ts` / `index.ts`** – Module manifest (registers schemas and locale loaders with the app registry; declares no routes) and the public barrel that re-exports only `PaymentPanel` and `useOrderRefund`.
- **`tests/`** – Unit suites for the store (pins the PSP call sequence and the 404-vs-error asymmetry) and for the refund composable (verifies availability is driven entirely by the server's `actions.refund` field).

## How it connects

The sole dependency is **`src/infrastructure/`**, which provides the shared HTTP transport (the `orvalMutator` the store calls through) and the app-registry mechanism that `module.ts` plugs into for schema and locale registration. The response-schema entries declared in `response-schemas.ts` are consumed by that same infrastructure HTTP layer to perform runtime validation before the store ever sees a payload. No other module imports the payments store directly; only the two public exports cross the boundary.

## Where to start

1. **`store.ts`** – Reading this first reveals the full payment lifecycle (intent → confirm, the 404 convention) and the state shape the component and composable rely on.
2. **`index.ts`** – A quick read confirms exactly what the rest of the app is allowed to use, which clarifies the module's intentional encapsulation.

## Connected modules
```mermaid
flowchart LR
    m_src_modules_payments["src/modules/payments/"]
    m_src_infrastructure["src/infrastructure/<br/>27 files"]
    m_src_modules_payments --- m_src_infrastructure
    style m_src_modules_payments stroke-width:3px
```

[[boilerplate-vue-frontend_src_infrastructure|src/infrastructure/]]

## Files
- `src/modules/payments/components/PaymentPanel.vue` — Order-page panel that renders either a card-payment form (while the order is still payable) or a payment status summary. It owns no payment logic itself; the intent/confirm sequence is delegated to the payments store, and the component's only job is to present the form or the result and notify the parent on success.
- `src/modules/payments/composables/use-order-refund.ts` — Vue composable that exposes a single order's refund capability (eligibility check + action) from the payments store, reactive to a route-driven order ID. It exists so views can bind a refund control without importing the store directly.
- `src/modules/payments/index.ts` — Public barrel (entry point) for the payments module. It deliberately exposes only the `PaymentPanel` component and the `useOrderRefund` composable, keeping the payments store internal to the module so that external callers cannot bypass the order-scoped payment flow.
- `src/modules/payments/module.ts` — Declares the payments module manifest for the app registry. It registers the response schemas and locale loaders needed to wire the `PaymentPanel` into the application. The module intentionally owns no routes — paying is a sub-interaction on an order, mounted by the orders module, not a standalone page.
- `src/modules/payments/response-schemas.ts` — Declares the response-envelope schema registrations for all four payments endpoints consumed by the module. Each entry pairs an HTTP method with a URL regex pattern and a Zod-style schema, so the shared HTTP layer can validate responses at runtime.
- `src/modules/payments/store.ts` — Pinia store that owns the payments module's client-side state. It mirrors the API's payment record for the current order and concentrates the two PSP-specific rules — the intent → confirm sequence and "404 means no payment yet" — in one place so callers never reason about them directly.
- `src/modules/payments/tests/store.spec.ts` — Unit test for the payments Pinia store with the HTTP transport (`orvalMutator`) replaced by a string-keyed router. It pins two invariants: the PSP call sequence (intent → confirm with card) and the asymmetry between a 404 ("no payment yet", resolves to `undefined`) and any other failure (must reject and reach the caller).
- `src/modules/payments/tests/use-order-refund.spec.ts` — Vitest suite for the `useOrderRefund` composable. It verifies that the refund button's availability is driven entirely by the server's `actions.refund` field on the payment record — the composable decides nothing on its own — and that edge cases (no payment, missing order id) leave the control disabled rather than issuing a broken request.

---
[[boilerplate-vue-frontend_INDEX|← boilerplate-vue-frontend index]]
