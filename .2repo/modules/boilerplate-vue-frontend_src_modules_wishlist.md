---
tags:
  - 2repo
  - 2repo/module
  - project/boilerplate-vue-frontend
type: module
module: src/modules/wishlist/
files: 12
updated: 2026-09-03T11:00:08.158482+00:00
---

# src/modules/wishlist/

## Purpose

The wishlist module lets a logged-in visitor save, browse, and manage a list of products. It provides a single authenticated route, a Pinia store that mirrors server state, and a page view that displays saved items with move-to-cart and remove actions. The module is self-contained: registering itself, its routes, its response contracts, and its tests all live inside this directory.

## Key parts

- **`module.ts`** — The module manifest. Registers the wishlist's route, navigation entry, response schemas, and locale loaders with the app's `AppModule` registry so the app can discover and mount the feature without hard-coded references.
- **`store.ts`** — Pinia setup-store holding the visitor's saved products. Every mutation (add, remove, move-to-cart) discards the local list and replaces it wholesale with the API payload; no optimistic local state. Exposes the item list, an O(1) "is saved?" check, and four API-backed actions.
- **`views/Wishlist.vue`** — The page view. Renders saved product lines, joins each ID against the cart store's title cache for a readable name, and offers per-item move-to-cart / remove actions. Handles the empty state with a CTA back to the product listing.
- **`response-schemas.ts`** — Declarative endpoint-to-schema table consumed by the HTTP layer for runtime contract validation of outbound responses.
- **`routes.ts`** — Declares the single authenticated wishlist route, decoupling it from the central Vue Router config.
- **`index.ts`** — Public barrel that re-exports `useWishlistStore` so sibling modules (notably `products`) can call the heart-toggle API without reaching into internal file paths.
- **`tests/`** — Co-located test suite covering e2e flow, accessibility sweep, visual regression, route security, store integration, and view rendering. Deleting the module automatically removes its coverage.

## How it connects

- **`src/infrastructure/`** — Supplies the HTTP/orval-generated client the store calls for every mutation, the `AppModule` registry that `module.ts` registers with, and the response-envelope validation layer that reads `response-schemas.ts` at runtime.
- **`tests/support/`** — Provides the shared a11y sweep utility (fed by `tests/e2e/a11y.cy.ts`) and the visual-sweep harness (fed by `tests/e2e/wishlist.visual.cy.ts`), so the wishlist tests stay thin one-line declarations while the actual sweep logic lives in one reusable place.

## Where to start

1. **`store.ts`** — Reading this first tells you the module's core contract: what state exists, what the four actions do, and the whole-list-replacement invariant every other file assumes.
2. **`views/Wishlist.vue`** — Pairs naturally with the store; it shows how the state is consumed in the UI, how titles are resolved via the cart store, and what the empty state looks like. Together they give a complete mental model before you touch routing, schemas, or tests.

## Connected modules
```mermaid
flowchart LR
    m_src_modules_wishlist["src/modules/wishlist/"]
    m_src_infrastructure["src/infrastructure/<br/>21 files"]
    m_tests_support["tests/support/<br/>13 files"]
    m_src_modules_wishlist --- m_src_infrastructure
    m_src_modules_wishlist --- m_tests_support
    style m_src_modules_wishlist stroke-width:3px
```

[[boilerplate-vue-frontend_src_infrastructure|src/infrastructure/]] · [[boilerplate-vue-frontend_tests_support|tests/support/]]

## Files
- `src/modules/wishlist/index.ts` — Public barrel (entry point) for the wishlist module. It re-exports `useWishlistStore` so that sibling modules (notably `products`) can access the store's heart-toggle API without reaching into the module's internal file layout.
- `src/modules/wishlist/module.ts` — Module manifest for the **wishlist** feature. It registers the module's routes, navigation entry, response schemas, and locale loaders with the app registry (`AppModule`) so the application can discover and mount the wishlist without hard-coding its details.
- `src/modules/wishlist/response-schemas.ts` — Declarative table that maps every wishlist endpoint (method + URL pattern) to its response-envelope schema. The HTTP layer consumes this array to perform runtime contract validation on outbound responses.
- `src/modules/wishlist/routes.ts` — Declares the route table for the wishlist module—a single authenticated route that is merged into the application's Vue Router by the module registry. It exists to decouple the module's navigation entry point from the central router configuration.
- `src/modules/wishlist/store.ts` — Pinia setup-store that holds a visitor's saved products. Every mutating action (add, remove, move-to-cart) discards the local list and replaces it wholesale with the payload the API returns — no optimistic local state. The store exposes a minimal surface: the item list, an O(1) "is this saved?" check, and four API-backed actions.
- `src/modules/wishlist/tests/e2e/a11y.cy.ts` — Declares the accessibility (a11y) route coverage for the wishlist module. It is a thin co-located wrapper that feeds the wishlist's route into the shared a11y sweep utility, ensuring that removing the wishlist module automatically removes its a11y test with it.
- `src/modules/wishlist/tests/e2e/wishlist.cy.ts` — Cypress end-to-end spec covering the full wishlist user flow: toggling the heart on a product page, browsing the saved list, following a saved item's link to its product page, moving an item to the cart, and confirming guests are redirected to login. It lives co-located with the wishlist module so that deleting the module also deletes its coverage.
- `src/modules/wishlist/tests/e2e/wishlist.visual.cy.ts` — Visual regression test for the wishlist screen. It registers the wishlist page in the shared visual-sweep harness so a screenshot can be captured and compared against a co-located baseline. The file itself is just a one-line screen declaration; all sweep logic lives elsewhere.
- `src/modules/wishlist/tests/routes.spec.ts` — Guards the wishlist route table against silent security regressions. It asserts that the `Wishlist` route still declares `meta.access: 'auth'` and that no unlisted routes have been added to the module, because a route that loses its access requirement simply renders open.
- `src/modules/wishlist/tests/store.spec.ts` — Integration-style tests for the wishlist Pinia store. Rather than unit-testing in isolation, the spec exercises the real store, real generated client, and real cart store against a transport-mocked `orvalMutator`, verifying the store's coordination invariants: whole-list replacement on every mutation and the cross-module side-effect where `moveToCart` refetches the cart.
- `src/modules/wishlist/tests/wishlist-view.spec.ts` — Component-level test for the `Wishlist.vue` view. It mounts the page with seeded store state and the app's real route table, then verifies three things: that each saved item's link carries the product **ID** in its `href` while displaying the product **TITLE** in its text, that the generated `href` actually resolves to the `ProductTarget` route (not a catch-all), and that the item list renders correctly (multiple cards, empty state, title-fallback behaviour).
- `src/modules/wishlist/views/Wishlist.vue` — The wishlist page view. It renders the user's saved product lines (by ID), joining each against the cart store's product-title cache to display a readable name, and exposes two per-item actions: move-to-cart and remove. It handles the empty state with a CTA back to the product listing.

---
[[boilerplate-vue-frontend_INDEX|← boilerplate-vue-frontend index]]
