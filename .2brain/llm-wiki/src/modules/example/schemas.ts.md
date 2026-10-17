---
source: src/modules/example/schemas.ts
sha256: 8a9f868e62eb7c970cebdec11bdda4cce0f3724d7d2d6e2aaf6bf2efcba9cdb6
generated_at: 2026-10-17T00:51:38.235148+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/schemas.ts

## Purpose

Defines Zod validation schemas for the Example create and edit forms. Error messages are i18n-thunked (resolved at parse time via `translate()`) so the active locale is picked up dynamically. Field bounds are sourced from generated API contract schemas rather than restated locally.

## Key elements

- **`exampleTitleSchema`** (internal) — `z.string().min(1).max(createExampleBodyTitleMax)` with translated error thunks for "required" and "too long".
- **`exampleBodySchema`** (internal) — `z.string().min(1).max(createExampleBodyBodyMax)` with translated error thunks. Comments note a deployment may enforce a tighter ceiling server-side, surfaced via `applyServerErrors`.
- **`exampleCreateSchema`** (exported) — `z.object({ title, body })`. A new example is always a draft (no `status` field).
- **`exampleEditSchema`** (exported) — `exampleCreateSchema.extend({ status: z.enum(EXAMPLE_STATUSES) })`. Adds the status discriminator on top of the create fields.

## Relationships

- **`src/modules/example/domain/index.ts`** (→ this file): Provides `EXAMPLE_STATUSES`, consumed by `exampleEditSchema` to constrain the `status` enum.
- **`src/modules/example/domain/statuses.ts`** (→ this file, via re-export): Origin of the `EXAMPLE_STATUSES` constant.
- **`src/modules/example/tests/schemas.spec.ts`**: Unit-tests the exported schemas (validation logic, bounds).
- **`src/modules/example/tests/schemas-i18n.spec.ts`**: Verifies that error messages resolve to the correct i18n keys at parse time.
- **`src/modules/example/views/ExampleCreate.vue`** (this file →): Consumes `exampleCreateSchema` for form validation.
- **`src/modules/example/views/ExampleEdit.vue`** (this file →): Consumes `exampleEditSchema` for form validation.

## Notes

- Error messages use the **thunk form** (`error: () => translate(...)`), not a static string. This is deliberate: it defers translation to parse time so switching locale mid-session works without re-defining the schema.
- `max` bounds come from `@api/schemas` (`createExampleBodyTitleMax`, `createExampleBodyBodyMax`). Do not hardcode numeric limits here — update the generated contract instead.
- `exampleEditSchema` is built with `.extend()`, so it structurally **includes** every field of `exampleCreateSchema`. Adding a field to the create schema automatically appears in edit.
