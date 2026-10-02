---
source: src/modules/cart/module.ts
sha256: 4980d2ef22b4ce115f387b8009b366c581e744500500d645b23610d27c5b80d1
generated_at: 2026-10-02T14:58:49.719023+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/module.ts

## Purpose

Module manifest for the cart feature. It registers the cart's routes, navigation entry (with a live count badge and currency total), response schemas, locale loaders, and the `product-actions` slot contribution with the app's `AppModule` registry so the shell can render navigation, load routes, and expose the "Add to Cart" button on the products page without the products module importing cart directly.

## Key elements

- **Default export (`satisfies AppModule`)** — the single object the app registry consumes.
  - `name`, `loadingKeys` — identity and preload keys for the registry.
  - `routes` — re-exported from `./routes`.
  - `navigation[0]` — the "Cart" nav entry.
    - `badge` — returns a reactive `badgeQuantity` ref; on first auth it calls `cartStore.fetchSummary()` (lightweight `GET /cart/summary`); on real session loss it calls `clearCheckoutDrafts()`.
    - `detail` — a `computed` that formats `badgeMoney.total` via `formatCurrency`, tracking both the store and the active i18n locale.
  - `responseSchemas` — lazy-imports `cartResponseSchemas` for the API schema registry.
  - `locales` — async locale loaders (`en`, `it`) wired through the `dictionary` helper.
  - `slots['product-actions']` — `defineAsyncComponent` loading `AddToCartButton.vue`, so the button stays out of the eager entry chunk.

## Relationships

- **`./store.ts`** — `useCartStore` is called inside `badge` and `detail` to expose `badgeQuantity` and `badgeMoney` to the navigation chrome.
- **`./routes.ts`** — imported wholesale and passed as the manifest's `routes` field.
- **`./composables/use-checkout-draft.ts`** — `clearCheckoutDrafts` is invoked in the `isAuth` watcher when a session truly ends (previously-authed → unauthed) to discard in-progress checkout state.
- **`@/infrastructure/session.ts`** — `useSessionStore` provides the reactive `isAuth` ref that drives the badge's auth-aware behaviour.
- **`@/infrastructure/utils/formatters.ts`** — `formatCurrency` is used in `detail` to render the money string in the shell.
- **`@/kernel/registry`** — `dictionary` (locale helper) and the `AppModule` type shape the export.

## Notes

- The `badge` watcher treats a reload (signed-out → signed-in) differently from a real logout: `clearCheckoutDrafts` only fires when `wasAuth && !auth`, preserving a draft across the brief unauth window of a page refresh.
- `detail` is a `computed`, not a plain function, so it re-evaluates when either the store's total or the active locale changes.
- `AddToCartButton` is wrapped in `defineAsyncComponent` deliberately to keep it out of the initial bundle; the products module owns the `product-actions` slot and never imports the cart module.
- The file's long docblock uses Hexagonal-architecture vocabulary (`customer-supplier`, `conformist`, `published-language`) to document intent-level relationships with `products`, `delivery`, `payments`, `account`, `orders`, and `wishlist`.
