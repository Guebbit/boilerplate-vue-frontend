---
source: src/modules/locales/module.ts
sha256: ace55c6e35ba346254b88f774104e22748dde551ab23896afd55812af16ff009
signature: ace55c6e35ba346254b88f774104e22748dde551ab23896afd55812af16ff009
generated_at: 2026-11-10T04:40:41.061752+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/module.ts

## Purpose

Module manifest for the **locales** domain. It registers the translation-admin screens (the "author half" of the dynamic tier) with the kernel registry so the app can mount routes, a navigation entry, response schemas, and i18n dictionaries. The "consumer half" (per-visitor locale switching) lives in `infrastructure/locale-overrides.ts` and does not depend on this module.

## Key elements

- **`export default` (object satisfying `AppModule`)** — the sole export; the kernel registry reads this to wire up the locales module.
  - `name: 'locales'` — module identifier.
  - `loadingKeys: ['locales']` — keys the shell pre-loads before rendering.
  - `routes` — re-exported from `./routes`; the page tree for `/locales/*`.
  - `navigation` — a single `LocalesList` entry (admin section, order 43, `Languages` icon). The dictionary board is a sub-view reached from within the languages board, not a second header slot.
  - `responseSchemas` — lazy loader returning `localesResponseSchemas` from `./response-schemas`.
  - `locales` — per-locale lazy loaders (`en.json`, `it.json`) that pipe through the `dictionary` helper from the kernel registry.

## Relationships

- **`src/modules/locales/routes.ts`** — imported directly and passed as the `routes` field. This is the only file-level dependency of the manifest; the routes file defines the concrete page components under `/locales/*`.

## Notes

- The module is intentionally self-contained for deletion: removing the entire `src/modules/locales/` folder eliminates the admin screens without affecting rendering, because the two infrastructure endpoints it shares with the boot path (`GET /locales`, `GET /locales/{tag}/messages`) are registered by the bottom tier, not by this folder.
- `plural: 2` on the navigation entry controls how the label is resolved for a two-item list (vs. one or many).
- The docstring explicitly notes that translation-management UI is a solved, generic problem; modelling effort is expected server-side, not in this front-end manifest.
