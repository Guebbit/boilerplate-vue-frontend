---
source: tests/support/e2e/fixtures.ts
sha256: c4644d9e0f7a330d64ccda8ba80bfe4d85ebec4463e4a309678e0a5f7235ad9d
generated_at: 2026-10-17T02:25:14.825404+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/fixtures.ts

## Purpose

Defines a set of custom Cypress commands (`cy.*`) that let E2E specs reference demo data by a named **guarantee** (e.g. `product.inStock`) or a **role** (e.g. `admin`) rather than hard-coding backend-specific IDs or titles. It also provides server-side create/mutate helpers for specs that must assert a visibility *transition* (soft-delete, deactivate) or for modules that have no seeded fixture at all (webhooks, API keys).

## Key elements

- **Structural interfaces** — `ProductLike`, `OrderLike`, `WebhookSubscriptionLike`, `ApiKeyLike`: minimal shapes the commands yield, declared locally because `tsconfig.cypress.json` is a composite project that does not include `contracts/`.
- **`CypressWithRunnableState`** — narrow interface over Cypress' undocumented `state('runnable')` API; accessed via `asStub` to get a per-test-unique id.
- **`PUBLIC_PAGE_SIZE`** (100) — matches the OpenAPI `PageSize.maximum`; used by the pagination walker.
- **`publicProductsPage()`** — fetches one page of the anonymous product list.
- **`walkPublicProducts()`** — recursively accumulates all pages; exported as `cy.publicProducts()`.
- **`Cypress.Commands.add(...)` registrations** (the public API of this file):
  - `subjectProduct(name)` — resolves a `product.*` guarantee to its row via `cy.subjectId()` + `GET /products/{id}`.
  - `publicProducts()` — full anonymous catalogue (all pages).
  - `subjectOrder(name)` — resolves an `order.*` guarantee to the order as the owner reads it.
  - `filterByNarrowestCategoryOf(name)` — clicks the storefront category chip whose count is smallest yet still includes the subject product.
  - `accountInRole(role)` — returns the seeded account's API-serialised identity (`GET /account`).
  - `createProduct(overrides?)` — `POST` a product as admin.
  - `softDeleteProduct(id)` — `DELETE /products/{id}` (sets `deletedAt`).
  - `deactivateProduct(product)` — marks a product inactive (independent of soft-delete).
  - `apiAs<T>(role, method, path, body?)` — one authenticated Node-side request; yields `data` from the envelope.
  - `createWebhookSubscription(overrides?)` — mints a webhook subscription (no seeded fixture exists).
  - `mintApiKey(overrides?)` — mints an API key with secret (no seeded fixture exists).

## Relationships

- **`tests/support/e2e/scenario.ts`** — source of `seedAccount` and the `E2ERole` type used throughout; also the home of `cy.subjectId()` and `cy.account()` which several commands here chain onto.
- **`tests/support/stub.ts`** — provides `asStub`, the repo's sanctioned type-cast helper used to read the undocumented `Cypress.state('runnable')` value.
- **`tests/support/e2e/integrator.ts`** — provides `sinkEndpoint`, used by the Node-side task-based write path (mutating commands avoid `cy.request` to keep the browser session and analytics cookies untouched).

## Notes

- The design rule is: **name a guarantee, not a row**. Any spec that hard-codes an id or title has adopted a backend-specific constraint the shared contract deliberately avoids.
- Structural interfaces exist because the Cypress composite project (`tsconfig.cypress.json`) does not resolve `contracts/`; do not replace them with `@api` imports.
- Write operations (create, delete, deactivate) go through a Node-side Cypress task rather than `cy.request`, preserving the browser's session/refresh-cookie state for the spec that follows.
- `publicProducts()` paginates because the seeded catalogue exceeds the contract's 100-row page cap; a single request is *not* the whole list.
- The file's top-level doc comment describes three strategies (ask-by-guarantee, find-by-login, create-and-mutate) and when each is appropriate; the commands are grouped to match that taxonomy.
