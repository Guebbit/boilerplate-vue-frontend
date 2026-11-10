---
source: src/modules/users/schemas.ts
sha256: aa6c464c27f26c710711504f4143709a012e71116898898d0b1715479baf70eb
signature: ad4645bfd45b6d1e55b67f23ad8f2a2813afa851946e1d39c308975216be5515
generated_at: 2026-11-10T06:04:53.500884+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/schemas.ts

## Purpose

Defines Zod validation schemas for the user create/edit forms. Error messages are i18n-thunked (resolved at parse time via `translate()`) so they follow the active locale. Length bounds are imported from the API contract (`@api/schemas`) rather than hardcoded, keeping client and server constraints in sync.

## Key elements

- **`usersPasswordSchema`** *(exported)* — String with min/max length only. No composition rules by design (NIST SP 800-63B-4); breached-password checking is delegated to the server.
- **`usersSchema`** *(exported)* — `z.object` combining email, username, and the password schema. `id`, `imageUrl`, `role`, `active`, `createdAt`, `updatedAt` are `.nullish()`; `phone` and `website` are `.optional()`. `imageUrl` additionally enforces `min(1)` so an empty string is rejected (use `null` to clear).
- **`usersEmailSchema`** *(internal)* — Zod `.email()` plus `.max(createUserBodyEmailMax)`.
- **`usersUsernameSchema`** *(internal)* — `.string().min(signupBodyUsernameMin).max(createUserBodyUsernameMax)`.

## Relationships

- **`src/modules/users/index.ts`** — Barrel file that re-exports `usersSchema` and `usersPasswordSchema` so consumers import from the module root.
- **`src/modules/users/views/UserCreate.vue`** — Consumes the schemas to validate form input before submission.
- **`src/modules/users/views/UserEdit.vue`** — Same usage for the edit form.
- **`src/modules/users/tests/schemas.spec.ts`** — Unit tests for valid/invalid field values.
- **`src/modules/users/tests/schemas-i18n.spec.ts`** — Verifies that error messages resolve through `translate()` at parse time.
- **`src/modules/users/tests/schemas.property.spec.ts`** — Property-based tests confirming schema constraints match the API contract bounds.

## Notes

- Error messages are **thunked** (`() => translate(…)`), not pre-resolved strings. This means the schema definition itself is locale-agnostic, but you must call `.parse()` after i18n is initialized to get translated messages.
- `imageUrl` distinguishes `null` (clear the image) from `''` (invalid). Don't pass an empty string to mean "no image."
- Password schema intentionally omits complexity rules. If a UX hint about breached passwords is added, keep it non-blocking (see the doc comment).
