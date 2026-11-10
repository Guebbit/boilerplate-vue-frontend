---
source: src/modules/returns/schemas.ts
sha256: 24341e42589bf6af2e125816c711fdf7093f9411a31c1b0d96bb133c571fe974
signature: edc03c6b497c158bf422f8210924fca7216df906ce869099b6eb878693161ef7
generated_at: 2026-11-10T05:38:32.955511+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/schemas.ts

## Purpose

Defines individual Zod field schemas for the returns forms (buyer request, staff decline, staff close, staff cancel). Error messages are i18n thunks resolved at parse time via `translate()`, and length caps are re-exported from the generated `@api/schemas` contract so components never import that package directly.

## Key elements

- **`DECLINE_REASONS`** — Ordered array of `ReturnDeclineReason` enum values, matching the select's display order.
- **`declineReasonSchema`** — Required string that must be one of `DECLINE_REASONS`; rejects free-text entry.
- **`declineMessageSchema`** — Trimmed string, capped at `declineReturnBodyMessageMax`. Empty is allowed here; the form layer adds the "required when code is `other`" rule.
- **`closeNoteSchema`** — Trimmed string, capped at `closeReturnBodyNoteMax`. Optional (empty allowed).
- **`cancelNoteSchema`** — Trimmed string, capped at `cancelReturnBodyNoteMax`. Optional (empty allowed).
- **`returnNoteSchema`** — Trimmed string, capped at `createReturnBodyNoteMax`. Optional (empty allowed).
- **Re-exported constants** (`cancelNoteMax`, `closeNoteMax`, `declineMessageMax`, `returnNoteMax`) — The same contract caps under shorter names so views can read them without importing `@api/schemas`.

## Relationships

- **`src/modules/returns/components/ReturnStaffActions.vue`** — Consumes `declineReasonSchema`, `declineMessageSchema`, `closeNoteSchema`, `cancelNoteSchema`, and their corresponding `*Max` constants to build its reactive form rules.
- **`src/modules/returns/components/ReturnRequestForm.vue`** — Consumes `returnNoteSchema` and `returnNoteMax` for the buyer's optional note field.
- **`src/modules/returns/tests/schemas.spec.ts`** — Unit-tests the schemas defined in this file.

## Notes

- These are **field-level** schemas, not composed object schemas. Cross-field rules (e.g., "message required when decline code is `other`") are added by the consuming form component, not here.
- Error-message strings go through `translate()` thunks, so the i18n locale is resolved lazily at `.parse()` / `.safeParse()` time, not at module load.
- `DECLINE_REASON_NAMES` (a `ReadonlySet`) is module-internal and used only by the `refine` predicate; it is not exported.
