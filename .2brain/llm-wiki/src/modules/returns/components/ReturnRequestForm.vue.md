---
source: src/modules/returns/components/ReturnRequestForm.vue
sha256: 804591140a5f07552b99df04fbb013f83277450b5c26d16420d2e0267636b117
generated_at: 2026-10-02T15:42:34.112111+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/components/ReturnRequestForm.vue

## Purpose

Customer-facing form for opening a partial or full return with a reason other than withdrawal (defective, wrong item, other). It lets the customer pick which order lines to send back, set quantities, choose a reason, and attach an optional note, then dispatches `POST /returns` via the returns store.

## Key elements

- **Props** — `orderId: string` and `lines: ReturnableLine[]` (the returnable lines with their remaining counts).
- **Emits** — `'opened'`: fired after a successful return so the parent page can refresh the order/list.
- **`REASONS` / `reasonOptions`** — The allowed reason codes (`defective`, `wrong_item`, `other`) and their translated select options. `withdrawal` is deliberately excluded (handled by `WithdrawalPanel`).
- **`remainingOf` / `isValidQuantity`** — Helpers that look up a line's remaining count and validate a typed quantity (integer ≥ 1, ≤ remaining).
- **`schema`** — Zod object validating `reason` (must be one of `REASONS`), `note` (≤ 1000 chars), and `lines` (at least one entry, each quantity in range).
- **`useStructureFormValidation`** — Wires the schema to a reactive `form`, `formErrors`, `showFormErrors`, `handleSubmit`, and `applyServerErrors`. Re-validates on locale change; scrolls to invalid Vuetify fields on submit.
- **`setPicked` / `setQuantity`** — Toggle a line's checkbox or edit its quantity; both replace `form.lines` immutably so validation re-runs.
- **`submit`** — Validates, trims the note, maps the reason string back to the narrow union, calls `openReturn`, then either toasts + collapses + emits `'opened'`, or maps server errors to fields (falling back to the blocking alert).
- **`collapse`** — Resets form state, clears the blocking error, and collapses the panel.
- **`useBlockingError`** — Holds a server-level error message that cannot be attached to a specific field (e.g. closed return window, 409). Rendered via `InlineErrorAlert`.
- **`expanded`** — `ref<boolean>` controlling the collapsed (single button) vs. expanded (full form) view.

## Relationships

- **`src/modules/returns/store.ts`** — Provides `openReturn` (the API call) and `loading` (disables the submit button while in-flight).
- **`src/modules/returns/domain/returnable-lines.ts`** — Supplies the `ReturnableLine` type used in props and the `remainingOf` lookup.
- **`src/modules/returns/components/WithdrawalPanel.vue`** — Sibling component that handles the reason-free withdrawal button; this form explicitly excludes that flow (noted in the module doc comment).

## Notes

- The form starts **collapsed**; the first render is just an "Open" button. The actual `<form>` is only in the DOM when `expanded` is `true`.
- `reason` intentionally starts as `''` (empty string), not a pre-selected default, so no reason is implied before the customer chooses one. The Zod schema uses `z.string().refine(...)` rather than `z.enum` for the same reason.
- `lines` in the form state is a `Record<productId, string>` (quantity as a string). On submit it is narrowed to numbers and only the ticked lines are sent.
- Ticking a line defaults its quantity to the full remaining amount; the customer can then lower it.
- Server errors that carry field-level messages are mapped to individual fields via `applyServerErrors`; anything unmapped (bare 409, closed window) is surfaced through the `InlineErrorAlert` blocking error.
- The `data-test` attributes follow the pattern `return-request-*` / `return-line-*` / `return-line-pick-*` / `return-line-quantity-*` for E2E selectors.
