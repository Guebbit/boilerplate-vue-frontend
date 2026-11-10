---
source: src/modules/returns/components/ReturnStaffActions.vue
sha256: 0b0628bb2d7f98a283e5544f57a08bf5c40bad36e73aa3158a549e95d902442a
signature: 0b0628bb2d7f98a283e5544f57a08bf5c40bad36e73aa3158a549e95d902442a
generated_at: 2026-11-10T05:36:49.753727+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/components/ReturnStaffActions.vue

## Purpose

Renders the six staff actions available on a return (approve, decline, receive, record proof of sending, close, cancel). Which of the six are visible is driven entirely by the server-provided `Return.actions` array on the prop; this component re-implements none of the lifecycle logic itself and delegates every mutation to the returns store.

## Key elements

- **`props.item: Return`** — the return object whose `actions` array gates which buttons/forms render.
- **`emit('changed')`** — fired after any move resolves so the parent page re-fetches dependent data (order status, money).
- **Decline form** — Zod schema (`declineSchema`) requiring a reason code and, when the code is `other`, a non-empty message to the buyer. Options translated from `DECLINE_REASONS`.
- **Receive form** — captures a per-line restock count (integer 0…quantity), an optional handling deduction (non-negative decimal), and a remedy choice. Pre-selects `props.item.preferredRemedy ?? 'refund'`. Remedy options come from `REMEDIES` in `domain/remedy.ts`.
- **Record-proof form** — carrier, reference (both trimmed, 1–200 chars) and a send date that must not be in the future. The button label differs when `props.item.reason === 'withdrawal'` (proof opens the refund directly).
- **Close / Cancel forms** — each holds a single optional note string validated by `closeNoteSchema` / `cancelNoteSchema` from `schemas.ts`.
- **`run(move, success, applyFieldErrors?, owed?)`** — shared executor: clears the blocking error, calls the store action, toasts success (or an "owed" variant), emits `changed`, or surfaces a 409/422 message in place via `useBlockingError`.
- **`loading` (from `storeToRefs`)** — disables all buttons while any move is in flight to prevent double-submits.
- **`showRestocked`** — computed; visible only when the session can `read Return` and at least one line has a defined `restocked` value, so buyers never see restock counts.

## Relationships

- **`src/modules/returns/store.ts`** — source of the six action methods (`approve`, `decline`, `receive`, `recordProof`, `close`, `cancel`) and the shared `loading` flag. This component is the sole UI caller of those methods.
- **`src/modules/returns/schemas.ts`** — provides the Zod sub-schemas and constants (`DECLINE_REASONS`, `declineReasonSchema`, `declineMessageSchema`, `closeNoteSchema`, `cancelNoteSchema`, their `*Max` lengths) that this component composes into its form schemas.
- **`src/modules/returns/domain/remedy.ts`** — exports `REMEDIES` (the ordered list of legal remedy values) and `hasRemedyChoice` (whether the return's reason qualifies for a staff-selected remedy vs. a refund).
- **`src/modules/returns/views/ReturnTarget.vue`** — parent view that passes the `Return` object as `item` and listens for `@changed` to refresh surrounding data.
- **`src/modules/returns/tests/return-staff-actions.spec.ts`** — unit/integration spec that exercises each form's validation and the `run` flow.

## Notes

- The component declares its name in a separate `<script>` block alongside `<script setup>` because `defineOptions`/`name` is not available in the setup block for `<KeepAlive>` matching.
- The `run` helper is intentionally generic: it accepts an optional `applyFieldErrors` callback so field-level 422 errors land on the specific form's `applyServerErrors`, while the `onUnmapped` fallback surfaces the generic blocking-error message.
- `setRestock` spreads the existing `restock` record before assigning the new key; this is required so that `useStructureFormValidation`'s reactive tracking detects the change (mutating the nested value in place would not).
- The proof-of-sending date is parsed as `YYYY-MM-DDT00:00:00`; it is compared against "now" only for the upper bound—there is no lower-bound check (a past date is always valid).
- `logger.ts` appears as a graph neighbor but is **not** imported by this file; the interaction is indirect (via the store or utilities it re-exports) and not visible in this component's source.
