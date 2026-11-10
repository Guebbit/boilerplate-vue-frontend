---
source: src/modules/example/tests/e2e/example.cy.ts
sha256: 3700d77229af199ebd4603de156eb415b3bf9870cdf476b246d9f8a9c80f1cbe
signature: a2be4b20443deef2522d1711b336cf123e6407e307071bc294a0f161a1034f07
generated_at: 2026-11-10T04:24:24.542484+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/tests/e2e/example.cy.ts

## Purpose

Cypress end-to-end spec that drives the example module's full user loop against the real running app: role-based list visibility, the draft → publish → read → archive lifecycle, and edit/delete. It verifies what each role (editor, admin, anonymous stranger) can see and do, using the backend's seeded demo data as a known starting state.

## Key elements

- **`unique()`** – Local helper that returns a `Date.now()` + random-suffix string, used to make created/renamed titles collision-safe when specs race the same backend.
- **`describe('Example')`** – Top-level suite; `beforeEach` visits `/en` and calls `cy.restore()` (a custom command that resets the seeded dataset).
- **"Who sees what"** – Three tests asserting role-based row visibility (editor vs. admin) and the status filter narrowing the list.
- **"Write, publish, read"** – The full lifecycle test: create a draft via the form, publish it, verify an anonymous session can read the published page, then archive it and confirm the "Withdrawn" badge. A companion test asserts a seeded draft returns a 404/error page for an anonymous visitor.
- **"Edit and delete"** – Renames a seeded example via the edit form and deletes another via the in-row delete button + confirmation dialog.

## Relationships

No graph neighbors are registered for this file.

## Notes

- **Hardcoded IDs.** Several tests target seeded records by Mongo-style ObjectId (e.g. `65e1a0000000000000000e02`). If the seed data changes, these break silently—update them in lockstep with the backend fixture.
- **Custom Cypress commands.** `cy.loginAs(role)`, `cy.restore()`, and `cy.pickOption(selector, value)` are not standard; they live in a shared support file outside this spec.
- **Status filter interaction.** `cy.pickOption` is used on `[data-test=filter-status]`; it likely triggers a client-side or server-side refetch—assertions immediately after assume the DOM has already updated.
- **No explicit cleanup.** Created/renamed/deleted records rely on `cy.restore()` in `beforeEach` rather than per-test teardown; a test that fails mid-body can leave stray documents visible to the *next* test's `beforeEach` restore.
