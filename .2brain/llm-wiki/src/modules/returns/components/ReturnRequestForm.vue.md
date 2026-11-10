---
source: src/modules/returns/components/ReturnRequestForm.vue
sha256: 07917405fa7b5e73197e1f5161034849462e80796bd98e4ae256fed8c2e594b5
signature: 64753a10e9383e8c0d0d430af2142f015d31a19156cd2fc5acad9ede12441bf2
generated_at: 2026-11-10T05:36:31.679431+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/components/ReturnRequestForm.vue

## Purpose
Customer (and staff) form for opening a return via `POST /returns` with a reason other than withdrawal. Lets the user pick which order lines to send back, how many of each, a reason, an optional note, an optional remedy preference, and (staff-only) the date the buyer asked. The right of withdrawal lives in the sibling `WithdrawalPanel`; this form covers defective goods, wrong items, or "other," including partial returns.

## Key elements
- **Props** — `orderId`, `lines` (returnable products with remaining quantity), `reasons` (server-allowed reasons), `staff` (enables date field and waives deadline), `exceptions` (past-deadline reasons staff may waive).
- **`expanded` / `collapse()`** — toggle between a single button and the full form; collapsing resets form state and clears any blocking error.
- **`schema` (zod)** — validates `reason`, `note`, `preferredRemedy`, `requestedAt`, and `lines` (record of productId → quantity string). Quantity is a string in the form and coerced to a number at submit time.
- **`reasonChoices` / `reasonOptions`** — filters the fixed `REASONS` constant (`defective`, `wrong_item`, `other`) against the server-supplied `props.reasons`.
- **`choosesRemedy` / `remedyOptions`** — shows a remedy select only when `hasRemedyChoice` is true for the chosen reason.
- **`isLineShut`** — for non-staff users, a line with `withdrawable: false` (Art. 16 goods) is unticked when reason is `other`.
- **`reasonIsException`** — computed flag when the chosen reason appears in `props.exceptions`; informational only, the server makes the final call.
- **`watch` on `form.value.reason`** — prunes lines that the new reason disallows so a blocked item is never submitted.
- **`submit()`** — validates via `useStructureFormValidation`, maps the form into the store's `openReturn` payload (narrowing strings to union types, trimming note, converting date via `localToIso`), toasts on success, emits `'opened'`, or surfaces a blocking alert on unhandled server errors (e.g. bare 409).
- **`useBlockingError`** — holds a single server-level message that cannot be tied to a specific field.

## Relationships
- **`src/modules/returns/store.ts`** — calls `openReturn` to dispatch the API request; reads `loading` to disable the submit button in-flight.
- **`src/modules/returns/schemas.ts`** — reuses `returnNoteSchema` and `returnNoteMax` for the note field's validation and length cap.
- **`src/modules/returns/domain/remedy.ts`** — imports `REMEDIES` (ordered list) and `hasRemedyChoice` to gate the remedy select.
- **`src/modules/returns/domain/statement.ts`** — imports `isStatedInTime` (date validation) and `localToIso` (local → ISO conversion for staff-supplied dates).
- **`src/modules/returns/components/StatedAtFields.vue`** — rendered sub-component for the staff "date the buyer asked" input.
- **`src/modules/returns/components/WithdrawalPanel.vue`** — sibling component handling the reason-free withdrawal button; this form explicitly excludes `withdrawal` from its reason list.
- **`src/modules/returns/tests/return-request-form.spec.ts`** — unit/integration tests for this component's validation, submit, and edge-case behavior.
- **`src/modules/returns/tests/withdrawal-panel.spec.ts`** — tests the sibling panel; shares the same store and option context but is not imported here.

## Notes
- `reason` starts as an empty string (not a default) so the form never implies a reason the customer didn't pick; the zod schema uses `z.string().refine(...)` rather than `z.enum` to allow that initial empty state.
- `lines` is a flat `Record<string, string>` in the form (productId → quantity-as-string) and is converted to an array of `{ productId, quantity }` only at submit time.
- Ticking a line pre-fills the quantity to the full remaining amount; the customer is expected to lower it. The record is **replaced** (spread) rather than mutated so the zod validator sees the change.
- `onUnmapped` in `applyServerErrors` catches rejections that carry no field-level message (bare 409, closed window) and routes them to the blocking alert; without it the customer would see no feedback at all.
- The staff flag also disables `isLineShut`, so a staff member can tick Art. 16-excluded lines even with reason `other`.
