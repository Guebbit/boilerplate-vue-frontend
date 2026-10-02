---
source: src/modules/returns/components/ReturnStaffActions.vue
sha256: eea4e253335a399362c9fc89bee93f543f5aa20a488628bec01a08ebc5738130
generated_at: 2026-10-02T15:43:01.504413+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/components/ReturnStaffActions.vue

## Purpose

Renders the staff-facing action panel for a single return record (approve, decline, receive). Which of the three controls appear is driven entirely by the server-provided `item.actions` array; this component does not implement or mutate the return lifecycle itself — it collects optional form inputs, delegates the mutation to the returns store, and reports the outcome.

## Key elements

- **`handleApprove`** — Calls `approve(item.id)` from the store. No form; a single button click.
- **`submitDecline`** — Validates a required `reason` (1–500 chars, via Zod) then calls `decline(item.id, reason)`.
- **`submitReceive`** — Validates an optional `handlingDeduction` (empty string = none, otherwise ≥ 0) then calls `receive(item.id, { handlingDeduction })` (omits the field when empty).
- **`run(move, successKey, applyFieldErrors?)`** — Shared executor: clears prior blocking error, fires the store action, toasts success, emits `changed`, or routes errors to the form's field-level validator (falling back to the shared `InlineErrorAlert`).
- **`useBlockingError()`** (`moveError` / `reportMoveError` / `clearMoveError`) — Single reactive slot for un-mapped server errors (409 lost-race, 422 refused amount); rendered by `<InlineErrorAlert>`.
- **`useStructureFormValidation`** (×2) — Provides reactive form state, Zod-backed error messages, `showFormErrors` gating, and `applyServerErrors` for per-field 422 mapping. Re-validates on locale change.
- **`loading`** (from `storeToRefs(useReturnsStore())`) — Disables every button while any move is in flight to prevent double-submission.
- **Emits `changed`** — Signals the parent page to re-fetch / refresh derived data (order statuses, money).

## Relationships

- **`src/modules/returns/store.ts`** — Imports `useReturnsStore` for the `approve` / `decline` / `receive` action creators and the shared `loading` flag. All server mutations pass through this store; the component never calls an API directly.
- **`src/infrastructure/utils/logger.ts`** — Not imported here directly; available transitively via the returns store's action layer.

## Notes

- The component is **stateless with respect to the return lifecycle**: it reads `item.actions` to decide what to render and trusts the store to transition the record. After a successful move it emits `changed` and expects the parent to refresh `item`.
- `handlingDeduction` is validated as a *string* (the raw input) with a `refine` that accepts `''` or a non-negative number; it is only converted to a number at the point of the store call.
- Both forms use `novalidate` and rely on the custom Vuetify + Zod pipeline rather than native HTML validation; `invalidFieldSelector` targets Vuetify's internal markup.
- The `data-test` attributes (`return-approve`, `return-decline-reason`, `return-receive-deduction`, `return-move-error`, etc.) are the stable selectors for e2e tests.
