---
source: src/modules/example/schemas.ts
sha256: 8f3ad13c5cce81b0dec820672162107ef98f3ddcd0824bb6ac3bcccf6c9768a1
signature: 71e5bce6c3a063ef0e492c7cf18b9fe67f4c80da86921e2b50399544fd9f4504
generated_at: 2026-11-10T04:23:23.645628+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/schemas.ts

## Purpose

Client-side Zod form-validation schema for the Example module. It defines what a user may submit when creating or editing an example, enforcing required fields and max-length bounds sourced from the generated API contract. Error messages are i18n-thunked (resolved at parse time) so the UI language is correct regardless of when validation fires.

## Key elements

- **`exampleTitleSchema`** (internal) — `z.string().min(1).max(createExampleBodyTitleMax)` with `translate('example-form.title-required' | '…title-too-long')` error thunks.
- **`exampleBodySchema`** (internal) — `z.string().min(1).max(createExampleBodyBodyMax)` with analogous i18n error thunks. A deployment may enforce a lower ceiling server-side; its 422 surfaces via `applyServerErrors`, not this schema.
- **`exampleFormSchema`** (exported) — `z.object({ title, body })`. Shared by both the create and edit flows; the `status` field is intentionally absent because status transitions through a separate endpoint.

## Relationships

- **`src/modules/example/tests/schemas.spec.ts`** — asserts validation success/failure paths for `exampleFormSchema` (required, max-length, valid payload).
- **`src/modules/example/tests/schemas-i18n.spec.ts`** — verifies that error messages resolve through the active i18n locale (the `() => translate(…)` thunks).
- **`src/modules/example/views/ExampleCreate.vue`** — consumes `exampleFormSchema` to validate the create form before dispatching the request.
- **`src/modules/example/views/ExampleEdit.vue`** — consumes the same `exampleFormSchema` for the edit form (no status field in either).

## Notes

- Error messages are **thunked** (`error: () => translate(…)`), not pre-evaluated strings. This means locale switching after schema creation still yields the correct message on the next parse.
- Max-length bounds (`createExampleBodyTitleMax`, `createExampleBodyBodyMax`) are imported from `@api/schemas` (generated contract). Do **not** restate them as literals here.
- The file deliberately ships **one** schema for create and edit. Do not add a `status` field; status changes go through their own endpoint.
- Server-side enforcement may be stricter than the contract max (deployment-specific ceiling). Such rejections arrive as HTTP 422 and are mapped to fields by `applyServerErrors` elsewhere — this schema will not catch them.
