---
source: src/modules/stats/module.ts
sha256: e42ee4c2b64fa3f05328a673e5fa0812037d99c7cb7f44ce45b1e75e859e459e
generated_at: 2026-10-17T01:42:22.064432+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/module.ts

## Purpose

Module manifest for the **stats** domain. It registers the module's routes, navigation entry, response schemas, and locale files with the kernel's `AppModule` registry. The module is purely read-only reporting: it displays shop sales figures sourced from a single backend read and owns no data or business logic.

## Key elements

- **`default` export** — an object satisfying `AppModule` that bundles everything the kernel needs to mount the stats module:
  - `name: 'stats'` — registry key.
  - `loadingKeys: ['stats']` — i18n loading scope.
  - `routes` — imported from `./routes` and attached verbatim.
  - `navigation` — one entry (`StatsDashboard`) in the admin / sales group, ordered 57, using the `ChartNoAxesCombined` Lucide icon.
  - `responseSchemas` — lazy import of `./response-schemas` → `statsResponseSchemas`.
  - `locales` — lazy importers for `en.json` and `it.json`, each piped through the registry's `dictionary` helper.

## Relationships

- **`src/modules/stats/routes.ts`** — statically imported and assigned to the `routes` field of the manifest. The manifest is the sole consumer that registers those routes with the kernel.

## Notes

- The module deliberately depends on **no sibling module**. Cross-links (e.g. a product's orders, a payment) are resolved by route name at render time; if the `orders` module is absent, those references degrade to plain text.
- Deleting this module removes the dashboard and product-sales pages entirely; no other module's computed values are affected because no figures are derived here.
- `locales` values are arrow functions (lazy), not pre-loaded objects — the kernel calls them at the appropriate lifecycle step.
