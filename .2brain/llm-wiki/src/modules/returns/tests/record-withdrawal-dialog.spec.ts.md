---
source: src/modules/returns/tests/record-withdrawal-dialog.spec.ts
sha256: 897955abba38c8cfc6f0c67853691023d1d3178f907d8b5e5f901e10066efc8e
signature: 25c83418e6cd0d33b1290769d929001a80184253b7f58ee2ece05c5f28419ca4
generated_at: 2026-11-10T05:39:42.763555+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/tests/record-withdrawal-dialog.spec.ts

## Purpose

Unit tests for the `RecordWithdrawalDialog` component. Verifies that a buyer-stated withdrawal submission enforces both required fields (day and channel), rejects future dates, forwards an ISO instant + channel to the store's `openReturn`, emits `recorded` on success, and keeps server rejections (e.g. 409 window-closed) visible in-dialog.

## Key elements

- **`mountDialog`** – Mounts the dialog in its open state (`modelValue: true`) with `openReturn` spied via `vi.spyOn` on the Pinia store; stubs `VDialog` to a bare slot wrapper and attaches to `document.body`.
- **`fill(wrapper, day, channel)`** – Sets the `datetime-local` input value and emits `update:modelValue` on the `VSelect`, then flushes promises.
- **`beforeEach`** – Resets Pinia (`setActivePinia(createPinia())`) and loads the `en` locale.
- **`it('sends the stated day as an instant…')`** – Happy path: asserts `openReturn` is called with an ISO `requestedAt` and `statedVia`, and `recorded` is emitted once.
- **`it.each([...])('sends nothing with %s')`** – Parameterized rejection: missing day, missing channel, future date. Asserts `openReturn` is never called and no `recorded` emit.
- **`it('keeps a refusal in the dialog…')`** – Mocks `openReturn` to reject with a 409 problem; asserts the error message renders in `[data-test=record-withdrawal-error]` and no `recorded` emit.

## Relationships

- **`RecordWithdrawalDialog.vue`** – The component under test; imported and mounted directly.
- **`store.ts`** – Provides `useReturnsStore`; its `openReturn` action is the sole spy target.
- **`tests/support/unit/fixtures.ts`** – Supplies `aReturn()` (a valid return object) and `aProblem(409, …)` (a structured error) used as mock return/reject values.
- **`tests/support/unit/mounted-vm.ts`** – Provides `emitOn`, used to simulate Vuetify `VSelect` model updates.
- **`tests/support/unit/wire-modules.ts`** – Provides `wireModulesIntoCore()`, invoked at module top-level to wire shared test modules before any test runs.

## Notes

- `wireModulesIntoCore()` is a **top-level side effect** on import; test order within the file does not matter for this setup, but the module must be imported before any test executes.
- `VDialog` is stubbed with a minimal `<div><slot/></div>` template to bypass Vuetify's overlay/portal machinery while still rendering the dialog content.
- `attachTo: document.body` is required so Vuetify components that depend on the real DOM (e.g. VSelect dropdown) render correctly.
- The module doc comment explicitly scopes out the step-up / HTTP-layer prompt; only the store action contract is tested here.
