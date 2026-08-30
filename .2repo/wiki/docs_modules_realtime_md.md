# docs/modules/realtime.md

## Purpose

Standalone module that renders a live view of the observability SSE metrics stream. It exists as an operator-facing playground — one admin-gated screen, one Pinia store, one composable — with no outgoing or incoming module-level dependencies.

## Key elements

- **`RealtimePlayground`** (`views/RealtimePlayground.vue`) — the single routed screen; reads the store, renders the feed, holds no fetching logic.
- **`realtime-observability`** (`store.ts`) — Pinia store exposing state (`status`, `latestSnapshot`, `latestUpdate`, `latestHeartbeatAt`, `entries`, `lastError`) and actions (`setStatus`, `setSnapshot`, `setUpdate`, `setHeartbeat`, `addEntry`, `setError`).
- **`use-realtime-observability.ts`** — composable that subscribes to the SSE stream and unsubscribes on unmount; the only consumer-facing hook in the module.
- **`module.ts`** — manifest declaring routes, nav entry, locales (`en`, `it`), and response schemas.
- **`routes.ts`** — defines the `playground/realtime` route with `meta.access: 'admin'`.
- **`locales/en.json` / `locales/it.json`** — per-language translation chunks.

## Relationships

The dependency graph lists **no neighbors** — nothing imports this module and it imports no other module. Real-world interactions visible in the file:

- **Backend `observability`** (in `boilerplate-node-backend`): this module consumes `GET /observability/events`, the SSE route that module serves.
- **`infrastructure` layer**: `createSseClient` (typed `EventSource` wrapper) lives there, not in this module.
- **`src/types/asyncapi.generated.ts`**: event-name and payload types are generated from `asyncapi.yaml`; a misread payload is a compile error.
- **Related docs pages**: `admin.md`, `tools/realtime.md`, `api/asyncapi-workflow.md`, `theory/sitemap.md`.

## Notes

- **No barrel export.** There is no `index.ts` or public entry, so no sibling module can import from `realtime`. Deleting the folder and its line in `src/modules.ts` has zero side-effects elsewhere.
- **Transport is not here.** The SSE client and reconnection logic belong to `infrastructure`; this module only *uses* the subscription.
- **Route guard is the sole access declaration.** The `admin` meta on the route is the only place the gate is set; the nav entry does not restate it.
- **Apparent narrative inconsistency.** The "story" section claims "no store," yet `store.ts` and the `realtime-observability` Pinia store are present in the file table and State section. Treat the store as the actual source of truth for module state.
- **Test entry points:** `npm run test:unit -- realtime` (3 Vitest suites) and `npm run test:e2e -- --spec 'src/modules/realtime/tests/e2e/*.cy.ts'` (2 Cypress suites + 1 visual baseline).
