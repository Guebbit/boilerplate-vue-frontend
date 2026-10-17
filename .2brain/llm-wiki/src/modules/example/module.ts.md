---
source: src/modules/example/module.ts
sha256: 6d7a4fd1a3f109f216492e84b084a08f61dce2a2b8fc66e35da50912676b4f6e
generated_at: 2026-10-17T00:51:05.308252+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/module.ts

## Purpose
Module manifest for the **example** domain — the single entry point the application loads directly. It wires routes, navigation, response schemas, and locale loaders into the kernel registry, and declares the store-loading key for this domain. It also exists as a copy-paste template: new domains start by duplicating this folder.

## Key elements
- **`export default { … } satisfies AppModule`** — the manifest object. Fields:
  - `name: 'example'` — domain identifier.
  - `loadingKeys: ['example']` — keys its stores report loading under.
  - `routes` — imported from `./routes`; mounted by the app router.
  - `navigation` — one entry (`ExamplesList`) with `NotebookPen` icon, `order: 20`, `section: 'main'`, and an i18n label key.
  - `responseSchemas` — lazy-imports `./response-schemas` and returns `exampleResponseSchemas`.
  - `locales` — lazy-imports `en.json` / `it.json` and passes them through `dictionary` from the kernel registry.
- **`declare module '@/infrastructure/utils/logger.ts'`** — declaration merging that adds `example: true` to the `LogScopes` interface, enabling `logger.debug('example', …)` to type-check.

## Relationships
- **`src/modules/example/routes.ts`** — imported at the top of this file and assigned to `routes` in the manifest. This file does not re-export the routes; it simply hands them to the registry. All route-level concerns (paths, guards via `meta.access` / `meta.can`, the single public route) live in the routes file, not here.

## Notes
- This domain is intentionally **not** in `DEMO_MODULE_NAMES`, so `npm run demo:remove` leaves it in place — it is expected to persist as the reference template.
- The log-scope augmentation must reference the **exact** interface name (`LogScopes`) and the **exact** module path; the interface name belongs to the logger module, not to this file. Deleting the `example/` folder removes the scope with it.
- Every screen is gated by `meta.access` / `meta.can` (enforced server-side); the one public route requires neither. No additional client-side auth logic lives here.
- `responseSchemas` and `locales` are factory functions (lazy `import()`), so their modules are never loaded unless the registry actually requests them.
