---
source: src/modules/returns/module.ts
sha256: ee3d312e4a0156f30724d8de2976b9072b64b085438a6dfc8ea0cf907d55ae80
signature: ee3d312e4a0156f30724d8de2976b9072b64b085438a6dfc8ea0cf907d55ae80
generated_at: 2026-11-10T05:38:03.335735+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/module.ts

## Purpose

Module manifest for the **returns** subdomain. Registers the module's routes, navigation entries, response schemas, and locale files into the app's module registry (`AppModule`). It is the single wiring point that ties the returns feature's UI surfaces together.

## Key elements

- **`export default`** — an object typed `AppModule` with:
  - `name: 'returns'` — registry key.
  - `loadingKeys: ['returns']` — keys the app tracks for lazy-load state.
  - `routes` — re-exported from `./routes`.
  - `navigation` — two entries:
    - **ReturnsList** (`section: 'account'`): customer-facing list of their own returns, icon `Undo2`.
    - **SalesReturns** (`section: 'admin'`, `group: 'navigation.group-sales'`): staff approval/receipt queue; carries a live badge via `useWorkCount('returns')`.
  - `responseSchemas` — lazy-imports `returnsResponseSchemas` from `./response-schemas`.
  - `locales` — lazy-imports `en.json` / `it.json` and passes each through `dictionary` (from `@/kernel/registry`).

## Relationships

- **`src/modules/returns/routes.ts`** — this file imports the default export of that file and attaches it to the manifest under `routes`. That is the only cross-file code dependency in this file (besides kernel imports).

## Notes

- The `plural: 1` on both navigation entries means the route name and its plural form are identical; the registry uses this for i18n pluralisation.
- `responseSchemas` and `locales` are **thunks** (return a Promise), not direct values — the registry awaits them on demand.
- The `badge` function on `SalesReturns` is evaluated at render time; it reads from the `useWorkCount` composable rather than a static value.
- Domain context lives in `docs/modules/returns.md` § "The map" (referenced in the file's JSDoc but not co-located here).
