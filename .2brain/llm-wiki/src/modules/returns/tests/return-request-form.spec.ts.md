---
source: src/modules/returns/tests/return-request-form.spec.ts
sha256: 89405d8488d4288d6ddc5ee798f6180b30a6e391d117e60669f5cf607f1d0846
signature: 685f1a6d4ef46cc1889388d3a806752e09283660578280a9327ca840a9e9166d
generated_at: 2026-11-10T05:39:55.214067+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/tests/return-request-form.spec.ts

## Purpose

Vitest spec for the `ReturnRequestForm.vue` component. It verifies the form's conditional visibility (button → panel), line and reason selection, quantity validation, remedy selection logic, note handling, staff-mode fields, error display, and cancellation. The store's `openReturn` action is spied; actual transport is left to `store.spec.ts`.

## Key elements

- **`mountForm(lines, reasons, extra?)`** – Mounts the component with `store.openReturn` spied *before* mount (the component destructures actions in `setup`). Returns `{ wrapper, store }`.
- **`openForm(wrapper)`** – Clicks `[data-test=return-request-open]` to reveal the panel.
- **`pick(wrapper, productId)`** – Ticks a line's checkbox via its `data-test` attribute.
- **`chooseReason(wrapper, reason)`** – Sets the `VSelect` model value through the `emitOn` helper.
- **`LINES`** – Two sample returnable lines (Shirt ×2, Mug ×1) used as the default prop.
- **`ALL_REASONS`** – The four `ReturnReason` values available within the withdrawal window.
- **`describe('ReturnRequestForm')`** – Main suite: visibility, line/reason rendering, made-to-order locking, quantity ceiling, validation errors, partial-return payload, remedy visibility/persistence, blank-note omission, server-error display, and cancel-reset.
- **`describe('staff opening a return for the buyer')`** – Staff-mode suite: the `stated-at-date` field is rendered and included in the payload.

## Relationships

| Neighbor | Interaction |
|---|---|
| `src/modules/returns/components/ReturnRequestForm.vue` | Subject under test; mounted via `@vue/test-utils`. |
| `src/modules/returns/store.ts` | `useReturnsStore` is instantiated and `openReturn` is spied on every test. |
| `tests/support/unit/fixtures.ts` | Supplies the `aReturn()` factory used as the spy's resolved value. |
| `tests/support/unit/mounted-vm.ts` | Provides `emitOn`, used to drive the `VSelect` model. |
| `tests/support/unit/wire-modules.ts` | `wireModulesIntoCore()` runs once at module top level to register i18n/Vuetify in the core test env. |

## Notes

- The spy is attached **before** `mount` because the component destructures store actions during `setup`; spying after mount would not intercept the reference.
- `wireModulesIntoCore()` is called at module scope (not in `beforeEach`), so it runs exactly once per file.
- `attachTo: document.body` is required for Vuetify components to render correctly in jsdom.
- `beforeEach` resets Pinia (`setActivePinia(createPinia())`) and loads the `en` locale before each test.
- The spec deliberately does **not** assert on HTTP/network behavior; that contract lives in the store's own spec.
