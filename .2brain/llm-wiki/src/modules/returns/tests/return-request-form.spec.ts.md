---
source: src/modules/returns/tests/return-request-form.spec.ts
sha256: ab91990bcd3bc8bca0e79a6638d941809da5aafe96800251c608dff2e50baf66
generated_at: 2026-10-17T01:38:25.026072+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/tests/return-request-form.spec.ts

## Purpose

Unit test spec for the `ReturnRequestForm.vue` component. It verifies the form's user-facing contract: collapsed-until-opened state, per-line checkbox selection with quantity validation (never above remaining), mandatory reason, optional note trimming, partial-submission payload shape, server-error handling, and state reset on cancel. The store's `openReturn` action is always spied; actual transport is deferred to `store.spec.ts`.

## Key elements

- **`LINES`** — static fixture: two returnable lines (p1 Shirt qty 2, p2 Mug qty 1) passed as the `lines` prop.
- **`mountForm()`** — creates a fresh Pinia store, spies `openReturn` (mocked to resolve `aReturn()`), then mounts the component with Vuetify + i18n plugins and `attachTo: document.body`. Returns `{ wrapper, store }`.
- **`openForm(wrapper)`** — clicks the `[data-test=return-request-open]` button.
- **`pick(wrapper, productId)`** — checks the line's checkbox input.
- **`chooseReason(wrapper, reason)`** — emits `update:modelValue` on the VSelect instance (via `emitOn`) to set the reason.
- **`describe('ReturnRequestForm')`** — nine tests covering: initial collapsed state; note placeholder copy; line/reason rendering; default quantity = remaining; rejection with no tick/no reason; rejection for over-quantity; successful partial submit (payload + `opened` event + form removal); blank-note omission from payload; server-rejection error display; cancel resets form state.

## Relationships

- **`ReturnRequestForm.vue`** — the component under test; all assertions target its DOM and emitted events.
- **`store.ts`** — provides `useReturnsStore`; its `openReturn` action is the single spy point for verifying submission payloads.
- **`fixtures.ts`** — supplies the `aReturn()` factory used as the default `openReturn` mock return value.
- **`mounted-vm.ts`** — supplies `emitOn`, used to set the VSelect model value without simulating click-through interactions.
- **`wire-modules.ts`** — supplies `wireModulesIntoCore()`, called once at module scope before any test runs to make cross-module imports resolvable in the Vitest environment.

## Notes

- `openReturn` must be spied **before** `mount` because the component destructures store actions during `setup()`; spying after mount would leave a stale reference.
- `wireModulesIntoCore()` is invoked at the top level of the module (outside `beforeEach`), so it runs once per test file load.
- Reason selection bypasses Vuetify's option-click flow entirely (`emitOn` on `update:modelValue`), keeping tests decoupled from VSelect's internal DOM.
- The spec explicitly documents its boundary: it asserts the *call shape* to the store, not HTTP behavior — that belongs to the store's own spec.
