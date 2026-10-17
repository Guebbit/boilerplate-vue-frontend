---
source: src/modules/inventory/tests/preorder-limit-dialog.spec.ts
sha256: 7bc7ba02c4bd144f67b88ec97faa706edec7815e5df03d028e4db402dba6e521
generated_at: 2026-10-17T01:00:37.142459+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/preorder-limit-dialog.spec.ts

## Purpose

Unit test for the `PreorderLimitDialog.vue` component (staff UI for setting one product's preorder limit). Mounts the real dialog with an inline `VDialog` stub and a spied store action, then verifies four behaviours: the field initialises to the current limit, a typed value (including zero) is saved and the dialog closes, and a rejected save keeps the dialog open with the error visible.

## Key elements

- **`openDialog()`** – Mounts `PreorderLimitDialog` with `modelValue: false`, spies on `useInventoryStore().setLimit` (mocked to resolve), then flips `modelValue` to `true`. Returns the `wrapper` and the spied `setLimit` for assertions.
- **`describe('PreorderLimitDialog')`** – Four `it` blocks:
  - *"opens on the current limit…"* – asserts the input value is `'3'` and the outstanding count text is present.
  - *"saves the typed limit and closes"* – sets input to `'5'`, submits, expects `setLimit('p1', 5)` and `update:modelValue` → `[[false]]`.
  - *"saves zero…"* – same flow with `'0'`; confirms zero is a valid save.
  - *"keeps a refusal in the dialog…"* – overrides the spy with `.mockRejectedValueOnce`, submits, expects the error message visible and **no** `update:modelValue` emission.
- **`beforeEach`** – resets Pinia (`createPinia` + `setActivePinia`) and loads the `en` locale.

## Relationships

- **`../components/PreorderLimitDialog.vue`** – the component under test; imported and mounted directly.
- **`../store.ts`** – provides `useInventoryStore`; its `setLimit` action is spied/mocked in every test.
- **`tests/support/unit/fixtures.ts`** – supplies the `aLevel` factory for realistic level objects.
- **`tests/support/unit/mounted-vm.ts`** – provides `nextRenderTick` to flush Vue's render cycle before asserting DOM state.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called once at module top-level to configure the test environment (i18n, Vuetify, etc.) before any test runs.

## Notes

- `VDialog` is stubbed **inline** via a minimal `<div><slot/></div>` template rather than through `@vue/test-utils` stub config — keep this pattern if the real `VDialog` introduces async open/close transitions.
- `wireModulesIntoCore()` runs at module scope (outside `beforeEach`), so it executes exactly once for the whole file; don't move it into a hook.
- Selectors rely on `data-test` attributes (`preorder-limit-field`, `preorder-limit-error`); renaming those in the component will break this spec silently.
