---
source: tests/e2e/specs/journeys/ps1-a-preorder-product-in-the-form.cy.ts
sha256: c91e13cf0382c25462d7df9aaaa1d475eda18acd76ed436760c8b09adfd2224b
generated_at: 2026-10-17T02:22:14.624321+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ps1-a-preorder-product-in-the-form.cy.ts

## Purpose

E2E journey test (PS1) that verifies the preorder lifecycle driven entirely through the product edit form: setting a future release date turns a product into a preorder, changing the date is a plain edit that persists, and clearing the date ends the preorder. Written as a single spec covering create → verify → edit → clear.

## Key elements

- **`unique()`** – Returns a `Date.now()` + random-suffix string so product names are collision-free when multiple specs share one backend.
- **`beforeEach`** – Visits `/en`, calls `cy.restore()` (DB reset), then re-visits to establish a clean session.
- **`it('a future date makes a preorder…')`** – The sole test case. Steps through:
  1. Creates a product via the form with `releaseDateIn(60)`.
  2. Asserts the product page shows the release date (`data-test=product-release-date`).
  3. Verifies the edit form displays the "preorder" hint.
  4. Changes the date to `releaseDateIn(120)`, submits, and confirms the new value persists.
  5. Clears the date, submits, and confirms the date is gone from both the product page and the edit-form hint.

## Relationships

- **`tests/support/e2e/steps.ts`** – Imports `createProductThroughTheForm` (creates a product via the UI and resolves its ID) and `releaseDateIn` (formats a future date for the `datetime-local` input).

## Notes

- The file header explicitly states it has **not yet been run in a browser**; the first real run may require selector adjustments, particularly around the `datetime-local` input which is typed as a single string.
- Selectors rely on `data-test` attributes (`product-release-date`, `product-release-date-field`) rather than CSS classes or structure.
- `cy.step(...)` calls are descriptive milestones for step-based reporting; they have no functional side-effects.
- The `requires-module: account, products` comment at the top indicates this spec depends on the account and products feature modules being available in the test environment.
