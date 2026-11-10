---
source: src/modules/wishlist/module.ts
sha256: 6f96eec089c4287adf87e6dd218586de05468d5d9d4700fe61e5c64497112e26
signature: 6f96eec089c4287adf87e6dd218586de05468d5d9d4700fe61e5c64497112e26
generated_at: 2026-11-10T06:18:50.005057+00:00
model: ollama:qwen3.8:27b
---

# src/modules/wishlist/module.ts

## Purpose

Module manifest for the **wishlist** feature. It registers the module's routes, navigation entry, response schemas, locale loaders, and UI slots into the app registry (`AppModule`), making the wishlist discoverable to the framework without any other module importing it directly.

## Key elements

- **`export default { … } satisfies AppModule`** — The module descriptor consumed by the app registry. Declares:
  - `name: 'wishlist'` — unique module identifier.
  - `loadingKeys: ['wishlist']` — keys the loader awaits before hydration.
  - `routes` — imported from `./routes`.
  - `navigation` — single entry (`Wishlist`) in the `account` section, order `75`, icon `Heart` from `lucide-vue-next`.
  - `responseSchemas` — lazy loader returning `wishlistResponseSchemas` from `./response-schemas`.
  - `locales` — lazy loaders for `en` and `it` JSON files, piped through the `dictionary` helper from `@/kernel/registry`.
  - `slots['product-actions']` — a single `defineAsyncComponent` entry that lazy-mounts `./components/WishlistToggle.vue` (the product-page heart).
- **`dictionary`** (imported from `@/kernel/registry`) — helper applied to raw locale JSON to integrate with the app's i18n pipeline.

## Relationships

- **`src/modules/wishlist/routes.ts`** — imported as the `routes` field of the manifest; provides the route definitions this module contributes to the router.

## Notes

- **Inverted dependency for the product page:** the wishlist contributes its toggle to the `product-actions` slot *from here*, so the `products` module never imports wishlist code. This is an intentional decoupling — do not add a direct import between the two modules.
- **All heavy assets are lazy:** `responseSchemas`, both locale files, and the `WishlistToggle` component use dynamic `import()` / `defineAsyncComponent` so they stay out of the eager entry chunk.
- **`satisfies AppModule`** is used (not `: AppModule` annotation) to get compile-time shape checking while preserving the inferred literal types on the exported object.
- The doc comment references `docs/modules/wishlist.md § "The map"` as the authoritative context map for this module.
