---
source: src/modules/products/tests/e2e/locale.cy.ts
sha256: 37df46bade003dff2f073b62a42c635a7049f04be83135b484c493d077cfac81
signature: 37df46bade003dff2f073b62a42c635a7049f04be83135b484c493d077cfac81
generated_at: 2026-11-10T05:23:14.095429+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/e2e/locale.cy.ts

## Purpose

E2E specs that live in the products module rather than the central `tests/e2e/specs/locale.cy.ts` because both scenarios are product-specific at the **data** level: they exercise `useProductsStore`'s locale-keyed cache and a backend-seeded Spanish override that only the products list page renders. Moving them to a foundation page would require reseeding demo data that belongs to this module.

## Key elements

- **`describe('switching language drops and refetches locale-sensitive stores')`** — Verifies that an in-place language switch (EN → IT → EN) on the `products/:id` route invalidates and refetches the product record so the visible title matches the active locale, and the old-language title is absent. Guards against an implementation that only clears the cache on navigation, not on the switch itself.
- **`describe('a locale only the API has')`** — Two cases for the `es` locale, which has no `.env` entry and no `src/locales/es.json`:
  - *Per-key fallback rendering*: asserts that the heading and "Restablecer" button appear in Spanish (supplied by the API overlay) while the adjacent "Search" button falls back to English, all on one rendered page.
  - *Runtime dictionary download*: uses the browser's `performance.getEntriesByType('resource')` to prove the switcher triggered a `GET /locales/es/messages` request and that no such request existed before the user chose Spanish.
- **`cy.createProduct({ translations: … })`** — helper (from the test support layer) that seeds a product with per-locale titles so the test controls the exact strings it asserts on.

## Relationships

No graph neighbors are recorded for this file. It has no recorded imports or dependents in the dependency graph.

## Notes

- **Why it can't move:** `useProductsStore` keys its dictionary by product id alone; the locale binding is implicit via `dependsOn`. No foundation module holds server text in that shape, so there is no alternate home.
- **Resource-timing buffer:** the download test calls `performance.setResourceTimingBufferSize(10_000)` first; the default 250-entry buffer is normally flooded by the dev server's module loads and would silently drop the entry under test.
- **Download assertion strategy:** the test reads the browser's own resource-timing entries rather than using `cy.intercept`, so the assertion is true only if the page actually performed the request (an interception the app never made cannot pass).
- **`es` is not "deployed":** no locale file exists in `src/locales/`; the language reaches the switcher solely because the API manifest announces it at boot, and its strings arrive via a runtime `GET /locales/es/messages` merge.
