---
source: src/modules/delivery/tests/hold-dialog.spec.ts
sha256: 6913610da2d775162dc78e66b61eb668f0504966df128a7aed271a3574170e94
generated_at: 2026-10-17T00:48:57.043850+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/tests/hold-dialog.spec.ts

## Purpose

Unit tests for the staff "hold a fulfillment order" dialog. Verifies that a reason is mandatory before submission, that the reason list excludes `awaiting_stock`, that the optional note is trimmed before dispatch, and that a rejected `hold` call keeps the user in the dialog with an inline error.

## Key elements

- **`openDialog()`** (local helper) — Mounts `HoldDialog` with an inline `VDialog` stub, spies on `useDeliveryStore().hold`, then flips `modelValue` to `true`. Returns a Promise resolving to `{ wrapper, hold }` once the open transition has rendered.
- **`beforeEach`** — Installs a fresh Pinia instance and loads the `en` locale via `loadLocale`.
- **`describe('HoldDialog')`** — Four `it` blocks:
  - *cannot be sent until a reason is chosen* — asserts the submit button is `disabled` and `hold` is never called on a bare form submit.
  - *offers the three staff reasons and never awaiting_stock* — reads `VSelect` `items` prop and expects exactly `['incorrect_address','high_risk','other']`.
  - *sends the reason and a trimmed note, then closes and tells the page* — happy-path: `hold` called with `{ reason, note: 'check card' }`, `'held'` emitted, `update:modelValue` → `[[false]]`.
  - *leaves the note out when it is empty, and shows a refusal in place* — `hold` rejects; error text contains the rejection message; no `'held'` emission.

## Relationships

- **`HoldDialog.vue`** — the component under test; imported directly and mounted with Vue Test Utils.
- **`store.ts`** — `useDeliveryStore` is imported to spy on its `hold` action; the spy is created inside `openDialog` so each test gets a fresh mock.
- **`fixtures.ts`** — supplies `aFulfillmentOrder()`, the canonical order object used as the `fulfillmentOrder` prop and as the spy's resolved value.
- **`mounted-vm.ts`** — provides `emitOn` (dispatch a Vue event on a component) and `nextRenderTick` (wait one render cycle) used to drive the dialog interactively.
- **`wire-modules.ts`** — `wireModulesIntoCore()` is called once at module top-level to register module-level dependencies (i18n, router, etc.) before any test runs.

## Notes

- `VDialog` is stubbed **inline** in the `mount` call (`{ template: '<div><slot /></div>' }`) rather than via a global test-utils stub, so the real slot content is rendered without Vuetify's overlay machinery.
- All async test bodies use `.then()` promise chains rather than `async/await`; `openDialog` itself returns a Promise, so tests always start after the open transition.
- The `hold` spy is **not** set up in `beforeEach`; it lives inside `openDialog` so its mock is scoped per test and can be re-mocked (e.g., `hold.mockRejectedValue` in the refusal test) without leaking.
