# src/modules/products/tests/product-view.spec.ts

## Purpose

Unit-test spec for the `Product` detail view that mounts the real component against a real (memory-history) router and a real Pinia store, but stubs the fetch layer so every product shape the API can return is exercised in a single in-memory run — no browser, no network round trip per shape.

## Key elements

- **`mountProduct(product)`** — Core helper. Stubs `watchProduct` (via `vi.spyOn`), seeds the given product directly into the products store, stubs `fetchWishlist`, then mounts `Product.vue` with the real router, Vuetify, and i18n plugins. Returns a `VueWrapper`.
- **`router`** — Built with `createMemoryHistory` + `collectModuleRoutes(enabledModules)`, mirroring the production router structure in `app/router/index.ts`.
- **`signIn()`** — Seeds the session store with a token and viewer so the add-to-cart button renders (rather than a login prompt).
- **`beforeEach`** — Resets Pinia, loads the `en` locale, and navigates the router to `/en/products/placeholder`.
- **`describe('the shelf')`** — Asserts disabled/enable state of `[data-test=add-to-cart]` and stock-label text for `available: 0` vs `available: 4`.
- **`describe('a barebones product')`** — Asserts the empty-description fallback glyph (`—`) for a minimal shape, and correct rendering when `description` and `categories` are present.

## Relationships

- **`tests/support/unit/wire-modules.ts`** — Called at module top-level via `wireModulesIntoCore()` to register module side-effects (e.g. Pinia store providers, router guards) so the real `collectModuleRoutes` output is complete before the router is constructed.
- **`contracts/rest/index.ts`** — Source of the `Product` type shape (imported here as `ProductType` from `@types`). The object literals passed to `mountProduct` must conform to the REST contract fields; changes to optional/required fields in the contract surface as compile errors in this spec.

## Notes

- `watchProduct` is spied with a `noopStopHandle` (returns `undefined`) — the store never initiates a real fetch. If a future refactor changes `watchProduct`'s signature, the spy's return type will break first.
- `fetchWishlist` is also stubbed per-mount; without it, a signed-in mount would trigger a real HTTP call the mocked transport cannot answer.
- The test uses `[data-test=…]` attributes as its only DOM selectors — adding or renaming those attributes in `Product.vue` breaks the spec silently (`.get` throws).
- The "barebones product" block explicitly replaced the e2e `ProductRole.minimal` fixture; do not re-introduce that fixture expecting this spec to cover it.
