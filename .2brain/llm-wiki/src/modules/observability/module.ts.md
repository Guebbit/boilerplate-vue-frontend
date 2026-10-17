---
source: src/modules/observability/module.ts
sha256: 05dd6d1108fa5d262e5102f3bcb5c825d8a4cd49dad391bd541939f2c73bd43a
generated_at: 2026-10-17T01:11:28.584245+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/module.ts

## Purpose

Module manifest for the **observability** domain. It declares the shape the domain registers under `AppModule` in the kernel's registry — routes, navigation entries, response-schema validation hooks, and locale loaders — assembled from this module's own files. It exists so the kernel can discover and wire the observability console (service health, KPIs, audit log, SSE playground) without importing any domain store.

## Key elements

- **Default export** (`satisfies AppModule`) — the manifest object with `name: 'observability'`.
- **`routes`** — imported from `./routes`; the route table for the three screens.
- **`navigation`** — three entries in the `admin` section:
  - `RealtimePlayground` (icon `Radio`, order 30)
  - `Admin` (icon `LayoutDashboard`, order 40)
  - `AuditLog` (icon `ScrollText`, order 41)

  Each entry carries a `canAccess` audience implied by its route's permission (operator-only vs. `read:AuditLog`).
- **`responseSchemas`** — lazy import of `./response-schemas` → `adminResponseSchemas`.
- **`locales`** — lazy imports of `./locales/en.json` and `./locales/it.json`, each passed through the kernel's `dictionary` helper.

## Relationships

- **`src/modules/observability/routes.ts`** — statically imported and assigned to the `routes` field; provides the actual route definitions consumed by the router.

## Notes

- The module intentionally has **no dependency on any other domain's store**; it reads the observability endpoints directly. The file's own doc comment states this is by design so that a downstream project can delete the entire observability module with zero collateral breakage.
- All heavy imports (response schemas, locale JSONs) are **lazy** (`() => import(...)`); only the route object and lucide icons are loaded eagerly.
- `satisfies AppModule` is used (not `implements`) so the object literal retains its inferred shape while still being type-checked against the contract.
