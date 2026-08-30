# src/modules/feedback/tests/e2e/feedback.cy.ts

## Purpose
Cypress end-to-end spec that exercises the feedback module's full loop—visitor submits the public contact form, admin reads the resulting ticket in the inbox—plus guards (validation, role-based access) and static-page cross-linking. It exists to prove the two pages are wired together and the ticket survives navigation without a reload.

## Key elements
- **`describe('Feedback')`** — Four tests covering the core flow and edge cases:
  - *Form → inbox*: logs in as admin, fills the contact form (email, subject, message), submits, confirms "Message sent", then navigates via the app menu to `/en/feedback` and asserts exactly one inbox item with the typed subject.
  - *Empty-form rejection*: clicks submit with no fields filled, asserts VeeValidate error messages (`.v-messages__message`) appear and no request fires.
  - *Admin-only inbox*: logs in as plain `user`, visits `/en/feedback`, asserts the user is redirected to `#home-page` and `#feedback-inbox-page` is absent.
  - *Guest redirect*: visits `/en/feedback` unauthenticated, asserts the login page renders and the URL carries a `continue=` parameter preserving the intended destination.
- **`describe('Static pages')`** — One test that visits `/en/about`, then clicks through to FAQ, Terms of Service, and Privacy, asserting each `#static-page-*` anchor renders.
- **`beforeEach`** — Visits `/en` and calls `cy.resetState()` to guarantee a clean inbox (the demo profile seeds no tickets, so the form submission *is* the fixture).

## Relationships
No dependency-graph neighbors are recorded for this file. It depends at runtime on custom Cypress commands (`cy.loginAs`, `cy.resetState`, `cy.navigateViaMenu`) and on the application's `data-test` attribute contract; it does not import any project source modules directly.

## Notes
- Selectors are exclusively `data-test` attributes and `#id` anchors—not classes or text-only locators.
- The form→inbox test deliberately uses `cy.navigateViaMenu('admin', '/en/feedback')` instead of `cy.visit()` so the assertion covers in-app navigation and confirms the ticket persisted in client state without a page reload.
- The guest test asserts the `continue=` query parameter; any change to the redirect mechanism (e.g., a different param name) breaks this test silently.
- The static-pages block is colocated here rather than in a separate spec; adding new static pages means extending this single `it`.
