---
source: src/modules/webhooks/tests/e2e/webhooks.cy.ts
sha256: 35f16c0ada0deba025332d40d4bc2426ad5a80f983316a85dab83d5cb120fdfd
generated_at: 2026-10-17T01:51:23.207662+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/tests/e2e/webhooks.cy.ts

## Purpose

Cypress end-to-end spec covering the functional CRUD lifecycle (list, create, edit, delete) of the admin-only webhook subscriptions module. It drives the real UI forms and verifies server-side effects (redirects, toast messages, persistence). Accessibility coverage lives in a separate spec (`a11y.cy.ts`).

## Key elements

- **`unique()`** — generates a per-run unique path (`/e2e-hook-<timestamp>-<rand>`) so concurrent spec runs cannot collide on the same backend resource. Deliberately avoids the substring `dead`, which the test sink treats as a 503 trigger.
- **`describe('List')`** — asserts the subscriptions list page renders its heading (`#webhooks-list-page`, `h1`).
- **`describe('Create')`** — fills the create form (URL, description, event-type multi-select), submits, verifies the one-time signing-secret reveal modal, confirms redirect to the detail page, and checks the created URL appears on the page.
- **`describe('Edit')`** — seeds a subscription via `cy.createWebhookSubscription`, edits its description through the form, confirms the update toast, and reloads to assert the change persisted.
- **`describe('Delete')`** — seeds a subscription, opens the list, triggers the row delete action, confirms the app dialog, verifies the toast and the row's removal.
- **`beforeEach` (top-level)** — visits `/en`, restores fixtures, and logs in as `admin`.

## Relationships

- **`tests/support/e2e/integrator.ts`** — provides `sinkEndpoint(path)`, which resolves a relative path onto the seeded test-sink origin to produce a full URL that the webhook will actually POST to. Called in the Create, Edit, and Delete tests.

## Notes

- Selectors use `data-test` attributes rather than CSS class names or text; custom Cypress commands (`cy.pickOption`, `cy.createWebhookSubscription`, `cy.loginAs`, `cy.restore`) are defined in the support layer.
- The event-type multi-select remains open after a single pick; the spec types `{esc}` on `<body>` to close it before submitting.
- The signing secret modal must be acknowledged (click "confirm saved" → "continue") before the create flow completes and redirects.
- The Delete test sets the page size to 50 first to ensure the seeded row is visible without pagination.
