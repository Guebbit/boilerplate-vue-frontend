# docs/tools/realtime.md

## Purpose

Documents the SSE transport layer — the client factory, event contract, and generated types — and explicitly separates it from the `realtime` module (UI/store). Exists so readers can find the mechanism details without conflating them with the domain logic on the module page.

## Key elements

- **`src/infrastructure/create-sse-client.ts`** — SSE client factory wrapping `EventSource`; one listener per event name; `connect`/`disconnect` lifecycle.
- **`src/modules/realtime/use-realtime-observability.ts`** — Vue composable that wires the client to the store.
- **`src/modules/realtime/store.ts`** — Pinia store holding the metrics snapshot; keeps each event kind labelled separately.
- **`src/types/asyncapi.generated.ts`** — Generated from `asyncapi.yaml`; exports `REALTIME_SSE_EVENT_NAMES` and `SseEventPayload<T>`. **Do not edit manually.**
- **`src/types/realtime.ts`** — App-level type helpers layered over the generated types.
- **`src/modules/realtime/views/RealtimePlayground.vue`** + **`routes.ts`** — Thin demo route at `/:locale/playground/realtime`, gated by `meta.access` (admin only).
- **`VITE_API_SSE`** — Env var pointing at the SSE endpoint; a running backend is required for live testing.
- **Event names** — `observability.metrics.snapshot`, `observability.metrics.updated`, `observability.heartbeat`; all share the same `ObservabilityMetricsPayload` shape.

## Relationships

- **`docs/modules/realtime.md`** — The module page owns *what* the realtime module is (screen, store, design rationale); this page owns *how* the transport works.
- **`docs/api/asyncapi-workflow.md`** — The shared `asyncapi.yaml` (copied verbatim from the backend's public half) and the `npm run gen:asyncapi` regeneration workflow.
- **`docs/theory/sitemap.md`** — The admin-role gate on this route lives in `meta.access`, explained by the sitemap/access-control theory.
- **`docs/tools/admin-dashboard.md`** — The underlying `GET /observability/events` stream is admin-only on the API side; the SSE route inherits that restriction.
- **`docs/tools/state-and-routing.md`** — Routing conventions that apply to the realtime route definition.
- **`docs/reference/src-infrastructure.md`** — `create-sse-client.ts` lives in the infrastructure layer, referenced there.
- **`docs/reference/src-modules.md`** — The `src/modules/realtime/` files are catalogued under the modules reference.

## Notes

- SSE is strictly **server → client**. All client-to-server traffic uses the REST API; no persistent uplink exists.
- Never hardcode event-name strings — always go through `REALTIME_SSE_EVENT_NAMES` so generated types stay in sync.
- The backend's full AsyncAPI document also declares RabbitMQ worker queues; those are intentionally **excluded** from this repo because a browser cannot open a broker connection.
- The admin gate is enforced at the **route meta** level, not inside the component. Don't add a role check in `RealtimePlayground.vue`.
- Unit tests substitute a fake `EventSource`; integration/manual testing needs a live backend bound to `VITE_API_SSE`.
