---
source: src/modules/inventory/tests/backorder-limit-dialog.spec.ts
sha256: 3a3e30af7e2434fbeff8f2e14452c194432a9ad161fe08cd954f62e397e73774
signature: 92789af1d625650cfb98bb7ad651ef8af343d4556463bade9acbe1a06a309c9f
generated_at: 2026-11-10T04:32:37.345670+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/backorder-limit-dialog.spec.ts

## Purpose

Unit-test suite for `BackorderLimitDialog.vue`. Verifies that the staff-facing dialog opens showing the product's current backorder limit and outstanding count, saves the typed number (including zero) or "no limit" (`null`) via the store's `setLimit`, and keeps the dialog open with an error message when the server refuses.

## Key elements

- **`openDialog()`** — local helper that mounts the component with `VDialog` stubbed inline, spies on `setLimit` (mocking a successful resolution), then flips `modelValue` to `true` and returns `{ wrapper, setLimit }`.
- **`beforeEach`** — resets Pinia (`setActivePinia(createPinia())`) and loads the `'en'` locale before each test.
- **6 test cases** inside `describe('BackorderLimitDialog')`:
  - Opens on the current limit and displays the outstanding count.
  - Saves a typed non-zero number and emits `update:modelValue: false`.
  - Saves `0` (closes preordering).
  - Saves `null` when the "no limit" checkbox is checked.
  - Pre-checks the "no limit" box when the level has no `backorderLimit`.
  - On a rejected `setLimit`, shows the error text and does **not** close the dialog.

## Relationships

- **`src/modules/inventory/components/BackorderLimitDialog.vue`** — the SUT; mounted directly and interacted with via `@vue/test-utils`.
- **`src/modules/inventory/store.ts`** — `useInventoryStore` is pulled from here; its `setLimit` action is the unit boundary spied/mocked in every test.
- **`tests/support/unit/fixtures.ts`** — supplies the `aLevel()` factory used to build level objects with known `backorderLimit` / `backordered` values.
- **`tests/support/unit/mounted-vm.ts`** — provides `nextRenderTick(wrapper)`, a microtask-flush helper used after every submit before asserting.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module load to make `@/i18n`, `@/ui/vuetify`, etc. resolvable outside the app bundle.

## Notes

- `VDialog` is stubbed with a trivial `<div><slot/></div>` template so the dialog content is always rendered; tests never interact with Vuetify's overlay machinery.
- The dialog communicates open/close exclusively through Vue's `v-model` contract (`modelValue` prop / `update:modelValue` emit); there is no imperative `open`/`close` API under test.
- The "no limit" path is driven by a separate checkbox (`[data-test=backorder-limit-unlimited]`), not by clearing the number input; the number field's value is irrelevant when that box is ticked.
- The product id is hardcoded as `'p1'` in every `setLimit` assertion — the `aLevel` fixture does not carry an id, so tests rely on the component defaulting to that value.
