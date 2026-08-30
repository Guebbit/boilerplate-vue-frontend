# docs/modules/admin-dashboard.md

## Purpose

Documents the admin dashboard module — a single screen with two tabs (Overview, Audit) that assembles data from five read-only endpoints across two backend domains (`observability` and `audit-logs`). It also records the module's local `types.ts` convention and the deliberate read-only posture of the audit table.

## Key elements

- **Two tabs** — *Overview* (health status, KPI tiles, raw Prometheus text) and *Audit* (server-written event table).
- **Five registered reads** — `GET /observability/health`, `/metrics/overview`, `/metrics`, `/events` (SSE, consumed by `realtime`), and `/audit`. All registered via the module's manifest so contract validation toggles with the folder.
- **`types.ts`** — the only file in either repository with this name (enforced by `tests/cross-cutting/module-file-shapes.spec.ts`). Declares client-invented assembled shapes (e.g. KPI tile) that no endpoint returns directly, kept beside `composables/use-admin-observability.ts` which builds them.
- **Audit table** — purely read; every row is written server-side by ~53 `emitAuditEvent` call sites. No client write endpoint exists by design.
- **Deletion contract** — removing the module is a single `rm -rf src/modules/admin` plus one line in `src/modules.ts`, one sidebar entry, and one pairing entry in `tests/cross-cutting/backend-pairing.spec.ts`.

## Relationships

- **`docs/modules/admin.md`** — parent module; this dashboard is a sub-module it contains.
- **`realtime` module** — the sole consumer of the `GET /observability/events` SSE stream; the dashboard registers the read but another module renders it.
- **Backend `observability` module** — serves all five URLs under one base path.
- **Backend `audit-logs` module** — owns the audit collection but exposes no URL of its own; the read route lives under `observability`.
- **`tests/cross-cutting/backend-pairing.spec.ts`** — names this pairing; the first place to look when the module is missing.

## Notes

- The `audit-logs` backend module owns the data but `observability` owns the route — a deliberate pairing asymmetry that means the dashboard talks to one base path for two domains.
- KPI tiles are *not* endpoint response shapes; they are client-side assemblies. Placing their types in `src/types/` would erase that distinction, which is why `types.ts` lives locally.
- The module depends on no other domain's store; it reads observability endpoints directly. This is intentional to keep deletion a one-liner.
