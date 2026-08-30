# src/modules/users/schemas.ts

## Purpose

Zod validation schemas for the user form (signup/profile). Each error message is an i18n thunk — a `() => translate(…)` call resolved at **parse time** rather than at schema-definition time, so the active locale is always honoured regardless of when the module was first loaded.

## Key elements

- **`usersEmailSchema`** (internal) — `z.email()` with a single translated error message.
- **`usersUsernameSchema`** (internal) — `z.string().min()` where the minimum is imported from the API contract (`signupBodyUsernameMin`).
- **`usersPasswordSchema`** (exported) — Enforces the contract's minimum length (`createUserBodyPasswordMin`) plus four `.refine()` rules: lowercase, uppercase, digit, and special character (`[^\dA-Za-z]`). Each rule carries its own i18n key.
- **`usersSchema`** (exported) — `z.object()` wrapping the full user form: `email` and `username` required; `id`, `imageUrl`, `admin`, `active`, `createdAt`, `updatedAt` are `.nullish()`; `phone` and `website` are `.optional()`.

## Relationships

- **`src/modules/users/index.ts`** — Re-exports `usersPasswordSchema` and `usersSchema` so consumers of the `@/modules/users` barrel can import them without reaching into the file directly.

## Notes

- `usersEmailSchema` and `usersUsernameSchema` are **not** exported. Downstream code must go through `usersSchema` or re-import from this file explicitly.
- The i18n keys for the lowercase and uppercase password rules read `password-minus-required` and `password-maius-required`. These look like typos (expected: `lowercase`/`uppercase`) but they are the keys the translation catalog must define — verify before renaming.
- The "special character" check is `password && /[^\dA-Za-z]/.test(password)`. Because it runs inside `.refine()`, a `null`/`undefined` password is short-circuited by the `&&` guard; the actual absence is already caught by the `.min()` check above.
