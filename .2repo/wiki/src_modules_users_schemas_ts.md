# src/modules/users/schemas.ts

## Purpose

Zod validation schemas for user form data. Error messages are i18n thunks (`() => translate(…)`) so translations are resolved at parse time, not at module-load time.

## Key elements

- **`usersEmailSchema`** *(internal)* – `z.email()` with a single i18n error key.
- **`usersUsernameSchema`** *(internal)* – `z.string().min(signupBodyUsernameMin, …)`; minimum length is sourced from the shared API contract (`@api/schemas`), not hardcoded.
- **`usersPasswordSchema`** *(exported)* – `z.string().min(createUserBodyPasswordMin, …)` followed by four `.refine()` calls enforcing ≥1 lowercase, ≥1 uppercase, ≥1 digit, and ≥1 special character. Each rule carries its own i18n error message.
- **`usersSchema`** *(exported)* – `z.object({…})` representing the full user form: `email` and `username` are required; `id`, `imageUrl`, `admin`, `active`, `createdAt`, `updatedAt` are `.nullish()`; `phone` and `website` are `.optional()`.

## Relationships

- **`src/modules/users/index.ts`** – Consumes the two exported schemas (`usersPasswordSchema`, `usersSchema`) and re-exports them for the rest of the module. The two internal schemas (`usersEmailSchema`, `usersUsernameSchema`) stay private to this file.

## Notes

- Only `usersPasswordSchema` and `usersSchema` are exported; the email and username sub-schemas are file-private and reachable only via `usersSchema`.
- Password complexity uses `.refine()` (not `.regex()`) so each failing rule produces a distinct, human-readable message rather than a single combined one.
- The minimum-length constants (`signupBodyUsernameMin`, `createUserBodyPasswordMin`) come from `@api/schemas`, keeping the frontend contract in sync with the API definition.
- The `error` option in Zod is called as a thunk (`() => translate(…)`), not a string literal. This is intentional: it defers the i18n lookup until `parse()` runs, so the active locale at request time is respected.
