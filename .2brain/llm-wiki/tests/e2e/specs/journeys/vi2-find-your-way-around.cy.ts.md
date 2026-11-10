---
source: tests/e2e/specs/journeys/vi2-find-your-way-around.cy.ts
sha256: eb15c803967bb64306180f319318e5ebaa2cec7d89c705aa34903d605ae1060b
signature: ad62604a165d4e273307bd7f6867f339cf4322bffe4c4df72133cf6a916bc569
generated_at: 2026-11-10T07:22:14.353751+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/vi2-find-your-way-around.cy.ts

## Purpose

E2E journey test (VI2) that verifies a signed-out guest can navigate the shop: Home link, logo, footer prose pages, FAQ → contact form, About → catalogue, theme persistence across reload, locale fallback, 404 handling, and the soft-deleted-product edge case. Exists to lock in that no guest-facing route or link leaves the user on a stuck loading state or a wrong page.

## Key elements

- **`STATIC_PAGES`** – Const array mapping the five footer prose slugs (`about`, `faq`, `terms`, `privacy`, `legal`) to their rendered anchor IDs (e.g. `#static-page-about`). Used in a loop to click each footer link and assert the landing page.
- **`describe('VI2 · Find your way around')`** – Single test suite. `beforeEach` resets state via `cy.visit('/en')` → `cy.restore()` → `cy.visit('/en')`.
- **Single `it` block** – Walks through seven `cy.step` sections covering navigation links, cross-page links, theme toggle + reload, unknown locale fallback (`/xx/products` → `/en/products`), missing-locale fallback (`/products` → `/en/products`), 404 page with working Home button, and a soft-deleted product returning a 404 (not a stuck `#product-target` placeholder).
- **`cy.subjectId('product.softDeleted')`** – Retrieves a fixture ID for a product the API reports as deleted, then visits its URL to confirm the 404 path.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- `// requires-module: tasks, products` at the top indicates the test depends on fixtures/seeds from the `tasks` and `products` modules; do not run in isolation without them.
- All element targeting uses `href` or `data-test` attributes; never visible labels. Assertions land on the page's own `id` (e.g. `#home-page`, `#products-list-page`).
- `cy.navigateTo`, `cy.restore`, `cy.step`, and `cy.subjectId` are project-internal custom Cypress commands—check `cypress/support/` for their definitions.
- The final step encodes a regression fix: a soft-deleted product previously left the page showing loading placeholders indefinitely; it must now resolve to the 404 error page.
- The theme assertion checks `.v-application.v-theme--dark`, tying the test to Vuetify's theme mechanism.
