---
source: src/modules/wishlist/module.ts
sha256: 0edb84b0294112fdba01cf483f0ea85c05cd0495b504ebbb72d762b85fb17289
generated_at: 2026-10-17T01:54:17.836936+00:00
model: ollama:qwen3.8:27b
---

# src/modules/wishlist/module.ts

## Purpose
Module manifest for the Wishlist feature. It registers the module's routes, sidebar navigation entry, response schemas, locale bundles, and a UI slot contribution into the global app registry (`AppModule`). Importing this file is what makes the wishlist visible to the shell.

## Key elements
- **`export default { … } satisfies AppModule`** — The single manifest object. All wiring the app registry consumes lives here.
- **`routes`** — Re-exported from `./routes`; the router reads these to mount wishlist pages.
- **`navigation`** — A single sidebar entry (label key `navigation.label-wishlist`, order 75, section `account`, `Heart` icon from lucide-vue-next).
- **`responseSchemas`** — Lazy-imports `./response-schemas` and returns `wishlistResponseSchemas` for runtime validation.
- **`locales`** — Async loaders for `en.json` / `it.json`, piped through the shared `dictionary` helper from `@/kernel/registry`.
- **`slots['product-actions']`** — Contributes `WishlistToggle.vue` (wrapped in `defineAsyncComponent`) into the product detail page's action bar, so the heart button appears without the product page importing wishlist directly.

## Relationships
- **`src/modules/wishlist/routes.ts`** — Imported and passed through as the `routes` field. The manifest carries these routes into the app registry; it adds no routing logic itself.
- **`@/kernel/registry`** — Provides the `AppModule` type (structural contract) and the `dictionary` helper used to normalise locale JSON.
- **`./response-schemas`**, **`./locales/*.json`**, **`./components/WishlistToggle.vue`** — All referenced lazily; none are bundled eagerly.
- **Cart module (downstream, not a direct import)** — Per the in-file doc comment, "move-to-cart" hits a wishlist endpoint and the cart store then refetches itself. The cart never writes back into this module.
- **Products module (upstream, not a direct import)** — The wishlist page reads product titles via the shared products dictionary. The reverse direction (product → wishlist) is achieved through the `product-actions` slot, so `products` never imports this file.

## Notes
- The file is a *declaration*, not a behaviour file. All actual logic lives in `routes.ts`, `response-schemas.ts`, the locale JSONs, and `WishlistToggle.vue`.
- `WishlistToggle.vue` is deliberately async so it stays out of the eager entry chunk.
- The `plural: 1` field on the navigation entry signals the registry to display the entry even when the list is empty (or controls badge formatting — confirm against registry implementation).
- The doc comment encodes intentional unidirectional data-flow rules (wishlist → cart write; wishlist → products read). Changing the slot mechanism or adding a direct import from `products` into `wishlist` would break that contract.
