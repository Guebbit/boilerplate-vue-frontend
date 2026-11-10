---
source: tests/e2e/specs/journeys/ps1-a-preorder-product-in-the-form.cy.ts
sha256: 9a9d859603ec41e7a9c34e0b39ff9ed71ef7b5fff1e55ec26a45df826f68e95e
signature: 08692e00c7f560c82498f81120125887fa77fc84db29db26132fffc1acc4c980
generated_at: 2026-11-10T07:20:19.253796+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ps1-a-preorder-product-in-the-form.cy.ts

## Purpose

Cypress E2E spec for the PS1 journey: verifying that setting a future release date turns a product into a preorder, that changing the date is a simple field edit, and that clearing the date removes the preorder state entirely. Exists to lock in the editor-facing contract for the preorder toggle driven by the release-date field.

## Key elements

- **`unique()`** — local helper that returns a `${Date.now()}-${rand}` string; appended to product names so parallel runs on one backend don't collide.
- **`describe('PS1 · An editor sells something before it exists')`** — the single test suite. `beforeEach` visits `/en`, calls `cy.restore()`, then visits `/en` again to reset state.
- **`it('a future date makes a preorder, moving it keeps one, clearing it ends it')`** — the sole test case. Drives the full lifecycle: create product with a 60-day-out date → assert preorder badge and hint → change date to 120 days out → assert the new value persists → clear the date → assert the product page and edit form no longer show preorder UI.

## Relationships

- **`tests/support/e2e/steps.ts`** — provides the two helpers this spec imports:
  - `createProductThroughTheForm(name, releaseDate)` — drives the form to create a product and yields its ID.
  - `releaseDateIn(days)` — returns a `YYYY-MM-DD` string offset by the given number of days.

## Notes

- The header comment states this spec was *written against the live form but not yet executed in a browser*; selectors (especially the date input) may need nudging on first run.
- All assertions target `data-test` attributes (`product-release-date`, `product-release-date-field`), not visible text or CSS classes.
- The date field is typed as a single `YYYY-MM-DD` string into one `<input>`, not three separate parts.
- Form submission is done via `cy.get('form').first().submit()` rather than clicking a specific button, and success is confirmed by the "Product updated successfully" toast.
