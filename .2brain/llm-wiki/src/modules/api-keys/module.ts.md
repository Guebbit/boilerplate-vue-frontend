---
source: src/modules/api-keys/module.ts
sha256: 5070fe070c3228a730675fa69486d5082fb747f1b147bf48b8e6f54a30137868
generated_at: 2026-10-02T12:40:29.649311+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/module.ts

## Purpose

Module manifest that registers the api-keys feature (routes, nav entry, response schemas, locale bundles) into the app's central `AppModule` registry. It is the single wiring point the kernel reads to discover this module's contributions.

## Key elements

- **`export default { … } satisfies AppModule`** — the module descriptor object. Contributes:
  - `name: 'api-keys'` — unique module identifier used by the registry.
  - `loadingKeys: ['api-keys']` — key(s) tracked during async module loading.
  - `routes` — imported from `./routes`; the route table for this module.
  - `navigation` — one entry (`ApiKeysList`) under the `admin` section, order 51, icon `KeyRound`, label resolved via i18n key `navigation.label-api-keys`.
  - `responseSchemas` — lazy factory that imports `./response-schemas` and returns `apiKeysResponseSchemas`.
  - `locales` — per-locale factories (`en`, `it`) that import the JSON file and pass it through the shared `dictionary` helper.

## Relationships

- **`src/modules/api-keys/routes.ts`** — statically imported and assigned to the `routes` field; this file is the sole consumer of that module's default export within this manifest.
- **`@/kernel/registry`** — provides the `AppModule` type (used in `satisfies`) and the `dictionary` helper used to normalise locale JSON at load time.

## Notes

- `satisfies AppModule` gives full type-checking against the registry contract without widening the object's inferred type.
- The navigation entry's visibility is gated by server-published permission rules (`meta.can`), not by a hardcoded role check; only callers holding `apikeys.*` will see it.
- `responseSchemas` and each `locales` entry are **deferred factories** (return a `Promise`), so the actual imports are only executed when the registry needs them, keeping initial bundle size low.
