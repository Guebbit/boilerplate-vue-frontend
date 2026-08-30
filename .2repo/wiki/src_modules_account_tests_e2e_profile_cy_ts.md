# src/modules/account/tests/e2e/profile.cy.ts

## Purpose

Cypress end-to-end specs for the self-service profile page (language preference, role, password change, sessions, address book, email verification). They run against the real API in its demo profile so the backend invariants (one default address, a `current` session flag, unverify-on-email-change) are the service's own; the tests pin the page's honouring of those invariants rather than re-testing the rules themselves.

## Key elements

- **`fillAddress(label, street)`** — Fills the six inputs in the address dialog (label, name, street, ZIP, city, country) via `data-test` selectors and clicks save. Used by the address-book specs.
- **`loginFromAnotherDevice()`** — Creates a second real session server-side via `cy.task('createSession', …)` (task defined in `cypress.config.ts`) so the page's own refresh cookie and `current` flag stay intact. Returns a boolean the caller asserts with `expect`.
- **`describe('Profile access')`** — Guest redirect to login (with `continue=` preserved) and rejection of a never-issued verification token (422 path).
- **`describe('Profile self-service')`** — Main block, gated by `beforeEach` → `cy.loginAs('user')` + visit `/en/profile`. Sub-suites:
  - *language preference* — Saves a locale, asserts the `:locale` URL segment switches, and that a fresh `loginAs` lands in the chosen language (record-driven, not URL leftover).
  - *role* — Non-admin sees no role control; admin sees it, submit is disabled until changed, self-demotion asks confirmation (declined to preserve the fixture).
  - *password change* — Happy path with the fixture's real password; wrong-password path asserts an "Unprocessable Entity" toast and that the session survives.
  - *sessions* — Lists two sessions with exactly one `current`; revokes the non-current one and asserts the list shrinks.
  - *address book* — Seeded default persists after adding a second entry; promote moves the default slot; removing the default auto-promotes the survivor.
  - *email verification* — No banner for a verified seed; changing the email re-verifies (spec truncated in source).

## Relationships

No graph-neighbour files are recorded. The file references, by comment or import, the following external pieces it depends on at runtime:

- `cypress.config.ts` — provides the `createSession` task.
- `cy.loginAs`, `cy.resetState` — custom Cypress commands (defined elsewhere in the `cypress/` support files).
- `registration.cy.ts` — owns the happy-path "token comes from a real signup email" case; this file only covers the negative/forged-token path.

## Notes

- All DOM targeting uses `data-test` attributes; Vuetify overlays are selected structurally (`.v-overlay-container .v-list-item`).
- The demo fixture user is `gino@pino.it` / `password`; the new-password test value must satisfy `usersPasswordSchema` (the form reveals validation errors rather than keeping submit disabled).
- `loginFromAnotherDevice` is deliberately server-side: a second *browser* login would clobber the page's refresh cookie and make the `current` flag assertion meaningless.
- The role spec intentionally **cancels** the demotion dialog so the shared admin fixture remains an admin for the rest of the run.
- App-level confirmation dialogs (`[data-test=app-dialog-confirm]`) are distinct from native `confirm()`; Cypress auto-accepts only the latter, so the spec clicks the custom button explicitly.
- The happy-path email-verification test lives in `registration.cy.ts` (token sourced from a real outbox email); this file only exercises the forged-token 422 path.
