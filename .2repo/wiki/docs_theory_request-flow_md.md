# docs/theory/request-flow.md

## Purpose

Documents the end-to-end request lifecycle (user action → view → store → HTTP → backend → reactive update) and the parallel observability signals (Umami, Grafana Faro). Serves as the single reference for "where does a request go and who handles errors" so developers and AI assistants don't need to trace the chain through source files.

## Key elements

- **End-to-end flowchart** — Mermaid diagram showing the happy path and the 401/5xx branches, naming the concrete files at each hop (`contracts/rest/index.ts`, `src/infrastructure/http/index.ts`).
- **Observability signals flowchart** — Maps route changes to `umami.track()` and HTTP errors to `captureException()` / Faro, emphasizing they run in parallel with the request flow.
- **"What each layer does" table** — Six-row table assigning responsibility per layer (View, Composable, Pinia store, Generated client, HTTP interceptors, Router guards).
- **Cross-cutting strategies** — Three short subsections: auth-first routing (`?continue=` preservation), interceptor-owned error shape (`IResponseReject`), and fire-and-forget analytics.
- **"Why the flow matters" checklist** — Decision list that redirects the reader to sibling docs (API, Tools, Layers, Sitemap) based on the type of change.

## Relationships

- **docs/theory/layers.md** — Directly referenced in the "Why the flow matters" checklist for layer-ownership questions; this page assumes the reader already understands layer boundaries defined there.
- **docs/theory/reading-path.md** — Situated within the same theory reading sequence; this page is the "runtime behavior" step after layers and modules.
- **docs/theory/modules.md** — Complementary theory doc; modules describe *what* each area contains, while this page describes *how a request traverses* those areas.
- **docs/index.md** — Top-level docs hub that links into this page as the canonical request-flow reference.
- **docs/getting-started.md** — Onboarding doc that likely points here as the "understand the request cycle" step.
- **docker-compose.production.yml** — The production runtime context in which the described flow executes (backend endpoint, Faro/Umami service wiring).

## Notes

- The `IResponseReject` envelope is the **only** error shape views and stores may rely on; raw axios errors must never leak past the interceptors.
- `umami.track()` calls must never be `await`ed; they are no-ops when Umami is absent, so there is no feature-flag guard needed at call sites.
- The generated client (`contracts/rest/index.ts`) is regenerated from `openapi.yaml` — manual edits are overwritten.
- Router guards run in a fixed order: `tryRestoreAuth` → `enforceRouteAccess` (`beforeEach`), then `localeChoice` (`beforeResolve`). A 401 mid-navigation is handled by the interceptor redirect, not by the guard.
