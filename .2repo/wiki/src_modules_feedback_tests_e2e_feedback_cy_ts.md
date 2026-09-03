# src/modules/feedback/tests/e2e/feedback.cy.ts

## Purpose

Cypress end-to-end spec that exercises the feedback module's full user loop: submitting the public contact form and verifying the resulting ticket in the admin inbox. It also covers spam/honeypot detection, ticket deletion (and cancellation), form validation, role-based access control, and the static-page cross-linking that anchors the contact page. The inbox is intentionally empty at test start — the form submission *is* the fixture.

## Key elements

- **`describe('Feedback')`** — main block; `beforeEach` visits `/en` and calls `cy.resetState()`. Contains six tests:
  - *Form → inbox round-trip* — fills email/subject/message via `data-test` selectors, asserts the success toast, navigates to the inbox through `cy.navigateViaMenu('admin', '/en/feedback')`, and confirms exactly one ticket with the correct subject.
  - *Honeypot → spam* — fills the invisible `[data-test=contact-website]` field with `{ force: true }`, asserts the same "Message sent" toast a real user sees, then verifies the inbox item carries a "Spam" status badge.
  - *Delete ticket* — intercepts `GET **/feedback*` to bust the 30 s `Cache-Control` header, clicks delete + confirm dialog, waits on the intercept alias, then asserts the inbox is empty and a "Ticket deleted" toast appears.
  - *Decline delete* — opens the confirm dialog, clicks cancel, asserts the ticket is still present.
  - *Empty-form validation* — submits without filling fields, asserts VeeValidate `.v-messages__message` errors render (no network request).
  - *Access control* — two tests: a `user` role lands on `#home-page` (not a blank error), and a guest is redirected to `#login-page` with a `continue=` query param.

- **`describe('Static pages')`** — one test that visits `/en/about`, follows links to FAQ, Terms, and Privacy, asserting each target page's root element and (for FAQ) the `[data-test=faq-entries]` container.

## Relationships

No graph neighbors are recorded for this file. It is a leaf test spec; it depends at runtime on the Cypress custom commands (`cy.resetState`, `cy.loginAs`, `cy.navigateViaMenu`) and the application under test, but has no static imports or exports.

## Notes

- The honeypot field (`[data-test=contact-website]`) is hidden from real users; Cypress must use `{ force: true }` to type into it — omitting that option causes a test failure, not a silent skip.
- The delete test explicitly intercepts `GET **/feedback*` (trailing `*` matches the cache-busting `_` query param added by the `fetchRequests` helper). The wait is on the intercept alias, not on the subsequent `.should()` assertion, so a regression in the network layer fails on the `cy.wait` line rather than timing out ambiguously.
- Navigation to the inbox is always via `cy.navigateViaMenu` rather than `cy.visit`, deliberately exercising the app's own routing to catch broken navigation wiring.
- All DOM targeting uses `data-test` attributes, not CSS classes or text, except for the VeeValidate error assertion (`.v-messages__message`) which has no `data-test` hook.
- The static-pages test lives in this file (not a separate spec) because it is the "landing" context for the contact form; it is cheap to co-locate.
