---
source: src/modules/example/routes.ts
sha256: 1322f81e911ecc75c14a09a26228489041bd67f1211c395b9ba5278072863c5a
generated_at: 2026-10-17T00:51:27.997866+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/routes.ts

## Purpose
Declarative route table for the example module. Each entry pairs a path with a lazy-loaded Vue view and the access rules the router enforces. The file exists so `module.ts` can register the module's screens in one place while keeping component imports out of the critical bundle path.

## Key elements
- **Default export** — `RouteRecordRaw[]` (validated via `satisfies`) containing five route records:
  - `ExamplesList` — `examples`, requires auth + `read Example`.
  - `ExampleCreate` — `examples/create`, requires auth + `create Example`.
  - `ExamplePublished` — `examples/published/:id`, **public** (no `meta.access`), passes `:id` as a prop.
  - `ExampleTarget` — `examples/:id`, requires auth + `read Example`, passes `:id` as a prop.
  - `ExampleEdit` — `examples/:id/edit`, requires auth + `update Example`, passes `:id` as a prop, and carries a scoped `beforeEnter: [exampleEditGuard]`.
- **`exampleEditGuard`** (imported from `./guards.ts`) — attached only to the Edit route's `beforeEnter`, not registered app-wide.

## Relationships
- **`src/modules/example/guards.ts`** — Provides `exampleEditGuard`, the single function this file imports at runtime. The guard is scoped to the Edit route only.
- **`src/modules/example/module.ts`** — Consumes the default export and mounts it under the app's module registry.
- **`src/modules/example/tests/routes.spec.ts`** — Tests the route table (paths, names, meta fields, guard wiring).

## Notes
- **Ordering is intentional.** `examples/create` is declared before `examples/:id` so the literal word "create" is never swallowed by the `:id` parameter.
- **`props: true`** is set on the three parameterized routes so the component receives `:id` as a prop rather than reading it from `$route` directly.
- **Public route convention.** `ExamplePublished` omits `meta.access` and `meta.can` entirely; its absence (not a sentinel value) signals "no auth required."
- **Guard scoping.** `exampleEditGuard` lives in `beforeEnter` on a single route record rather than in a global `beforeEach`, keeping it from firing on unrelated navigations.
