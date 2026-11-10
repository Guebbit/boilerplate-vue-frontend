---
source: src/modules/tasks/schemas.ts
sha256: bf9f15777b5694b66cebe64587b3de81f296120db9d4a0635a04a2a6e656e8ce
signature: d64fcbee7a9f40b48776c84d9e529a36e4407f1a7efb726c3d271b92c3279b70
generated_at: 2026-11-10T05:56:59.633347+00:00
model: ollama:qwen3.8:27b
---

# src/modules/tasks/schemas.ts

## Purpose

Defines Zod validation schemas for the contact/task forms, with i18n-thunked error messages resolved at parse time. Length caps are sourced from generated API contract constants (`@api/schemas`) so the frontend and backend stay in lockstep.

## Key elements

- **`cappedText(max)`** *(internal)* — Factory returning a `z.string().max(max)` schema whose error message is an i18n thunk naming the cap.
- **`contactSchema`** *(exported)* — Zod object schema for the public contact form (`CreateContactTaskRequest`). Fields: `name` (optional), `email` (required, format + length), `subject` (required, min 1), `message` (required, min 1), `category` (optional enum from `TaskCategory`), `orderNumber` (optional), `website` (optional, unvalidated).
- **`orderNumberMax`** *(re-export)* — Re-exports `createContactTaskBodyOrderNumberMax` from `@api/schemas` under a shorter name so the contact view can read the cap without importing the API package directly.

## Relationships

- **`src/modules/tasks/views/Contact.vue`** — Consumes `contactSchema` for form validation and `orderNumberMax` to render the order-number field's `maxlength` attribute.
- **`src/modules/tasks/tests/schemas.spec.ts`** — Unit-tests the schemas defined here (validation rules, i18n error resolution, boundary lengths).

## Notes

- `website` is deliberately **not** validated: it is never shown to the user; the backend interprets whatever value is passed through. The schema only ensures the field is a string (or absent).
- Error messages use `() => translate(...)` thunks so the i18n locale is resolved at **parse time**, not at module load.
- `orderNumberMax` exists as a re-export specifically to keep `Contact.vue` from importing `@api/schemas`; do not add further re-exports here without a similar consumer constraint.
