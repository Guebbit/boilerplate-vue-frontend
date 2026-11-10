---
source: src/modules/users/tests/schemas.spec.ts
sha256: 8f4a87366d20df6efa614da98a3ca3efa2fd031a31379b34a6b9a7e167cd2955
signature: faa1ccc7baeb54a9389458309da59460082cbb5a2b03d2efcd9b4c1b389d4875
generated_at: 2026-11-10T06:07:26.281891+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/schemas.spec.ts

## Purpose

Vitest suite that validates the structural rules (lengths, required fields, nullability) of the user schemas in `../schemas.ts`. It asserts boundary behaviour against contract constants from `@api/schemas` and confirms that no character-class composition rules are enforced on passwords. Message-content assertions live separately in `schemas-i18n.spec.ts`.

## Key elements

- **`validUser`** – minimal object (`email`, `username` at contract minimum) used as the baseline for single-field mutation tests.
- **`describe('usersPasswordSchema')`** – verifies `usersPasswordSchema` accepts/rejects at the exact `signupBodyPasswordMin` and `signupBodyPasswordMax` boundaries and accepts all-lowercase, all-digit, and passphrase passwords (no NIST composition rules).
- **`describe('usersSchema')`** – covers email format rejection, username minimum boundary, `nullish` acceptance for `id`/`imageUrl`/`admin`/`active`/`createdAt`/`updatedAt`, `imageUrl` empty-string rejection, `phone`/`website` null rejection, and required-field enforcement for `email` and `username`.
- **`describe('usersSchema username bound')`** – confirms rejection of a username exceeding `createUserBodyUsernameMax`.

## Relationships

- **`src/modules/users/schemas.ts`** – the module under test; provides `usersPasswordSchema` and `usersSchema`.
- **`@api/schemas`** (external contract package) – supplies the boundary constants (`signupBodyPasswordMin`, `signupBodyPasswordMax`, `signupBodyUsernameMin`, `createUserBodyUsernameMax`) so tests track contract changes automatically.

## Notes

- Fields like `id`, `admin`, `active`, `createdAt`, `updatedAt` use `nullish` (accept both `null` and `undefined`), not `optional` (which would only accept `undefined`), because the API serialises unset fields as `null`.
- `phone` and `website` are the inverse: `optional` but **not** `nullable` — `undefined` is valid, `null` is rejected.
- `imageUrl` has a special rule: empty string `''` is rejected; the only way to clear it is `null`.
- All boundary assertions are parametric against `@api/schemas` constants; no magic numbers appear in the test file.
