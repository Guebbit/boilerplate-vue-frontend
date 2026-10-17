---
source: src/modules/returns/routes.ts
sha256: 7bc80436ccb4eaef6be56d13c4848a5349e5a595ab59bb144aee960d350d73b2
generated_at: 2026-10-17T01:37:43.830687+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/routes.ts

## Purpose
Defines the Vue Router route table for the returns module. It exposes two routes—list and detail—that the app's module registry mounts. Both are auth-gated; the server (not the client) decides whether the list shows one customer's returns or all returns.

## Key elements
- **`default` export** — an array satisfying `RouteRecordRaw[]` containing the two route records below.
- **`ReturnsList` route** (`/returns`) — lazy-loads `./views/ReturnsList.vue`; meta sets `access: 'auth'` and a translation key for the page title.
- **`ReturnTarget` route** (`/returns/:id`) — lazy-loads `./views/Return.vue` with `props: true` so the `id` param is passed as a component prop; same auth meta and a second title key.

## Relationships
- **`src/modules/returns/module.ts`** — imports this default export and registers the routes under the app's module routing registry.
- **`src/modules/returns/tests/routes.spec.ts`** — imports the route records to assert paths, names, meta, and prop wiring.

## Notes
- Both view components are loaded via dynamic `import()`, so their JS is split into separate chunks.
- `props: true` on the detail route means `Return.vue` expects an `id` prop matching the route param; the list route has no params.
- The file is a pure data export (no side effects), safe to import in tests or the module bootstrap without triggering component code.
