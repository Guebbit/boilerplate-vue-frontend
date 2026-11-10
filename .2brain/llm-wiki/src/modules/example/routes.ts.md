---
source: src/modules/example/routes.ts
sha256: ff51444bd5b087787b1bfe17abd072df43c68d966ca646d5d0c33b38ed7db0d9
signature: ff51444bd5b087787b1bfe17abd072df43c68d966ca646d5d0c33b38ed7db0d9
generated_at: 2026-11-10T04:23:14.238492+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/routes.ts

## Purpose

Declares the route table for the example module. Each entry pairs a URL path with a lazy-loaded view component and a `meta` block that the app-level router uses for access control (`access` / `can`) and page titles. This file is the single source of truth for which URLs the module serves and who may reach them.

## Key elements

- **default export** – An array of `RouteRecordRaw` objects (type-checked with `satisfies RouteRecordRaw[]`). Routes in order:
  - `ExamplesList` – `examples`, auth + `read Example`, loads `ExamplesList.vue`
  - `ExampleCreate` – `examples/create`, auth + `create Example`, loads `ExampleCreate.vue`
  - `ExamplePublished` – `examples/published/:id`, **public** (no `access`/`can`), `props: true`
  - `ExampleTarget` – `examples/:id`, auth + `read Example`, `props: true`
  - `ExampleEdit` – `examples/:id/edit`, auth + `update Example`, `props: true`
- **`meta.can`** – Coarse gate checked by the caller (router guard); per-row permissions live on the record's own `actions` (enforced inside each view).
- **`props: true`** – Passed on dynamic routes so the `:id` param is injected as a component prop, removing the need for the view to read the route manually.

## Relationships

- **`src/modules/example/module.ts`** – Imports this default array to register the module's routes with the app's module registry / router.
- **`src/modules/example/tests/routes.spec.ts`** – Unit-tests the exported route table (paths, meta, component factories).

## Notes

- **Route ordering is intentional.** `examples/create` is declared *before* `examples/:id` so the literal word "create" is not captured as an `:id` parameter. Do not reorder without verifying the router's match still resolves correctly.
- **`ExamplePublished` is the only public route.** It carries no `access` or `can` keys; any router guard logic that reads those fields must treat their absence as "no restriction" rather than an error.
- Views are lazy-loaded (`() => import(…)`), so no route guard is expected to fetch data—the view itself loads its record on mount.
- Page titles use i18n keys (`*.page-title`), not literal strings.
