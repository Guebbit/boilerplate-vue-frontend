---
source: src/modules/returns/routes.ts
sha256: 28a478f312a64f341afcaabb6f6823fba1f3aef18b291f9c59e489b3ee319c94
signature: 28a478f312a64f341afcaabb6f6823fba1f3aef18b291f9c59e489b3ee319c94
generated_at: 2026-11-10T05:38:23.329099+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/routes.ts

## Purpose

Defines the Vue Router route table for the returns module: a customer-facing list, a staff queue over the same list, and a single-return detail page. Exported as the module's default array so the app's module registry can mount it without further assembly.

## Key elements

- **Default export (route array)** — Three `RouteRecordRaw` entries, type-checked via `satisfies RouteRecordRaw[]`:
  - **`ReturnsList`** (`/returns`) — Customer's own returns. Requires `auth` access. Lazy-loads `./views/ReturnsList.vue`.
  - **`SalesReturns`** (`/sales/returns`) — Staff queue over all returns. Requires `auth` **and** the `read:Return` permission (`can: ['read', 'Return']`). Reuses the same `ReturnsList.vue` view but gets its own i18n title so the admin menu can show a distinct entry/badge.
  - **`ReturnTarget`** (`/returns/:id`) — Single-return detail page. Requires `auth`. Lazy-loads `./views/ReturnTarget.vue` with `props: true` (passing the `id` param as a component prop).

- **Meta conventions** — Every route carries `access: 'auth'` and an i18n `title` key; only `SalesReturns` additionally declares a `can` permission array.

## Relationships

- **`src/modules/returns/module.ts`** — Consumes this file's default export to register the returns routes with the application's module registry.
- **`src/modules/returns/tests/routes.spec.ts`** — Tests the route records defined here (paths, names, meta, component resolution).

## Notes

- `ReturnsList` and `SalesReturns` intentionally mount the **same component** (`ReturnsList.vue`); differentiation is purely via the `can` permission and the i18n title key. The view itself is expected to branch on the caller's permissions at runtime.
- Permission model: a caller's ability to *act* on a return lives in `Return.actions` (referenced in the file header comment), not in these route definitions. The routes only gate *visibility* of the list/queue.
- `props: true` on `ReturnTarget` means `:id` is forwarded as a prop to the component; the component must declare it in its own props.
