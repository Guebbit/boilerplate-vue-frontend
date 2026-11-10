---
source: tests/support/e2e/fixtures.ts
sha256: 596db2f10cf87b8c718422ce6a9ec354ade4ee3d77b002d8e10269824fc952ae
signature: ec58f6946f81181a24128911f66e79c9d050c86a028129f925d3a4c64116ef55
generated_at: 2026-11-10T07:30:00.650675+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/fixtures.ts

## Purpose

Defines Cypress custom commands that let specs reference demo data by a **guarantee name** (e.g. `product.inStock`) instead of a backend-specific id or title. Because the shared contract deliberately keeps `Id` format-free, a spec that hard-codes an id would adopt a constraint the contract refused to make. These commands resolve the named guarantee to a concrete record at runtime, keeping specs portable across backends.

## Key elements

- **`ProductLike`, `OrderLike`, `WebhookSubscriptionLike`, `ApiKeyLike`** – Structural interfaces describing the API-serialised shapes specs read. Declared locally (not imported from `@api`) because `tsconfig.cypress.json` is a composite project that does not claim `contracts/`.
- **`PUBLIC_PAGE_SIZE`** – Constant `100`, the contract's `PageSize.maximum`; caps each paginated request.
- **`publicProductsPage` / `walkPublicProducts`** – Helpers that fetch one page of the public catalogue and recursively walk all pages, accumulating the full list.
- **`subjectProduct(name)`** – Resolves a `product.*` guarantee via `cy.subjectId(name)`, then `GET`s the row from the public API.
- **`publicProducts()`** – Returns the entire anonymous catalogue (all pages), used for facet-count assertions and title-to-id maps.
- **`subjectOrder(name)`** – Resolves an `order.*` guarantee and `GET`s the order as the owner.
- **`filterByNarrowestCategoryOf(name)`** – Derives the narrowest visible category from the public list and clicks the corresponding storefront chip.
- **`accountInRole(role)`** – Signs in as a seeded account and `GET /account` to obtain the id/email the API assigns.
- **`createProduct` / `softDeleteProduct` / `deactivateProduct`** – Admin write commands for specs asserting visibility-transition rules (create → hide).
- **`apiAs<T>(role, method, path, body?)`** – Makes one authenticated API call from Node (bypassing the browser session), used to arrange pre-state (empty cart, unsaved wishlist, etc.).
- **`createWebhookSubscription` / `mintApiKey`** – Admin creation commands for modules that have no seeded demo fixture.
- **`CypressWithRunnableState`** – Minimal type for Cypress' internal `state('runnable')` access (per-test-unique ids), reached via `asStub`.

## Relationships

- **`tests/support/e2e/scenario.ts`** – Imports `seedAccount`, which `accountInRole` uses to obtain the seeded login before calling `GET /account`.
- **`tests/support/e2e/integrator.ts`** – Imports `sinkEndpoint`, used to wire the Node-side Cypress tasks that back the write commands (`createProduct`, `softDeleteProduct`, etc.).
- **`tests/support/scenario-description.ts`** – Imports the `E2ERole` type used as a parameter in `accountInRole` and `apiAs` signatures.
- **`tests/support/stub.ts`** – Imports `asStub`, the repo's sanctioned cast for values that cannot structurally satisfy a framework type (here, Cypress' undocumented `state` API).
- **`tests/support/e2e/e2e.ts`** – The Cypress entry/runner file that loads this module so its commands are available to specs.

## Notes

- The structural interfaces (`ProductLike`, etc.) exist solely because the Cypress composite project cannot import from `contracts/`; they are not a public contract and may lag behind the OpenAPI schema.
- `PUBLIC_PAGE_SIZE` mirrors `shared/contracts/openapi.root.yaml` → `PageSize.maximum`. A backend may seed more total rows than this, which is why `walkPublicProducts` paginates rather than assuming a single request suffices.
- Writes (create, delete, deactivate) route through Node-side Cypress tasks rather than `cy.request`, to avoid disturbing the browser session or analytics cookies a spec is measuring.
- `subjectProduct` and `subjectOrder` call `cy.subjectId(name)` at runtime to resolve a guarantee to an id; the definition of that command lives outside this file's imports.
