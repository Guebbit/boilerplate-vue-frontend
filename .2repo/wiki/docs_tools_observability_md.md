# docs/tools/observability.md

## Purpose

Documentation for the frontend observability stack: two complementary tools (Grafana Faro for errors/tracing/web-vitals, Umami for product analytics) wired into a single Pinia store and verified via a self-hosted local Docker/Podman stack. The page exists so a developer (or AI assistant) can find the env vars, init sequence, usage API, and verification steps without reading the source.

## Key elements

- **`useObservabilityStore()`** (`src/infrastructure/stores/observability.ts`) — the sole entry point; all Faro/Umami calls go through it. Components must never import the Faro SDK or touch `window.umami` directly.
- **`obs.initFaro()` / `obs.initUmami()`** — called from `src/main.ts`; each is a no-op when its gating env var (`VITE_FARO_URL` / `VITE_UMAMI_WEBSITE_ID`) is absent.
- **`obs.captureException(err)`** — manual error push to Faro; invoked automatically by `src/infrastructure/http/index.ts` on 5xx and by `router.onError`.
- **`obs.track(event, props)`** — fire-and-forget Umami custom event. Must use a constant from `analyticsEvents`; never a raw string.
- **`obs.identifyUser(id)` / `obs.unidentifyUser()`** — best-effort Umami identity binding after login / on logout.
- **`analyticsEvents`** (`src/infrastructure/observability/analytics-events.ts`) — the complete, closed set of event names *this* app may emit. Byte-identical copy of a backend-assembled file; `npm run check:spec-identity` fails the build if the two forks.
- **`TracingInstrumentation`** — opens a span per fetch/XHR and propagates W3C `traceparent` to `VITE_API_URL`, enabling end-to-end browser→API→DB traces in Tempo.
- **Env vars** — `VITE_FARO_URL`, `VITE_FARO_APP_NAME`, `VITE_FARO_APP_VERSION`, `VITE_FARO_ENVIRONMENT`, `VITE_UMAMI_WEBSITE_ID`, `VITE_UMAMI_SRC`.

## Relationships

- **`docs/index.md`** — top-level wiki index; links to this page as part of the tools section.
- **`docs/tools/mutation-testing.md`** — sibling tool page in the same `docs/tools/` directory; no shared code, but both describe quality-assurance infrastructure alongside this page's runtime observability.
- **`docs/tools/package-dependencies.md`** — documents the npm dependencies that this page's stack relies on (`@grafana/faro-web-sdk`, `@grafana/faro-web-tracing`); the Umami tracker is loaded at runtime via script tag rather than as an npm dependency.
- **`src/infrastructure/http/index.ts`** — calls `captureException()` on 5xx responses, making the HTTP layer a producer of Faro error signals.
- **`src/main.ts`** — bootstrap entry point that calls `initFaro()` and `initUmami()` before the app mounts.
- **`src/infrastructure/observability/analytics-events.ts`** — the shared event-constant file; a byte-identical mirror of the backend's assembled catalogue, enforced by `npm run check:spec-identity`.

## Notes

- The browser talks **only** to Grafana Alloy on `:12347`; it never contacts the OTel collector (`:4318`), Loki, or Prometheus directly.
- `analytics-events.ts` is a **copy from another repo**. To add a shared event name, you change the backend module that emits it, rebuild the assembled file, and copy it here. Do **not** edit this file's backend-derived section locally.
- App-lifecycle events (`app_started`, `app_ready`, `user_logged_out`, `checkout_request_failed`) are declared in the same file but are FE-only; they have no backend counterpart.
- `checkout_request_failed` (FE: request never left the browser) is **not** the same as `checkout_failed` (BE: server rejected a received checkout). Confusing them was a past incident.
- Pageviews are captured automatically by the Umami SPA hook — there is no manual `page_view` call in the router.
- CORS: the API must allow the `traceparent` request header, or distributed traces will not link.
- All env vars gate the tools to no-ops when unset, so local dev works without the Docker/Podman stack.
