---
source: src/modules/returns/tests/return-request-form.spec.ts
sha256: ef29c14ade7c90e80532bc9d35538ef9394e2851e99ae58f50312e6713cbc8b2
generated_at: 2026-10-02T15:45:15.399849+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/tests/return-request-form.spec.ts

## Purpose

Vitest spec for the `ReturnRequestForm` component. It verifies the form's UI contract: it stays collapsed until opened, lists only returnable lines with their remaining quantities, validates that at least one line is ticked with a valid reason and in-range quantity, submits only the ticked lines to the store, and handles server rejection. The store's `openReturn` is spied; real transport is covered by `store.spec.ts`.

## Key elements

- **`LINES`** – Two-line fixture (Shirt ×3 ordered / 2 remaining, Mug ×1 / 1) passed as the `lines` prop.
- **`mountForm()`** – Creates a fresh Pinia store, spies `openReturn` *before* mounting (the component destructures actions at `setup()`), then mounts with Vuetify + i18n plugins and `attachTo: document.body`. Returns `{ wrapper, store }`.
- **`openForm(wrapper)`** – Clicks the `[data-test=return-request-open]` trigger.
- **`pick(wrapper, productId)`** – Ticks a line's checkbox via its `input` element.
- **`chooseReason(wrapper, reason)`** – Emits `update:modelValue` on the `VSelect` component (bypassing DOM interaction).
- **`describe('ReturnRequestForm', …)`** – Eight cases covering: initial collapsed state, line/reason rendering, default quantity = remaining, empty-form rejection, over-quantity rejection, partial submission with trimmed note, blank-note omission, server-rejection display, and state reset on cancel.

## Relationships

- **`tests/support/unit/fixtures.ts`** – Imports `aReturn()` to shape the mock resolved value of `openReturn`.
- **`tests/support/unit/mounted-vm.ts`** – Imports `emitOn()` to programmatically set the Vuetify `VSelect` model value.
- **`tests/support/unit/wire-modules.ts`** – Calls `wireModulesIntoCore()` at module scope to register shared module mocks before any test runs.

## Notes

- The spy must be attached **before** `mount()` because the component destructures store actions during `setup()`; spying after mount would leave the real action bound.
- `attachTo: document.body` is required for Vuetify's teleport/overlay behavior; omitting it can cause silent assertion failures on overlay content.
- `chooseReason` avoids `.setValue()` on the VSelect input because Vuetify manages its internal model separately from the DOM value; `emitOn` is the reliable path.
- The component emits an `'opened'` event (not a store side-effect) on success, and the tests assert on that event rather than a navigation or route change.
