# tests/support/e2e/accounts.ts

## Purpose

Single source of truth for the two demo accounts (user & admin) used across all E2E specs. Centralizing credentials here prevents silent drift between UI-login flows, server-side API calls, and the backend seed script.

## Key elements

- **`E2E_ACCOUNTS`** (exported const) — Object keyed by role (`user`, `admin`), each holding `email` and `password`. Used by `cy.loginAs()` for UI-driven auth and by the `adminApi` task for server-side auth.
- **`E2ERole`** (exported type) — `keyof typeof E2E_ACCOUNTS`, i.e. `"user" | "admin"`. A convenience union for typed role parameters.

## Relationships

- **`tests/support/e2e/commands.ts`** — Defines the `cy.loginAs()` command that reads `E2E_ACCOUNTS[role]` to fill login forms.
- **`tests/support/e2e/fixtures.ts`** — Consumes `E2E_ACCOUNTS` when seeding or referencing the demo identities in test fixtures.
- **`src/modules/account/tests/e2e/auth.cy.ts`**, **`password-reset.cy.ts`**, **`profile.cy.ts`** — Spec files that (directly or via the above helpers) authenticate as the user or admin account defined here.

## Notes

- Values are **literals**, not `cy.env()`. The file header explains that `E2E_ACCOUNTS[role]` is read synchronously in several call sites, while Cypress env access in this project is async-only (`allowCypressEnv: false` in `cypress.config.ts`).
- The credentials **must stay in lock-step** with the backend repo's `src/kernel/seed-accounts.ts` and the `NODE_SEED_ADMIN_PASSWORD` / `NODE_SEED_USER_PASSWORD` env vars in both repos. There is no automated check — a mismatch is a silent breakage.
- The `as const` assertion on `E2E_ACCOUNTS` freezes property types and enables the derived `E2ERole` union.
