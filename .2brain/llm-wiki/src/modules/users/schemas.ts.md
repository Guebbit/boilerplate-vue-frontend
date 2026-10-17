---
source: src/modules/users/schemas.ts
sha256: f65b30ffedce73171dcc051fcbf976eac2e9e36938e455b4fbef10cbc3f9b51a
generated_at: 2026-10-17T01:46:40.365202+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/schemas.ts

## Purpose

Defines Zod validation schemas for the user create/edit forms. Error messages are i18n-thunked (deferred via `() => translate(...)`) so they resolve against the active locale at parse time rather than being baked in at module-load time.

## Key elements

- **`usersEmailSchema`** (internal) — `z.email()` with an i18n error for invalid addresses.
- **`usersUsernameSchema`** (internal) — `z.string().min(signupBodyUsernameMin, …)`; the minimum is sourced from the shared API contract in `@api/schemas`.
- **`usersPasswordSchema`** (exported) — `z.string().min(…).max(…)` using `signupBodyPasswordMin` / `signupBodyPasswordMax`. Deliberately no composition rules; the server's breached-password check is the real gate.
- **`usersSchema`** (exported) — `z.object(…)` describing the full form: `id`, `email`, `username` required; `imageUrl`, `phone`, `website`, `role`, `active`, `createdAt`, `updatedAt` optional/nullish.

## Relationships

- **`src/modules/users/index.ts`** — barrel file that re-exports `usersSchema` and `usersPasswordSchema` for consumers outside the module.
- **`src/modules/users/tests/schemas.spec.ts`** — unit-tests the validation rules (lengths, nullish vs optional distinctions).
- **`src/modules/users/tests/schemas-i18n.spec.ts`** — verifies that error messages are translated correctly when the locale changes between schema definition and `parse`/`safeParse`.
- **`src/modules/users/views/UserCreate.vue`** — consumes `usersSchema` (and `usersPasswordSchema`) to validate the create form.
- **`src/modules/users/views/UserEdit.vue`** — consumes the same schemas to validate the edit form.

## Notes

- **Thunked errors, not static strings.** `error: () => translate(…)` means the message is a *function* that Zod invokes at validation time. If a test or consumer reads `schema.shape.field._zod.def.error` expecting a string, it will get a function back.
- **`imageUrl` uses `nullish()` with `min(1)`.** `null` is the "clear the avatar" signal; an empty string is explicitly rejected because the API contract enforces `minLength: 1`. Don't "simplify" this to `optional()`.
- **Password schema is intentionally minimal.** The comment references NIST SP 800-63B-4; do not add uppercase/digit/special-char rules here—length bounds are the only client-side constraint.
- **API-contract constants are imported from `@api/schemas`**, not re-declared locally. If the backend changes the min/max, update the contract source and these schemas follow automatically.
