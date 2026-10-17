---
source: src/modules/example/tests/e2e/example.cy.ts
sha256: 585d74c6cbe013507b55485208f1566c452fbd284a9483d50d7fa97b117a6951
generated_at: 2026-10-17T00:52:21.592570+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/tests/e2e/example.cy.ts

## Purpose

Cypress end-to-end spec that drives the real application to verify the example module's full lifecycle: seeded-data visibility (per role and status filter), create → publish → public-read, edit, and delete. It exists to catch regressions across the frontend, routing, and backend in one integrated flow.

## Key elements

- **`unique()`** — Returns a timestamp+random string used to make test-created titles collision-resistant when specs run concurrently against the same backend.
- **`beforeEach`** — Visits `/en` and calls `cy.restore()` to reset the backend to its seeded scenario (customer: 3 examples across statuses; admin: 1 published example) before every test.
- **`describe('Who sees what')`** — Verifies role-based list visibility (customer sees only their own; admin sees all) and that the status filter (`Archived`) narrows results correctly.
- **`describe('Write, publish, read')`** — Covers the create-draft → one-click-publish → public-page flow, and asserts that a draft URL returns a 404/error page for non-owners.
- **`describe('Edit and delete')`** — Exercises the title-edit form (with a "Example updated" confirmation) and the row-level delete flow (with a confirm dialog and "Example deleted" feedback).

## Relationships

No dependency-graph neighbors are registered for this file. It interacts with the application under test (the example module's routes and API) purely at runtime via Cypress commands, not via static imports.

## Notes

- Tests rely on **hardcoded seeded IDs** (e.g. `65e1a0000000000000000e02`) and fixed titles from the backend's demo scenario. If the seed data changes, these assertions break silently (they'll simply not find the row).
- `cy.restore()` is a **custom command** (not built-in Cypress); it resets server state. It must be registered in the project's `support` commands or the spec will fail.
- `cy.loginAs` and `cy.pickOption` are likewise custom commands; their behavior is defined elsewhere in the test support files.
- The "stranger reads a published example" test extracts the ID from the URL path after creation, so it does not hardcode the new resource's ID—only the pre-seeded ones are static.
- Selectors use a mix of `data-test` attributes and semantic selectors (`#examples-list-page`, `form button[type=submit]`); there is no single naming convention enforced here.
