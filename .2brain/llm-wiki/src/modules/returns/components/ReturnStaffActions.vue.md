---
source: src/modules/returns/components/ReturnStaffActions.vue
sha256: 8be189197f9c2515a3ac939911dffe4883339f558bbbe690bb8d69bb3a3cc1ef
generated_at: 2026-10-17T01:37:06.167483+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/components/ReturnStaffActions.vue

## Purpose

Renders the three staff actions available on a single return — **approve**, **decline** (with a mandatory reason), and **receive** (with an optional handling deduction). Which of the three are shown is driven entirely by the server-supplied `item.actions`; the component performs no lifecycle logic of its own, only validation, dispatch, and feedback.

## Key elements

- **`handleApprove`** — calls `approve(item.id)` from the returns store via the shared `run` helper.
- **`submitDecline`** — validates a `reason` string (1–500 chars, trimmed) through `useStructureFormValidation`, then calls `decline(item.id, reason)`.
- **`submitReceive`** — validates an optional `handlingDeduction` (empty or non-negative number), converts it, and calls `receive(item.id, { handlingDeduction })` (or `undefined` when empty).
- **`run(move, success, applyFieldErrors?)`** — single execution path for all three moves: clears prior error, toasts on success, emits `changed`, or routes the failure through `applyFieldErrors` / `reportMoveError` (in-place `InlineErrorAlert`).
- **`declineSchema` / `receiveSchema`** — Zod schemas consumed by `useStructureFormValidation`; both re-validate on `locale` change.
- **`loading`** (from `storeToRefs(useReturnsStore())`) — disables every button while any move is in flight to prevent races.
- **`moveError`** — shared blocking-error state displayed in the `InlineErrorAlert` at the bottom of the component.

## Relationships

- **`src/modules/returns/store.ts`** — Source of the three store actions (`approve`, `decline`, `receive`) and the reactive `loading` flag. All server calls go through this store; the component holds no HTTP logic.
- **`src/modules/returns/views/Return.vue`** — Parent view that supplies the `item: Return` prop and listens for the `changed` emit to re-fetch or refresh surrounding order/financial data.
- **`src/modules/returns/tests/return-staff-actions.spec.ts`** — Dedicated unit/integration spec covering the three flows, validation gating, and error surfacing.

## Notes

- The component uses a **named default export block** (`{ name: 'ReturnStaffActions' }`) alongside `<script setup>`, which is required for `<KeepAlive>` / devtools identification since `script setup` cannot declare `name` itself.
- `handlingDeduction` is intentionally a **string** in the form state (matching a plain `<input type="number">`); it is only converted to `Number` at the `run` call site. Empty string means "no deduction."
- Error routing: when a form is present, `applyServerErrors` is tried first; only unmapped errors fall through to the generic `InlineErrorAlert`. Moves without a form (approve) go straight to the blocking alert.
- The `data-test` attributes on every interactive element are the contract for the e2e/unit test suite.
