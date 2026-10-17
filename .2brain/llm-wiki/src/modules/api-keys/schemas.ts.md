---
source: src/modules/api-keys/schemas.ts
sha256: cb3548d32652cc1fe1928af1059318756c07e24ef03b7482e34acd47ea55510a
generated_at: 2026-10-17T00:32:01.740704+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/schemas.ts

## Purpose

Defines the Zod validation schema for the API-key (credential) minting form. Error messages are i18n-thunked — they call `translate()` at parse time rather than baking a locale string into the schema at module load, so the form works regardless of which locale was active when the module was first imported.

## Key elements

- **`apiKeyNameSchema`** – Validates the credential name: non-empty, length ≤ `mintApiKeyBodyNameMax` (imported from the API contract, not hardcoded).
- **`apiKeyPermissionsSchema`** – Validates the permissions array: must contain at least one string entry.
- **`latestExpiry()`** – Pure helper returning the epoch-ms instant one calendar year from now; used as the ceiling for the expiry field.
- **`apiKeyExpiresAtSchema`** – Validates the expiry timestamp string: required (non-empty), must be in the future (client-side floor), and must not exceed `latestExpiry()` (mirrors the server's 422 ceiling).
- **`apiKeyCreateSchema`** *(exported)* – `z.object` combining the three fields above; the schema consumed by the create form.

## Relationships

- **`@api/schemas`** – Source of `mintApiKeyBodyNameMax`, the contract-declared name-length bound. Importing it here keeps the client and server limits in lockstep (same pattern as the `users` module).
- **`@/i18n`** – Provides `translate`, the function invoked inside each error thunk to resolve the i18n key at parse time.
- **`src/modules/api-keys/views/ApiKeyCreate.vue`** – The consuming view; parses user input against `apiKeyCreateSchema` before dispatching the mint request.
- **`src/modules/api-keys/tests/schemas.spec.ts`** – Unit tests for the schema's acceptance/rejection behavior.
- **`src/modules/api-keys/tests/schemas-i18n.spec.ts`** – Verifies that error messages resolve to the correct i18n key in each tested locale.

## Notes

- **Past-date floor is client-only.** The server happily mints a credential whose expiry is already in the past (it's dead on arrival). The `new Date(value).getTime() > Date.now()` refine exists purely as a pre-round-trip guard; there is no corresponding server-side 422 for it.
- **Ceiling mirrors the server.** The one-year limit in `apiKeyExpiresAtSchema` is the same rule the server enforces with a 422; the client check is a UX convenience, not the source of truth.
- **Redundant empty-string check.** `apiKeyExpiresAtSchema` applies both `z.string({ error })` and `.min(1, { error })` with the *same* i18n key. The first rejects non-string input; the second rejects an empty string. Both are intentional.
- **`latestExpiry` uses `setFullYear`.** It advances the calendar year, not a fixed 365-day offset, so leap-year boundaries are handled correctly.
