---
source: src/modules/webhooks/tests/e2e/webhooks.cy.ts
sha256: 35f16c0ada0deba025332d40d4bc2426ad5a80f983316a85dab83d5cb120fdfd
signature: 60bfc50d2867b94cca912978ca38f0deace36adce80cde69822e3afbec108e25
generated_at: 2026-11-10T06:14:47.258849+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/tests/e2e/webhooks.cy.ts

## Purpose

Cypress end-to-end spec that exercises the admin-only webhook subscriptions module through the real UI: listing, creating, editing, and deleting subscriptions. It is the functional counterpart to the separate accessibility spec (`a11y.cy.ts`).

## Key elements

- **`unique()`** — local helper that builds a per-run-unique path (`/e2e-hook-<timestamp>-<rand>`), avoiding the substring "dead" (which makes the sink return 503). Used to seed distinct webhook URLs across concurrent spec runs.
- **`describe('List')`** — verifies the subscriptions index page renders its title and heading.
- **`describe('Create')`** — fills the create form (URL from `sinkEndpoint`, description, event-type multi-select), closes the multi-select with `{esc}`, submits, confirms the one-time signing-secret modal, and asserts the resulting detail page.
- **`describe('Edit')`** — seeds a subscription via `cy.createWebhookSubscription`, then edits the description through the form and confirms the value persists after a reload.
- **`describe('Delete')`** — seeds a subscription, locates its list row, clicks the row's delete action, confirms the app dialog, and asserts the row is gone.
- **`beforeEach` (top-level)** — visits `/en`, restores a clean state, and logs in as `admin` before every test.

## Relationships

- **`tests/support/e2e/integrator.ts`** — provides `sinkEndpoint(path)`, which resolves the generated path onto the seeded sink's origin and returns a ready-to-use webhook URL used in the Create, Edit, and Delete specs.

## Notes

- The event-type multi-select stays open after selecting an option; an explicit `{esc}` keypress on `body` is required before the form submit, or the submit click will be swallowed.
- The signing secret is displayed **exactly once** in a modal at creation time. The test must click through the "confirm saved" input and the "continue" button before proceeding.
- Selectors use `data-test` attributes (e.g. `data-test=webhook-url`, `data-test=list-row`, `data-test=row-delete`), not CSS class names.
- The `unique()` helper deliberately avoids the substring "dead" in the path because the sink interprets it as a trigger for a 503 response.
