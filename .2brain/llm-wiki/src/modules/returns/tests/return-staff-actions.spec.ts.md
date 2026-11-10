---
source: src/modules/returns/tests/return-staff-actions.spec.ts
sha256: 88a38df738effa5b1d71867dc1017d46d7fc28a24d298e26342c6f822d97c799
signature: 579456a1b1661d56d3194f6e74fb83d1ae76f63dbf65832e5793ab8ae24e0298
generated_at: 2026-11-10T05:40:10.946460+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/tests/return-staff-actions.spec.ts

## Purpose

Unit tests for the `ReturnStaffActions` component. Verifies that staff-action buttons and forms render (or stay hidden) based solely on the `Return.actions` flag, and that each interaction dispatches the expected store method with the correct arguments. The transport layer is explicitly out of scope here — that belongs to `store.spec.ts`.

## Key elements

- **`mountActions(item: Return)`** — Local helper that creates a fresh Pinia store, spies on all six action methods (`approve`, `decline`, `receive`, `recordProof`, `close`, `cancel`), mounts `ReturnStaffActions` with the given `item` prop, and returns `{ wrapper, store }`.
- **`beforeEach`** — Resets Pinia to a new instance and loads the `en` locale.
- **Rendering visibility tests** — Asserts that no action controls exist when `actions` has no `true` flags.
- **Approve test** — Clicks the approve button, expects `store.approve('r1')` and a single `changed` emit.
- **Decline tests** — Empty-reason submit is rejected (store not called); valid-reason submit passes the reason code as the second argument.
- **Receive tests** — No-argument receive passes `undefined` body; deduction is formatted to two decimals (`'4.50'`) before reaching the store.
- **Remedy sub-suite** — Covers the defective / wrong-item branch: preselection of the buyer's `preferredRemedy`, deduction hidden under guarantee, staff override of remedy, and default-to-refund when no preference exists.
- **Error-handling tests** — General (non-422) rejections show a `data-test=return-move-error` banner with the message text; 422 rejections carry a `VALIDATION_ERROR` that is surfaced as a field-level error instead of a general one.

## Relationships

- **`src/modules/returns/components/ReturnStaffActions.vue`** — The component under test; mounted and queried via `data-test` attributes.
- **`src/modules/returns/store.ts`** — Provides `useReturnsStore`; all six action methods are spied before mount so tests assert call arguments without hitting the network.
- **`tests/support/unit/fixtures.ts`** — Supplies `aReturn` and `aProblem` factory fixtures used throughout the tests.
- **`tests/support/unit/mounted-vm.ts`** — Supplies `emitOn`, used to trigger `update:modelValue` on the inner `VSelect` (decline reason picker).
- **`tests/support/unit/wire-modules.ts`** — Supplies `wireModulesIntoCore()`, called once at module scope to register Vue plugins needed by the component.

## Notes

- `wireModulesIntoCore()` runs at **module top level**, not inside `beforeEach`; it is idempotent but only needs to execute once per test file.
- The deduction field renders the user-typed value, but the store receives it normalized to two decimal places (`'4.50'`), not the raw `'4.5'`.
- Remedy visibility is conditional: for a **withdrawal** (no `reason` of `defective`/`wrong_item`) the remedy radio group is absent and the deduction field is present; under a **guarantee** (e.g. `reason: 'defective'`) the deduction field disappears and the remedy radios appear with the buyer's `preferredRemedy` pre-selected.
- On store rejection the component emits **no** `changed` event and instead renders a `[data-test=return-move-error]` node; 422 responses are treated differently (field-level errors, no general banner).
- The `useNotificationsStore` (from `@guebbit/vue-toolkit`) is inspected directly to assert toast messages (e.g. "refund is not settled yet" after a successful `receive`).
