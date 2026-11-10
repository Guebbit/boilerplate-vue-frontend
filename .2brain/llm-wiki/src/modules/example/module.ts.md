---
source: src/modules/example/module.ts
sha256: eaf46a0a7afdf80ac9edcaabafc9dc67688e1d5387d7a2647a82c099ed24cc26
signature: 22b0381703db128ee17d6377a1ee021a6a7885121ade475b02995841d9d7918e
generated_at: 2026-11-10T04:22:32.967313+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/module.ts

## Purpose

The manifest for the **example** domain — a minimal, self-contained template that a developer copies to bootstrap a new domain. It registers routes, a navigation entry, response schemas, and locale loaders with the application registry, and declares the loading key its store reports under. It exists to be read in one sitting and then deleted.

## Key elements

- **`export default … satisfies AppModule`** — the module manifest object:
  - `name: 'example'`, `loadingKeys: ['example']`
  - `routes` — imported from `./routes`
  - `navigation` — single entry (`ExamplesList`) with `NotebookPen` icon, `section: 'admin'`, `order: 20`
  - `responseSchemas` — lazy import of `exampleResponseSchemas` from `./response-schemas`
  - `locales` — lazy `en` / `it` locale dictionaries piped through the shared `dictionary` helper
- **`declare module '@/infrastructure/utils/logger.ts'`** — augments `LogScopes` with `example: true` so `logger.debug('example', …)` type-checks. The interface name belongs to the logger module, not this file (declaration merging constraint).

## Relationships

- **`src/modules/example/routes.ts`** — imported at the top of the file and assigned to the `routes` field of the manifest. It is the sole graph neighbor in this module.

## Notes

- **Template, not production code.** The doc comment says explicitly: "Copy this folder to start a domain; delete it once you have your own." It is *not* a subdomain.
- **Deletion:** `npm run demo:remove` removes this folder (it lives in the `example` group in `module.yaml`). Copy it before that.
- **No own backend guards.** Access control is delegated entirely to `meta.access` / `meta.can` on the routes; the one public route needs neither.
- **No context-map edge.** Per `docs/modules/index.md` § "The whole map", this module sits on no context-map edge.
- **Sister references** for more complex patterns: `cart` (barrel module) and `wishlist` (slot contribution). See `docs/theory/modules.md#the-module-template`.
