---
source: src/modules/delivery/module.ts
sha256: fa6c3ac426654a62d8091f3333acb1f41cbda0f4eb7c5a500a9d955c791bd01f
signature: fa6c3ac426654a62d8091f3333acb1f41cbda0f4eb7c5a500a9d955c791bd01f
generated_at: 2026-11-10T04:18:08.514821+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/module.ts

## Purpose

App-module manifest for the **delivery** module. It registers the module's response schemas and locale loaders with the kernel registry, without declaring any routes. This module exists to bundle shipping-related *components* (selector, parcel panel) and their store as a single, page-less unit that other modules (cart, orders) mount on demand.

## Key elements

- **Default export** — a plain object typed as `satisfies AppModule` with:
  - `name: 'delivery'`
  - `loadingKeys: ['delivery']`
  - `routes: []` — intentionally empty; no navigation entry points.
  - `responseSchemas` — lazy-loads `./response-schemas` and returns `deliveryResponseSchemas`.
  - `locales` — lazy-loads `./locales/en.json` and `./locales/it.json`, each piped through the shared `dictionary` helper from `@/kernel/registry`.
- **`dictionary`** (imported from `@/kernel/registry`) — wraps locale JSON into the registry's expected shape.
- **`AppModule`** (type import from `@/kernel/registry`) — the structural contract this object must satisfy.

## Relationships

No graph neighbors are recorded for this file. It is a leaf in the dependency graph: it imports from the kernel registry and lazily imports its own `response-schemas` and `locales` modules, but no other module in the tracked graph imports it directly. Its consumers (cart, orders) reference the barrel re-exports, not this manifest.

## Notes

- **No routes by design.** The file's JSDoc explicitly explains that shipping is a supporting concern, not a destination. The selector and parcel panel are mounted *by their owning modules* (cart → delivery, orders → delivery) through the module barrel.
- **Deleting this module** removes the shipping selector and parcel panels; checkouts stop carrying shipping data. There is no separate "delivery page" to worry about.
- **Locale coverage** is English and Italian only.
- The context map for deeper design rationale lives at `docs/modules/delivery.md` § "The map".
