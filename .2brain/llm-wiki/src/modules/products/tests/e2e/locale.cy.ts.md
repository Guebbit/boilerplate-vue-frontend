---
source: src/modules/products/tests/e2e/locale.cy.ts
sha256: c8b3064af59f5dd0fa4bc377ad271357ffb0f1aac4e5d55703e55ee9ec3cba22
generated_at: 2026-10-17T01:29:24.411109+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/e2e/locale.cy.ts

## Purpose

End-to-end tests that exercise locale-specific behavior unique to the products module: (1) the product store's locale-scoped cache must be dropped and refetched on an in-place language switch (no navigation), and (2) a locale that the API serves but the app does not bundle (`es`) must activate, render with per-key English fallback, and trigger a runtime dictionary download. Both cases were extracted from the central `tests/e2e/specs/locale.cy.ts` because they depend on product-level data (per-product translations, backend-seeded Spanish overrides) that no foundation page can substitute.

## Key elements

- **`describe('switching language drops and refetches locale-sensitive stores')`** — Creates a product with `en` and `it` title translations, visits the product page in English, clicks the language switcher to Italian, and asserts the Italian title appears while the English one is gone (and vice-versa on switch-back). Verifies the store's `dependsOn` locale keying forces a refetch on switch, not just on route change.
- **`describe('a locale only the API has')`** — Three assertions across two tests:
  - Visits `/es/products`, confirms `html[lang=es]`, and checks that Spanish strings the backend override carries (`Catálogo de productos`, `Restablecer`) render while the nearby search button falls back to the bundled English `Search`.
  - Switches to Spanish from `/en` and uses `performance.getEntriesByType('resource')` (after bumping `setResourceTimingBufferSize` to 10 000) to assert the browser actually issued `GET /locales/es/messages` at runtime.

## Relationships

No graph neighbors are recorded for this file. It is a leaf e2e spec that imports only Cypress and (implicitly) the app's test factories (`cy.createProduct`, `cy.restore`).

## Notes

- **Resource-timing assertion instead of `cy.intercept`.** The download test deliberately avoids `cy.intercept` so the proof is the browser's own network log: it cannot pass if the app never performed the request, regardless of how routing is wired.
- **Buffer-size bump.** `performance.setResourceTimingBufferSize(10_000)` is set before the switch because the dev server's module-load requests overflow the default 250-entry buffer and would silently drop the `/locales/es/messages` entry.
- **`es` is not a deployed locale.** There is no `src/locales/es.json` and `es` appears in no `.env` list. It is reachable only because the boot manifest announces it and the backend seeds a two-key override (`products-list-page.page-title`, `generic.reset`). Removing either of those overrides from the backend would break the per-key-fallback assertion.
- **`cy.restore()` in every `beforeEach`.** The tests mutate global state (created products, locale overrides); the restore call is required to keep the suite order-independent.
