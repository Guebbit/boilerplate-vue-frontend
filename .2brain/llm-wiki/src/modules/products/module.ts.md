---
source: src/modules/products/module.ts
sha256: d10e75a6cf6a9b714b51985685c89bca7c9963e7f0d183257c292a6fd9ca3c7c
generated_at: 2026-10-17T01:28:26.688357+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/module.ts

## Purpose
Module manifest for the **products** domain. It registers the catalogue's routes, a navigation entry, lazy-loaded response schemas, and locale dictionaries into the app's shared module registry (`AppModule`), so the kernel can wire them up without any other module importing products directly.

## Key elements
- **Default export** – An object satisfying `AppModule` with:
  - `name: 'products'` – module identifier used by the registry.
  - `loadingKeys: ['products']` – i18n / data-loading namespace.
  - `routes` – re-exported from `./routes.ts`; defines the public list/detail and admin create/edit pages.
  - `navigation` – a single `ProductsList` entry (order 60, `main` section, `Package` icon, label key `navigation.label-products-list`).
  - `responseSchemas` – lazy loader that resolves `./response-schemas` and returns `productsResponseSchemas`.
  - `locales` – lazy loaders for `en.json` / `it.json`, each piped through the kernel's `dictionary` helper before registration.

## Relationships
- **`src/modules/products/routes.ts`** – Imported synchronously and attached to the `routes` field. All page routes for the products domain are defined there; this file merely passes them to the registry.

## Notes
- The `responseSchemas` and `locales` fields are **thunk-style lazy loaders** (`() => import(...)`), not static values. Callers in the registry must `await` them.
- The file documents a **slot/contribution pattern**: the product page exposes a `product-actions` slot, and the `cart` / `wishlist` modules contribute their buttons via their own manifests. No import from products → cart/wishlist exists; the arrows only point *at* products (they consume `useProductLines` from the products barrel).
- The `plural: 2` on the navigation entry is a non-standard registry convention (likely a plural-form selector); it has no meaning outside the kernel's navigation renderer.
