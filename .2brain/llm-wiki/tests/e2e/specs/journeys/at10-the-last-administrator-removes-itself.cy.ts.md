---
source: tests/e2e/specs/journeys/at10-the-last-administrator-removes-itself.cy.ts
sha256: 86b7567f68f9ba42b5cca494b518c911c012834cc780e61683f2f68369eb742b
signature: 86b7567f68f9ba42b5cca494b518c911c012834cc780e61683f2f68369eb742b
generated_at: 2026-11-10T06:49:55.478327+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/at10-the-last-administrator-removes-itself.cy.ts

## Purpose

End-to-end test for the AT10 journey: the shop's sole administrator deactivates their own account through the "manage access" UI. The test verifies that the lock-out is immediate and irreversible through the application — the session drops, login is refused, admin-only pages close to remaining staff, the moderator cannot reassign the `admin` role, and no in-app repair path exists.

## Key elements

- **`beforeEach`** — Visits `/en`, calls `cy.restore()` to reset database state, then re-visits `/en` to clear any stale session.
- **Single `it` block** — Sequentially exercises five `cy.step` phases:
  1. Admin unchecks the "active" toggle, confirms the self-lock-out warning, POST to `/users/:id/deactivate` returns 200.
  2. Navigating to `/en/users` bounces back to `#login-page`.
  3. Submitting the admin's own credentials shows `[data-test=login-error]` and stays on `/login`.
  4. Moderator is turned back from `/en/api-keys` (admin-only) and receives **403** when attempting `POST /users/:id/assign-role` with `role: 'admin'`; a GET confirms the customer's role is `undefined`.
  5. The admin's profile page no longer exposes edit or manage-access controls; moderator's `POST /users/:id/activate` returns **403**; GET confirms `active: false`.
- **`requires-module: account, api-keys, users`** — Comment declaring which feature modules this spec depends on (used by the test harness for selective runs).

## Relationships

- **`tests/support/e2e/harness.ts`** — Supplies `loginDevice` (obtains an authenticated API device/token for a role) and `requestAsDevice` (issues a raw HTTP request with that device's credentials). Both are used for the API-level 403 assertions that the UI cannot express.
- **`tests/support/e2e/steps.ts`** — Supplies `isTurnedBack(url)`, a helper that visits a URL and asserts the session is not authorized (redirects to login). Used to confirm the moderator is shut out of `/en/api-keys`.

## Notes

- The test is deliberately **one-directional**: it asserts the absence of repair paths (no edit control, no `activate` endpoint permission) rather than testing a recovery flow. This encodes the product decision that a locked-out shop is fixed out-of-band in the database.
- `cy.get('…').uncheck({ force: true })` is used because the active-state checkbox may be in a disabled/readonly context after the admin navigates to their own profile; `force` bypasses Cypress's actionability check.
- `cy.restore()` is a project-specific command (likely defined in the harness or a plugin) that resets the seeded database between tests — not standard Cypress.
