---
source: src/modules/users/tests/schemas.spec.ts
sha256: ca58616f51373c20e0ab2bee64c74dad1d66db52edb19b856ea55a304f7b4fdc
generated_at: 2026-10-17T01:47:38.360645+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/schemas.spec.ts

## Purpose

Vitest spec for the user form's validation rules (email, username, password). It asserts boundary conditions and field-acceptance semantics without testing i18n messages (those live in `schemas-i18n.spec.ts`). Bounds are read from the API contract so the tests track contract changes automatically.

## Key elements

- **`validUser`** – module-level fixture: a minimal payload (`email` + `username`) that passes `usersSchema`, used as the base for single-field mutation tests.
- **`describe('usersPasswordSchema')`** – boundary tests for min/max length against `signupBodyPasswordMin`/`Max`; parameterised acceptance of "all lowercase", "all digits", and passphrase-style passwords to confirm no character-class composition is enforced.
- **`describe('usersSchema')`** – email format rejection cases, username minimum boundary, `null`-vs-`undefined` acceptance for `nullish` fields (`id`, `imageUrl`, `admin`, `active`, `createdAt`, `updatedAt`), `imageUrl` empty-string rejection, `phone`/`website` non-nullability, and required-field enforcement for `email` and `username`.

## Relationships

- **`src/modules/users/schemas.ts`** (via `../schemas`) – provides `usersSchema` and `usersPasswordSchema`, the two Zod schemas under test.
- **`@api/schemas`** (aliased import) – supplies `signupBodyPasswordMin`, `signupBodyPasswordMax`, `signupBodyUsernameMin`; the numeric bounds that the tests assert against, keeping them in sync with the API contract.

## Notes

- **`nullish` ≠ `optional`:** Fields like `id` and `imageUrl` accept both `null` and `undefined` because the API returns `null` for unset values; `phone` and `website` accept only `undefined`. This distinction is explicitly tested and easy to regress.
- **`imageUrl`** may be `null` (cleared) but not `''` (empty string) — a deliberate constraint beyond the `nullish` type.
- **No password composition rules** are tested as acceptance cases; the comment cites NIST SP 800-63B-4 to justify length-only enforcement. If a composition rule is added, the "accepts all-lowercase / all-digits" cases will fail.
- The module doc-block explicitly separates "rules" (this file) from "messages" (`schemas-i18n.spec.ts`) to avoid conflating validation logic with localisation.
