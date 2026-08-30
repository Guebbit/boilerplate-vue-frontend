# docs/modules/admin.md

## Purpose

Documents the `admin` module: a single-screen observability console (service health, KPIs, audit log) that reads five backend endpoints directly, owns no state, and is deliberately designed to be deleted with a single `rm -rf` plus one line removed from `src/modules.ts`.

## Key elements

- **`module.ts`** – the manifest; declares name, routes, nav entry, Zod response schemas, and locales. Only file the app loads directly.
- **`routes.ts`** – one route record (`admin` → `Admin`, `meta.access: admin`), spliced into the localised route tree.
- **`response-schemas.ts`** – one row per endpoint (5 total), pairing method + path with a Zod envelope for contract validation.
- **`types.ts`** – composite shapes the dashboard assembles that no single endpoint returns; unique to this module.
- **`composables/use-admin-observability.ts`** – reactive fetching/logic layer between the view and the API.
- **`views/Admin.vue`** – the routed screen; renders, holds no fetching logic.
- **`components/AdminAuditTab.vue`**, **`components/AdminOverviewTab.vue`** – tab panels for the audit log and the metrics/health overview.
- **`locales/en.json` / `locales/it.json`** – per-language translation chunks.

## Relationships

- **`docs/modules/admin-dashboard.md`** – the deeper-dive page this module links to ("Deeper in" / "Related pages"); explains what the console assembles and from where.
- **Backend: `observability`** – serves health, events, metrics, metrics-overview, and the audit endpoint that this module reads.
- **Backend: `audit-logs`** – owns the collection behind the audit table; this module only reads it, never writes.
- **`realtime` module** – listed as the other frontend consumer of the same `observability` backend domain.
- **`src/modules.ts`** – the single registration point; removing the `admin` entry and the folder severs all links.

## Notes

- **Zero dependency by design.** No other module imports it, and it imports nothing. The intent is that a downstream project without an ops dashboard can delete it cost-free.
- **No store.** Any reactive state the screen reads lives in `src/infrastructure/stores/` or is local to the composable.
- **Audit table is read-only.** Every row is written server-side by a module that is unaware of this dashboard's existence.
- **Zod validation is opt-in per endpoint.** Registering an envelope in `response-schemas.ts` turns on contract checks; deleting the folder turns them off.
- **`types.ts` is exceptional.** No other module ships one; it exists because the dashboard composes shapes that cross two backend domains.
