---
source: src/modules/webhooks/schemas.ts
sha256: abe27d51e884390a3ea379eea14bcafc883ea4d956fe7c1bf5d49a2726b145f9
signature: 22300e349b46fc257eb3b599744afa9d6b2bb11cd347bad35c67cb744dce840b
generated_at: 2026-11-10T06:13:24.090013+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/schemas.ts

## Purpose

Zod validation schemas for the webhook subscription form (create and edit). Error messages are i18n thunks resolved at parse time, and URL constraints (max length, `https://` pattern) are pulled from the generated API contract rather than re-declared.

## Key elements

- **`webhookUrlSchema`** (private) — `z.url` + `.max()` + `.regex()`; validates syntactic URL, enforces `https://` scheme, and caps length. Reuses `createWebhookSubscriptionBodyUrlMax` and `createWebhookSubscriptionBodyUrlRegExp` from `@api/schemas`.
- **`webhookEventTypesSchema`** (private) — `z.array(z.string()).min(1)`; requires at least one event type.
- **`webhookCreateSchema`** (exported) — object: `url` (required), `description` (optional, max length from contract), `eventTypes` (required). No `enabled` field.
- **`webhookEditSchema`** (exported) — identical reference to `webhookCreateSchema`; the edit form validates the same fields.

## Relationships

- **`src/modules/webhooks/tests/schemas.spec.ts`** — unit-tests the validation rules and pass/fail cases for both exported schemas.
- **`src/modules/webhooks/tests/schemas-i18n.spec.ts`** — verifies that error messages resolve through the i18n thunk to the correct localized strings.
- **`src/modules/webhooks/views/WebhookCreate.vue`** — imports `webhookCreateSchema` to validate the create form before submission.
- **`src/modules/webhooks/views/WebhookEdit.vue`** — imports `webhookEditSchema` to validate the edit form.

## Notes

- All `error` values are **thunks** (`() => translate(…)`), not static strings. They are called at `.parse()` time, so the active locale at the moment of validation determines the message. Tests that assert error text must trigger a parse, not inspect the schema object.
- `webhookEditSchema` is the *same object* as `webhookCreateSchema` (not a derived or extended schema). Mutating one would mutate the other.
- `enabled` is deliberately absent from both schemas; toggling a subscription is a separate API action, not a form field.
- The `https://` check uses the contract's bound regex (`createWebhookSubscriptionBodyUrlRegExp`), not a `.refine()`. If the contract changes the pattern, the form validation follows automatically.
