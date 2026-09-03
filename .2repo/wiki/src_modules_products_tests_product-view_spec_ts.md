# src/modules/products/tests/product-view.spec.ts

## Purpose

Unit test for the `Product` detail view. It mounts the real component against a real (memory-history) router and exercises multiple product **shapes**—out-of-stock, in-stock, minimal, rich—by seeding data directly into the Pinia store, bypassing the network layer entirely.

## Key elements

- **`router`** – A Vue router built with `createMemoryHistory` and `collectModuleRoutes(enabledModules)`, mirroring the production routing structure so the component renders in its real route context.
- **`mountProduct(product)`** – Core helper: stubs `watchProduct` and `fetchWishlist`, seeds the given product into `useProductsStore`, then mounts `Product.vue` with the router, Vuetify, and i18n plugins. Returns a Vue Test Utils wrapper.
- **`signIn()`** – Sets `accessToken` and `viewer` on the session store so the add-to-cart button is visible (not hidden behind a login prompt).
- **`noopStopHandle`** – A no-op that satisfies the `WatchStopHandle` return type required by the `watchProduct` spy.
- **`describe('the shelf')`** – Asserts add-to-cart is disabled and "Out of stock" text appears when `available` is 0; asserts the opposite when `available > 0`.
- **`describe('a barebones product')`** – Asserts the page renders for a product with only `id`, `title`, `price` (showing the `—` empty-value glyph), and that a full `description`/`categories` pair renders normally.

## Relationships

- **`tests/support/unit/wire-modules.ts`** – Imported as `wireModulesIntoCore` and called at module scope before any test runs, wiring module registrations into the kernel so `collectModuleRoutes` and store resolution work.
- **`contracts/rest/index.ts`** – Referenced conceptually: the "barebones product" test documents the shape `POST /products` returns for a minimal payload (only required fields), keeping the unit test as the living spec for that contract branch.

## Notes

- `watchProduct` is always spied with `mockImplementation(() => noopStopHandle)`—the store's own fetch never fires. The shape under test is injected via `addProduct` + `selectedProductId`.
- `fetchWishlist` is stubbed per-mount to prevent a real transport call that the mocked environment cannot answer.
- `LayoutDefault` is stubbed to a pass-through `<slot>` wrapper; any layout-level side effects are out of scope.
- The `beforeEach` pushes the router to `/en/products/placeholder` and awaits `router.isReady()`—the actual product ID in the URL is irrelevant because the component reads its prop, not the param.
- The comment notes this test supersedes a former e2e `ProductRole.minimal` fixture that had zero callers; the unit-level assertion is the sole remaining coverage for the minimal shape.
