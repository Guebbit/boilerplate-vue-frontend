---
source: src/modules/payments/schemas.ts
sha256: 05efa815505fa9bd4366222c86e1c9ffbe4b7122e1e0397d6956566bdca4b378
signature: 73de29fa8ff7cbe552051272b0ff36f23f84bb24209e60e376ead016c87d5a49
generated_at: 2026-11-10T05:12:56.619636+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/schemas.ts

## Purpose

Provides Zod validation schemas and re-exported length-limit constants for the payments UI forms. It exists so that Vue components can import constraints and validators directly from this module rather than reaching into `@api/schemas` (which is an API-layer module components are not expected to import).

## Key elements

- **`offlineReferenceMax`** — Re-export of `recordOrderPaymentBodyReferenceMax` from `@api/schemas`. The maximum character length for an offline payment reference.
- **`cancelRefundNoteMax`** — Re-export of `cancelRefundBodyNoteMax` from `@api/schemas`. The maximum character length for a voided-refund note.
- **`cancelRefundNoteSchema`** — Zod string schema for the mandatory staff note on a voided refund: trimmed, min 1 char, max `cancelRefundNoteMax`. Validation error messages are produced via the i18n `translate` helper with keys under `refund-cancel-form.*`.

## Relationships

- **`src/modules/payments/components/RecordOfflinePaymentForm.vue`** — Consumes `offlineReferenceMax` to bound the reference input's length.
- **`src/modules/payments/components/RefundCancelForm.vue`** — Consumes both `cancelRefundNoteMax` (for display/cap logic) and `cancelRefundNoteSchema` (for form-field validation).
- **`@api/schemas`** — Source of the two length-limit constants re-exported here; this file adds no new constants, only renames them for the UI domain.

## Notes

- The two re-exports use renamed aliases (`offlineReferenceMax`, `cancelRefundNoteMax`). If you add a new UI-facing limit, follow the same pattern: re-export with a UI-specific name rather than importing from `@api/schemas` in components.
- Error messages are always produced through `translate()`; there are no hardcoded strings. The `max` in the "too long" message is interpolated from the imported constant, so bumping the constant in `@api/schemas` automatically updates the message.
- `cancelRefundNoteSchema` enforces `min(1)` *after* `.trim()`, meaning a whitespace-only string is rejected as empty, not as length-1.
