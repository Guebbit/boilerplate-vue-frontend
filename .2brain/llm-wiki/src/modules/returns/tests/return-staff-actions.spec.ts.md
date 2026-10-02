---
source: src/modules/returns/tests/return-staff-actions.spec.ts
sha256: c05a382200b385e10be4bf39939690d4d92a4679d457003b662c5f8f4e067185
generated_at: 2026-10-02T15:45:34.730864+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/tests/return-staff-actions.spec.ts

## Purpose

Unit tests for the `ReturnStaffActions.vue` component. Verifies that the approve / decline / receive controls render only when `Return.actions` allows them, and that each interaction dispatches the correct store method with the expected arguments. Store methods are spied on; network transport is explicitly out of scope (delegated to `store.spec.ts`).

## Key elements

- **`mountActions(item: Return)`** – Local helper that creates a Pinia-backed `useReturnsStore()`, spies on `approve` / `decline` / `receive` (mocked to resolve `aReturn()`), mounts `ReturnStaffActions` with Vuetify + i18n plugins, and returns `{ wrapper, store }`.
- **`beforeEach`** – Resets Pinia (`setActivePinia(createPinia())`) and loads the `'en'` locale before every test.
- **`describe('ReturnStaffActions')`** – Seven `it` blocks covering:
  - No controls rendered when all three actions are `false`.
  - Clicking approve calls `store.approve('r1')` and emits `'changed'`.
  - Submitting the decline form with an empty reason does **not** call `store.decline`.
  - Declining with a filled reason calls `store.decline('r1', 'Worn')`.
  - Receiving with no deduction calls `store.receive('r1', undefined)`.
  - Receiving with a deduction parses the input to a number (`4.5`).
  - A rejected store promise suppresses the `'changed'` emit and surfaces a `[data-test=return-move-error]` element.

## Relationships

- **`tests/support/unit/fixtures.ts`** – Supplies the `aReturn()` factory, used both as the mock-resolved value for store spies and as the prop payload (`item`) passed to the component under test.
- **`tests/support/unit/wire-modules.ts`** – Supplies `wireModulesIntoCore()`, invoked once at module top-level (outside `beforeEach`) to register shared test infrastructure before any test runs.

## Notes

- `wireModulesIntoCore()` is called at **module scope**, not inside `beforeEach`; it runs exactly once when the file is imported by the Vitest runner.
- Selectors are `data-test` attributes (`return-approve`, `return-decline-form`, `return-receive-form`, `return-decline-reason`, `return-receive-deduction`, `return-move-error`); the component must keep these stable or the suite breaks.
- The scope boundary is stated in the file header: this spec asserts *what* the store is called with; it does not verify HTTP payloads or error-retry logic.
