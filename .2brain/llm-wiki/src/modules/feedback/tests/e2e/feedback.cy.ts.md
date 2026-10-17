---
source: src/modules/feedback/tests/e2e/feedback.cy.ts
sha256: 1e357c20d6cd71746b8af92e040f3bfe463ed318da303d063c7353a23c129215
generated_at: 2026-10-17T00:56:10.189057+00:00
model: ollama:qwen3.8:27b
---

# src/modules/feedback/tests/e2e/feedback.cy.ts

## Purpose

Cypress end-to-end spec covering the feedback module's full user loop: a visitor submits the public contact form, an admin reads the ticket back in the inbox, and admin-only actions (delete, notes, status change) are exercised through the real UI. It also verifies route guards (admin-only, guest redirect) and the static-page cross-link chain (About → FAQ → Terms → Privacy). The contact form doubles as the test fixture because the demo profile seeds no tickets.

## Key elements

- **`describe('Feedback', …)`** — the main suite. Each test follows the pattern: `cy.loginAs` → fill form → submit → navigate to inbox → assert.
- **`describe('Static pages', …)`** — single test that visits `/en/about` and clicks through to FAQ, Terms, and Privacy to confirm cross-linking.
- **`cy.restore()`** (in `beforeEach`) — custom command that resets app state before every test.
- **`cy.loginAs(role)`** — custom command that authenticates as `'admin'` or `'user'`.
- **`cy.textareaIn(label)`** — custom command that locates a textarea by its associated label text.
- **`cy.navigateViaMenu(area, path)`** — custom command that drives navigation through the app's own menu rather than `cy.visit`, testing that routes are wired.
- **`cy.intercept` + `cy.wait` pairs** — used in the delete, notes-save, and notes-clear tests to assert exact request methods, paths, bodies, and response codes.
- **`data-test` attributes** — all selectors are stable `data-test` hooks (e.g. `contact-email`, `feedback-item`, `feedback-notes-save`), not text or class-based.

## Relationships

No graph neighbors are recorded for this file. It imports no project modules; it talks to the running app exclusively through the browser and intercepted HTTP endpoints (`POST /feedback`, `PATCH /feedback/*`, `DELETE /feedback/*`, `POST /feedback/search`).

## Notes

- **Honeypot test uses `{ force: true }`** — the `contact-website` field is hidden by design; standard Cypress refuses to type into invisible elements, so `force` is required to simulate bot autofill.
- **Navigation is deliberate, not incidental.** Tests use `cy.navigateViaMenu` between form and inbox to prove the two pages are linked in-app, not just reachable by URL.
- **Delete-confirmation is a two-step dialog.** The decline test (`app-dialog-cancel`) exists specifically to guard against an accidental single-click delete.
- **Clearing notes must send `null`, not `""`.** The backend PATCH rule rejects empty strings; the test asserts the wire body is exactly `{ adminNotes: null }`.
- **Admin-only test asserts destination, not absence.** It checks `#home-page` exists and a `v-alert[role=status]` is visible, so a blank error page would not pass silently.
- **Guest test checks `continue=` in the URL**, confirming the login page preserves the intended destination.
- **Empty-form test verifies no request fires.** It asserts `@feedbackSubmit.all` has length 0 after the click, confirming validation is purely client-side.
