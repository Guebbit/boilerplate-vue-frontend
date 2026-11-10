---
source: src/modules/tasks/tests/e2e/tasks.cy.ts
sha256: 7064afd559595e4fa073393f39f751120fc475aaafc063f206f625c0907f034f
signature: 7064afd559595e4fa073393f39f751120fc475aaafc063f206f625c0907f034f
generated_at: 2026-11-10T05:59:06.412452+00:00
model: ollama:qwen3.8:27b
---

# src/modules/tasks/tests/e2e/tasks.cy.ts

## Purpose

Cypress end-to-end spec that exercises the full tasks-module loop against the running app: a visitor (or bot) submits the public contact form, then an admin reads, annotates, assigns, resolves, or deletes the resulting task on the admin inbox page. It also covers route-guard behaviour (admin-only, guest redirect) and cross-linking on the static pages. The inbox is intentionally empty at the start because the demo profile seeds no tasks — the form submission *is* the fixture.

## Key elements

- **`describe('Tasks')`** – top-level suite; `beforeEach` visits `/en` and calls `cy.restore()` to reset app state.
- **`a message sent through the form lands in the inbox`** – fills email/subject/message via `data-test` selectors, clicks submit, asserts the success banner, then navigates to `/en/tasks` and verifies exactly one task item with the correct subject.
- **`a submission caught by the honeypot lands in the inbox already marked spam`** – fills the hidden `contact-website` field with `{ force: true }`, submits, and asserts the task appears with a "Spam" status badge.
- **`an admin can permanently delete a task…`** – intercepts `DELETE **/tasks/*`, clicks delete + confirm dialog, asserts `204`, zero items, and that a page reload does not resurrect the row (inbox reads via `POST /tasks/search`, which is uncached).
- **`an admin can add a note on the detail page…`** – opens task detail, types a note, intercepts `POST **/tasks/*/notes`, asserts request body shape, then reloads to confirm server-persisted text.
- **`taking a task assigns it to the viewer…`** – clicks "Take" and asserts the `task-assignee` element appears.
- **`resolving a task records and shows when it was responded to`** – clicks "Resolve", asserts status text and the presence of `task-responded-at` (set by the backend, never by the UI).
- **`declining the delete confirmation leaves the task in place`** – clicks delete then cancel; item count remains 1.
- **`rejects an empty form with field errors, not a request`** – clicks submit on an empty form, asserts Vuetify `.v-messages__message` exists and that zero `POST /tasks` requests were intercepted.
- **`the inbox is admin-only…`** – logs in as `user`, visits `/en/tasks`, asserts redirect to `#home-page` with a visible `v-alert` and that no `POST /tasks/search` was ever fired.
- **`the inbox asks a guest to log in, keeping the target`** – unauthenticated visit to `/en/tasks` lands on `#login-page` with `continue=` in the URL.
- **`describe('Static pages')`** – navigates About → FAQ → Terms → Privacy → Legal via anchor links, asserts each page root id, and reads `legalName` from `GET /config` to verify the operator-identity field.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- **`cy.restore()`** in `beforeEach` is a project-level custom command that resets the backend/app state; every test assumes a clean inbox.
- **Honeypot field** is invisible by design; `cy.type(..., { force: true })` is required and is the *only* legitimate use of `force` in this spec.
- **`cy.textareaIn`** is a custom command wrapping the Vuetify `v-textarea` selector pattern; it is not a native Cypress API.
- **Caching asymmetry:** the inbox list uses `POST /tasks/search` (uncached), while a hypothetical `GET /tasks` has a 30-second `max-age`. The delete test reloads to prove the row is gone from the server, not just the DOM.
- **`task-responded-at`** is never sent by this UI; it is populated server-side on first resolve. The test only asserts its *presence*, not its value.
- **Route-guard tests** assert the *absence* of an API call (`@inboxSearch.all` length 0) in addition to the visible UI state, because a blank error page would satisfy a DOM-only assertion.
- **Static-page test** reads `legalName` from `GET /config` rather than hard-coding it, because the operator name is a deployment-level env value (`NODE_LEGAL_NAME`).
