---
source: src/modules/returns/tests/cancel-remainder-dialog.spec.ts
sha256: d03bbc015cd60fc89a6c9c8c62dce130eb52fcff11b57f620dd98237f6780819
signature: a661b0dfba66d9a069b02306fbfb611359bf3aa656efd1b2555e833cc81cc936
generated_at: 2026-11-10T05:39:14.242838+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/tests/cancel-remainder-dialog.spec.ts

## Purpose

Unit tests for `CancelRemainderDialog.vue`, verifying both what the dialog renders (refund amount, delivery line visibility, staff-only note field) and what it dispatches to the returns store when the user confirms (buyer withdrawal, staff note, or staff-recorded withdrawal with date/channel). Also asserts that a server refusal keeps the dialog open without emitting close events.

## Key elements

- **`OPTION`** – a frozen `CancelableFulfillmentOrder` fixture (1 × Mug, 12.50 refund, no shipping) used as the default dialog payload.
- **`mountDialog(mode, option?)`** – mounts `CancelRemainderDialog` with `modelValue: true`, stubs `VDialog` as a pass-through slot, spies on `useReturnsStore().openReturn`, and returns `{ wrapper, openReturn }`.
- **`describe('what the dialog shows')`** – three tests asserting line-item text, conditional shipping line, and the staff-only note textarea.
- **`describe('what it sends')`** – three tests asserting the exact `openReturn` payload for buyer (reason `withdrawal`), staff (reason `other` + trimmed note), and the refusal path (dialog stays open, no `canceled`/`update:modelValue` emit).
- **`describe('staff recording the buyer's withdrawal')`** – three tests covering the extra "as withdrawal" flow: sending `requestedAt` + `statedVia`, blocking submit when the statement is incomplete, and hiding the tick from buyers.

## Relationships

- **`src/modules/returns/components/CancelRemainderDialog.vue`** – the component under test; mounted with props (`modelValue`, `orderId`, `currency`, `option`, `mode`).
- **`src/modules/returns/store.ts`** – `useReturnsStore` is called to obtain the `openReturn` action, which is spied and asserted against in every "sends" test.
- **`tests/support/unit/fixtures.ts`** – `aReturn` builds a minimal return object used as the mock-resolved value of `openReturn`.
- **`tests/support/unit/mounted-vm.ts`** – `nextRenderTick` and `emitOn` drive reactive updates and simulate Vuetify `VSelect` emits without real DOM interaction.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called once at module scope to register i18n and Vuetify plugins before any test runs.

## Notes

- `wireModulesIntoCore()` executes at import time, not inside `beforeEach`, so it runs exactly once per test-file load.
- `VDialog` is stubbed inline as `<div><slot /></div>` rather than via a shared stub; this means the dialog's open/close logic is never exercised—tests only see the rendered slot content.
- The "staff recording withdrawal" tests use `expect.objectContaining` on the `openReturn` call, while buyer/staff tests assert the full object literal—adding or removing a field on those paths will break the test.
- Selectors are all `data-test` attributes; there is no reliance on Vuetify's class structure.
