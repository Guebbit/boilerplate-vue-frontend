---
source: src/modules/api-keys/schemas.ts
sha256: f939b3d57eaab155bd34b0d413a4672161fce1990d4ca087d3b049839b553524
signature: b18e4e217bd2766ceeca8c9be13214b1808cd33f8b0d48027a0b6082ede49fab
generated_at: 2026-11-10T03:49:50.196582+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/schemas.ts

## Purpose

Zod validation schema for the credential-mint (API-key-create) form. It enforces client-side constraints on name, permissions, and expiry before the request leaves the browser, and resolves error messages through i18n at parse time so the active locale is always reflected.

## Key elements

- **`apiKeyNameSchema`** (internal) — `z.string()` requiring ≥ 1 char and ≤ `createApiKeyBodyNameMax` (imported from the API contract in `@api/schemas`).
- **`apiKeyPermissionsSchema`** (internal) — `z.array(z.string())` requiring at least one entry.
- **`apiKeyExpiresAtSchema`** (internal) — `z.string()` (min 1) plus a `.refine()` that rejects any value whose parsed date is ≤ `Date.now()`.
- **`apiKeyCreateSchema`** (exported) — `z.object({ name, permissions, expiresAt })`; the single public schema the create view feeds to its form.

## Relationships

- **`src/modules/api-keys/views/ApiKeyCreate.vue`** — imports `apiKeyCreateSchema` and uses it to validate the form before dispatching the mint request.
- **`src/modules/api-keys/tests/schemas.spec.ts`** — exercises the validation rules (required fields, length bounds, past-date rejection) and asserts pass/fail outcomes.
- **`src/modules/api-keys/tests/schemas-i18n.spec.ts`** — verifies that error messages resolve to the correct translation keys under different locales.

## Notes

- **Thunked errors, not strings.** Every `error` field is `() => translate('…')`. This defers lookup to parse time so switching locale mid-session doesn't require re-building the schema. Do not "simplify" to a static string.
- **No upper bound on `expiresAt` client-side.** The ceiling (`maxExpiresAt`) is published by the server's list endpoint and enforced there (422). The client only guards the *floor* (past dates) to avoid a dead-on-arrival credential.
- **`createApiKeyBodyNameMax` is imported, not re-declared.** It comes from `@api/schemas` (the shared contract). If the server changes the limit, this file picks it up automatically.
- **`expiresAt` is a string, not a date object.** The form supplies an ISO/datetime string; the `.refine()` parses it with `new Date(value)`. Consumers should not expect a `Date` instance after validation.
