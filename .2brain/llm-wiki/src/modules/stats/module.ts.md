---
source: src/modules/stats/module.ts
sha256: 73202424b7fbca494807e595935a0a1076765816daf8dc9c927f3b17e224a10c
signature: 73202424b7fbca494807e595935a0a1076765816daf8dc9c927f3b17e224a10c
generated_at: 2026-11-10T05:49:16.886089+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/module.ts

## Purpose

Module manifest for the `stats` domain. It assembles the domain's routes, response schemas, locale dictionaries, and navigation entry into a single `AppModule` object and registers it with the kernel's registry. The stats domain is read-only reporting: it renders figures fetched by individual backend reads and computes nothing itself.

## Key elements

- **`default export`** — an object satisfying the `AppModule` interface. Declares:
  - `name: 'stats'`, `loadingKeys: ['stats']`
  - `routes` — imported from `./routes`; the domain's route definitions.
  - `navigation` — a single entry for the `StatsDashboard` page (admin section, `navigation.group-sales` group, order 57, icon `ChartNoAxesCombined`).
  - `responseSchemas` — lazy import of `./response-schemas` → `statsResponseSchemas`.
  - `locales` — lazy imports for `en` and `it` JSON dictionaries, each piped through the kernel's `dictionary` helper.

## Relationships

- **`src/modules/stats/routes.ts`** — statically imported as `routes` and attached to the manifest; the file's only local import. All other collaborators (response-schemas, locale JSONs) are loaded lazily at runtime via dynamic `import()`.
- **`@/kernel/registry`** — provides the `AppModule` type constraint and the `dictionary` helper used to normalise locale JSON at load time.

## Notes

- The module is intentionally dependency-free with respect to sibling domains: outbound links (e.g. a product's orders, a payment) are resolved by route name, so a build that omits `orders` degrades gracefully to plain-text links rather than failing.
- `responseSchemas` and `locales` are thunks (`() => import(...).then(...)`) rather than eager values — the kernel invokes them when the module is actually activated, keeping the initial bundle lean.
- Deleting this module removes the stats dashboard and product-sales page only; no other module depends on its computed values because none are computed here.
