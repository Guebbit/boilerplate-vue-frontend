# src/modules/account/tests/e2e/a11y.cy.ts

## Purpose

Co-located accessibility (a11y) e2e test for the account module. It declares which routes and UI states to audit; the actual sweep mechanism lives in the shared support module. Co-location ensures deleting the account module also removes its a11y coverage, preventing a stale central route list.

## Key elements

- **`UNISSUED_TOKEN`** — Sentinel token (`'a-token-nobody-issued'`) appended to confirm-page URLs so they render in their "expired link" state (form visible, token prefilled, other fields empty) without consuming a real one-time token.
- **`sweepA11y('account — guest', […])`** — Audits six guest-facing routes: login, signup, password reset, three confirm pages (password-reset, account-delete, verify-email), plus two special states: dark-theme login and login with a submitted-empty error.
- **`sweepA11y('account — signed in', […], 'user')`** — Audits the profile page and the address-dialog-open state, running under a `user` session.

## Relationships

- **`tests/support/e2e/a11y-sweep.ts`** — Provides the `sweepA11y` function that iterates the route/state list and runs the actual a11y assertions. This file only supplies the data.
- **`tests/cross-cutting/a11y-coverage.spec.ts`** (referenced in the module doc comment) — Asserts that every routed module has a co-located a11y file like this one, so the split cannot silently lose a domain.

## Notes

- Confirm pages cannot use real tokens because flow specs spend them and a sweep cannot mint new ones. The unissued token is intentional: it exercises the same DOM a visitor with an expired link sees.
- Two states use a `prepare` callback to drive the UI into a specific interaction state before auditing: submitting the login form empty (to audit inline error announcements tied to fields) and opening the address dialog (to audit modal naming, focus containment, and background inert-ness).
- The file contains no test assertions of its own; all checking is delegated to the `sweepA11y` implementation.
