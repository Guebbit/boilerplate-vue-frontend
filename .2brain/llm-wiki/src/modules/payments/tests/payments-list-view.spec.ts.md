---
source: src/modules/payments/tests/payments-list-view.spec.ts
sha256: e4a06ef19c6878e78b3c11b9833d09f8e9b5add13b7ec6fbe8374cd89d9ade37
signature: f87c447d55b3ea89885dade1f5f8f1cddc5ba668292f7627c64554b90d1eb3d7
generated_at: 2026-11-10T05:15:44.387592+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/payments-list-view.spec.ts

## Purpose

Integration-level spec for the `PaymentsList` page shell. It verifies tab wiring (which tabs exist, how the URL `?tab=` param drives and reflects the active tab, and how unknown values fall back), the row-to-drawer handoff, and the permission-gated `OrderReferenceSearch` flow. The tab bodies and the drawer itself are stubbed to marker divs; their internal behaviour is covered by their own specs.

## Key elements

- **`STUBS`** – Map of child components replaced by minimal template markers (`data-test` divs). `PaymentDrawer` is the one stub that exposes props (`modelValue`, `payment`) so tests can assert open state and selected ID via data attributes.
- **`router`** – A real Vue Router with `createMemoryHistory` and the production route tree (`collectModuleRoutes(enabledModules)`), giving the spec a genuine navigation context.
- **`mountAt(url)`** – Helper that pushes the URL on the shared router, mounts `PaymentsList` with the `STUBS` + plugins (router, vuetify, i18n), and flushes promises before returning the wrapper.
- **`describe('PaymentsList — the tabs')`** – Five tests covering: tab count/labels, default "All" tab, URL-param-driven tab, unknown-param fallback, and bidirectional URL writing (selecting "All" clears the `tab` query param).
- **`describe('PaymentsList — the drawer and the reference lookup')`** – Four tests covering: drawer opens with the correct payment ID when a row is selected (from both the All and Awaiting tabs), `OrderReferenceSearch` renders only when the session grants `create` on `Payment`, and emitting `found` navigates to `/en/orders/:id/edit`.

## Relationships

- **`src/modules/payments/views/PaymentsList.vue`** – The component under test; mounted directly.
- **`tests/support/unit/fixtures.ts`** – Supplies the `aPayment` factory used to fabricate a payment object passed through the `select` event.
- **`tests/support/unit/mounted-vm.ts`** – Supplies `emitOn`, a helper that triggers an event on a child component found by name within the wrapper.
- **`tests/support/unit/wire-modules.ts`** – Supplies `wireModulesIntoCore`, called once at module scope to register module-level dependencies (stores, services) before any test runs.

## Notes

- The file explicitly stubs all table bodies and the drawer; do not expect assertions on their internal rendering here. Their specs live elsewhere.
- The "All" tab is the *default* and the *absence* of a `tab` query param — clicking it removes the param rather than setting `?tab=all`.
- `OrderReferenceSearch` visibility is gated on the Pinia session store's `abilities`, not on the viewer role alone. Tests set both `session.viewer` and `session.setAbilities` before asserting presence.
- The spec uses `vi.waitFor` (not a bare `expect` after `flushPromises`) for the navigation assertion in the "found" test, implying the route push is async and not synchronously flushed by the standard promise flush.
