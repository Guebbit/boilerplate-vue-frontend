---
source: src/modules/returns/tests/withdrawal-panel.spec.ts
sha256: ec71c66d16839725caf66ce621a2480bc996017b8fb22ce648bef4452baa62b7
generated_at: 2026-10-17T01:39:14.984633+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/tests/withdrawal-panel.spec.ts

## Purpose

Vitest spec for `WithdrawalPanel.vue`. Verifies the panel's three main responsibilities: rendering the withdrawal button only when the server permits it, requiring a confirmation dialog before calling the store, and reporting outcomes (success, refusal, or error). Also covers the embedded return-request form and the cancellation-of-unshipped flow.

## Key elements

- **`mountPanel(props, existing, options)`** – mounts `WithdrawalPanel` with `vuetify`, `i18n`, and a memory router; spies on `fetchOrderReturns`, `fetchReturnOptions`, and `openReturn` *before* mount so the component's destructured actions hit the mocks. Returns `{ wrapper, store }`.
- **`signInWith(tenant)`** – seeds the session store with a token, viewer identity, and an ability list so permission-gated UI can be exercised.
- **`NO_OPTIONS`** – baseline `ReturnOptions` fixture (empty `returnable`/`cancellable` arrays).
- **`describe('WithdrawalPanel')`** – top-level suite: renders nothing when hidden, shows button + deadline, confirmation accept/decline, server-error display, and listing an already-opened withdrawal.
- **`describe('returns form')`** – asserts `ReturnRequestForm` appears when `returnable` is non-empty, receives the server's lines as props, emits `opened` upward, and re-fetches options after a return is opened.
- **`describe('cancelling what has not shipped')`** – covers the cancellation path: buyer vs. staff-with-`Refund`-ability, server-level `cancel: false` hiding, and the no-permission case.

## Relationships

| Neighbor | Interaction |
|---|---|
| `WithdrawalPanel.vue` | Component under test; mounted directly. |
| `ReturnRequestForm.vue` | Queried via `wrapper.getComponent(ReturnRequestForm)` to assert props and to emit `opened` with the `emitOn` helper. |
| `store.ts` (`useReturnsStore`) | All actions (`fetchOrderReturns`, `fetchReturnOptions`, `openReturn`) are spied and their call arguments / rejection values asserted. |
| `tests/support/unit/wire-modules.ts` | `wireModulesIntoCore()` called at module top-level to register i18n/interceptors before any test runs. |
| `tests/support/unit/fixtures.ts` | `aReturn()` factory used for the "already opened" and `openReturn` success mocks. |
| `tests/support/unit/mounted-vm.ts` | `emitOn()` used to dispatch child-component events (`opened`) that are awkward to trigger via the DOM. |

## Notes

- Store spies must be attached **before** `mount()` because the component destructures action references in `setup`; spying after mount would leave the component holding the original (unmocked) functions.
- `wireModulesIntoCore()` is a one-time module-level side effect, not repeated in `beforeEach`.
- `VDialog` is stubbed to a plain slot-forwarding `<div>` so the confirm/cancel buttons are reachable without Vuetify's overlay machinery.
- The dialog store's `confirm` is spied per-test (not in `mountPanel`) so each test controls the accept/decline path explicitly.
- Permission tests rely on the `useSessionStore` ability list; the panel reads it internally, so there is no prop to toggle—it is purely store-driven.
