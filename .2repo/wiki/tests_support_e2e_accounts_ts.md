# tests/support/e2e/accounts.ts

## Purpose

Single source of truth for the two demo credentials (user and admin) used across e2e tests. Centralising them here prevents silent drift that would occur if passwords were duplicated in login helpers and fixture seeds.

## Key elements

- **`E2E_ACCOUNTS`** (`as const` object) — Maps roles to `{ email, password }` pairs:
  - `user`: `gino@pino.it` / `password`
  - `admin`: `root@root.it` / `rootroot`
- **`E2ERole`** (type) — `keyof typeof E2E_ACCOUNTS`, resolves to `'user' | 'admin'`. Useful as a typed key when selecting an account programmatically.

## Relationships

- **`tests/support/e2e/commands.ts`** — The `cy.loginAs()` command (documented in this file's JSDoc) consumes `E2E_ACCOUNTS` to drive a UI login with the correct credentials.
- **`tests/support/e2e/fixtures.ts`** — The `adminApi` task authenticates server-side with the same `E2E_ACCOUNTS` values, ensuring seeded and logged-in accounts always match.

## Notes

- The `as const` modifier makes `E2E_ACCOUNTS` deeply readonly; any mutation attempt will be a compile-time error.
- Both credentials are intentionally weak (e.g. literal `"password"`) because they exist only in the test environment—never use them to guess production auth.
