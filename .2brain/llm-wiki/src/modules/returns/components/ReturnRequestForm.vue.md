---
source: src/modules/returns/components/ReturnRequestForm.vue
sha256: eaa44f8f3012232a98b3936b212024caed9d3cf348cd2b80e5b237efeefd4dae
generated_at: 2026-10-17T01:36:54.796997+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/components/ReturnRequestForm.vue

## Purpose

Customer-facing form for opening a non-withdrawal return (defective goods, wrong item, or "other"). It lets the customer select which order lines to send back, how many of each, pick a reason, and add an optional note, then calls `POST /returns` via the returns store. The right of withdrawal is deliberately excluded from this component and lives in the sibling `WithdrawalPanel`.

## Key elements

- **Props** – `orderId: string` and `lines: ReturnOptionLine[]` (the returnable lines with their remaining quantities).
- **Emits** – `'opened'`: fires after a successful return so the parent re-fetches the order and return list.
- **`REASONS`** – `['defective', 'wrong_item', 'other']` as a const tuple; `withdrawal` is intentionally absent.
- **Zod `schema`** – Validates `reason` (must be one of `REASONS`), `note` (trimmed, ≤ 1000 chars), and `lines` (a record of at least one entry, each quantity an integer 1…remaining).
- **`useStructureFormValidation`** (from `@guebbit/vue-toolkit`) – Wires the schema to the form, manages `formErrors`, `showFormErrors`, `handleSubmit`, `applyServerErrors`, `resetForm`.
- **`useReturnsStore`** – Provides `openReturn` (the API call) and a reactive `loading` flag that disables the submit button.
- **`useBlockingError`** – Captures unmapped server rejections (bare 409, closed window) into an `InlineErrorAlert` at the bottom of the form.
- **`setPicked` / `setQuantity`** – Toggle a line in/out of the `lines` record and update its quantity string. Ticking defaults the quantity to the full remaining amount; the record is replaced (not mutated) so the validator re-runs.
- **`submit`** – Calls `handleSubmit`, maps the validated state into the store's `openReturn` payload, toasts success, collapses, and emits `'opened'`. On failure, `applyServerErrors` maps field errors; unmapped errors go to the blocking alert.
- **`collapse`** – Resets the form, clears the blocking error, and hides the form behind the "Open" button again.

## Relationships

- **`src/modules/returns/store.ts`** – Imported as `useReturnsStore`; the component reads `openReturn` and `loading` from it. This is the sole path from the form to the API.
- **`src/modules/returns/tests/return-request-form.spec.ts`** – Unit/integration tests for this component.
- **`src/modules/returns/components/WithdrawalPanel.vue`** – Sibling component handling the withdrawal flow. They share the same parent page and the same store but are independent; this form's `REASONS` list excludes `withdrawal` to avoid overlap.

## Notes

- The `reason` field starts as an empty string on purpose (no default reason). The Zod schema uses `z.string().refine(...)` rather than `z.enum` so the initial empty state is representable.
- `setPicked` and `setQuantity` replace `form.lines` with a new object each time (spread syntax) instead of mutating the existing record; this is what makes the validation hook detect the change.
- `remainingOf` returns `0` for a product not in `props.lines`, which effectively makes `isValidQuantity` fail and the line unpickable.
- The `loading` ref comes from the Pinia store, not from local state, so a concurrent `WithdrawalPanel` submit would also disable this button (and vice versa) if they shared the same store instance.
- The truncated template ends with the cancel button; the full component likely closes with a `</form>` and a wrapping `</div>`.
