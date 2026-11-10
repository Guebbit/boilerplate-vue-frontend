---
source: tests/e2e/specs/sitemap-addresses.cy.ts
sha256: ea92bdd86ebc0877d61a6edac887a8b828b835ab370192e951b0339ebce4738a
signature: a51ce63650d98e2819304f6c3fae22a066565da68a5a327ab616f3b8e0410dc9
generated_at: 2026-11-10T07:24:24.719713+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/sitemap-addresses.cy.ts

## Purpose

Cypress e2e test that verifies every URL listed in the backend's sitemap (`/sitemap/pages.xml` and the first products file referenced by `/sitemap/index.xml`) resolves to a real, indexable page in the frontend. It catches the case where a frontend route was renamed but the backend's page list or product-link template still points at the old name.

## Key elements

- **`PRODUCT_PAGE_LIMIT`** (`const`, 6) — caps how many product URLs are actually visited; a single products file can hold up to 50 000 entries and each visit is a full page load.
- **`pathsOf(xml)`** — extracts the unique set of `pathname` values from every `<loc>` element in an XML sitemap string (origin is discarded via `new URL`).
- **`expectIndexablePage(path)`** — visits `path` via `cy.visit`, then asserts: `<main>` exists, the final pathname does not contain `/error/`, and there is **no** `<meta name="robots">` element in `<head>`.
- **`describe("The sitemap")` → single `it`** — fetches `pages.xml`, asserts `/en` is present (guard against an accidentally empty list), visits every page path, then resolves the first `/sitemap/products-*` file from `index.xml` and visits up to `PRODUCT_PAGE_LIMIT` product paths. If no products file exists (empty catalogue), it exits early.

## Relationships

No graph neighbors. This file has no import-level dependency on other project modules.

## Notes

- `<loc>` URLs carry the backend's `NODE_FRONTEND_URL` origin. The test strips the origin and visits only the pathname against the *test* origin, so a mismatch in origins is transparent.
- `expectIndexablePage` asserts the **complete absence** of `<meta name="robots">`, not merely the absence of `noindex`. If the app ever emits a robots meta for another directive, this assertion will fail even though the page is still indexable.
- The products-file lookup is `files.find(address => address.includes('/sitemap/products-'))` — it takes the *first* match. If the index lists multiple products files, only the first is exercised.
- `cy.env(['apiUrl'])` is used rather than a hardcoded host, so the test follows the same API target as the rest of the e2e suite.
