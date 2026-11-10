---
source: src/modules/shop/module.ts
sha256: 9d6e32bd8358835bef764da96a63ed6555648155ec8a96e625c8794b2ad069ae
signature: 9d6e32bd8358835bef764da96a63ed6555648155ec8a96e625c8794b2ad069ae
generated_at: 2026-11-10T05:44:41.391637+00:00
model: ollama:qwen3.8:27b
---

# src/modules/shop/module.ts

## Purpose
App-module manifest for the `shop` module. It registers the module with the kernel (name, response schemas, boot-time setup) so the shop's settings load once at startup and are validated against their schema. It owns no routes, no navigation, and no locales.

## Key elements
- **`export default { … } satisfies AppModule`** — The sole export. A plain object conforming to the `AppModule` type from `@/kernel/registry`.
  - `name: 'shop'` — Module identifier used by the registry.
  - `routes: []` — Explicitly empty; the shop contributes no page routes.
  - `responseSchemas` — Lazy dynamic import of `./response-schemas` → `shopResponseSchemas`, used for response validation.
  - `setup` — Called at boot; invokes `loadShop()` (fire-and-forget, guaranteed non-rejecting).

## Relationships
- **`src/modules/shop/shop.ts`** — Source of `loadShop`, the only runtime import. The manifest triggers this load during module setup.
- **`src/modules/shop/tests/shop.spec.ts`** — Test suite covering the shop logic this manifest wires in at boot.

## Notes
- `loadShop` is intentionally a floating promise: it catches its own errors, logs, and leaves the shop in an empty state rather than rejecting. The `void` + eslint-disable pair is load-bearing—do not "fix" it.
- The module is described as *page-less and group-owned*: removing the shop (`npm run demo:remove`) drops both this load call and its readers. The core only reads `GET /config`, so it is unaffected.
- Context map lives at `docs/modules/shop.md`.
