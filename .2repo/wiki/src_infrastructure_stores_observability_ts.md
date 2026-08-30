# src/infrastructure/stores/observability.ts

## Purpose

A single Pinia store that wraps two independent, lazily-initialized telemetry SDKs—Grafana Faro (errors, tracing, web-vitals) and Umami (product analytics)—behind one unified API. It exists to eliminate init-order problems between the two SDKs, to buffer boot-time analytics events that would otherwise be lost to the script-load round-trip, and to give components, stores, and router code a single import point for observability.

## Key elements

- **`useObservabilityStore`** — The sole export; a Pinia setup store (`defineStore('observability', …)`).
- **`initFaro()`** — Dynamically imports `@grafana/faro-web-sdk` + `@grafana/faro-web-tracing`, wires up web-instrumentations (uncaught errors, CWV, session) and a `TracingInstrumentation` that propagates `traceparent` to the API origin. Returns `Promise<boolean>`; concurrent calls share one setup via `faroInitPromise`.
- **`initUmami()`** — Injects the Umami tracker `<script>` tag (guarded against HMR duplicates), attaches a `load` listener that triggers `flushPendingEvents`. Returns `boolean`.
- **`track(event, properties?)`** — Records a product-analytics event. Buffers into `pendingEvents` (capped at 50) if the script hasn't loaded yet; drops events entirely if Umami is disabled by config.
- **`flushPendingEvents()`** — Splices all buffered events and replays them through `globalThis.umami.track()`. No-op until the script global exists.
- **`identifyUser(userId, email?)`** — Sets user context in Faro (`faro.api.setUser`) and calls `umami?.identify?.()` (Umami v2.11+).
- **`unidentifyUser()`** — Calls `faro.api.resetUser()`; intended for logout / account deletion.
- **`captureException(error, hints?)`** — Normalizes the error and pushes it to Faro with optional stringified context data. No-op if Faro isn't ready.
- **`normalizeContext(data)`** — Module-level helper that coerces arbitrary values to strings (JSON for non-strings) for Faro's error-context contract.
- **`UmamiTracker`** — Local interface describing the shape of the `window.umami` global; declared via `declare global`.
- **`faroReady` / `umamiReady`** — Reactive readiness flags exposed on the store for conditional UI or logic.

## Relationships

- **`src/infrastructure/observability/analytics-events.ts`** — Imports the `AnalyticsEventName` type, the published catalogue of valid event names used by `track()` and `pendingEvents`.
- **`package.json`** — Provides the runtime dependencies: `pinia`, `vue`, `lodash-es` (`mapValues`), and the dynamically imported `@grafana/faro-web-sdk` / `@grafana/faro-web-tracing`.
- **`src/main.ts`** — App bootstrap entry; the expected caller of `initFaro()` and `initUmami()` before the UI is interactive, ensuring boot-time events are captured.
- **`tests/unit/infrastructure/stores/`** — Unit tests that exercise this store (initialization paths, event buffering, identity calls).
- **`docs/theory/architecture.md`** — Documents the upstream data flow (Faro → Grafana Alloy → Loki / Tempo / Prometheus) that this store feeds into.
- **`docs/index.md`** — Documentation index referencing the observability architecture section.

## Notes

- Both SDKs are **dynamically imported** (`import('@grafana/faro-web-sdk')`), so they are excluded from the critical entry bundle.
- The `faro` instance handle is deliberately **non-reactive** (a plain `let`); only `faroReady` is exposed as a ref.
- `pendingEvents` is capped at **50**; when full, the *oldest* event is dropped (`shift()`), preserving the most recent user actions.
- Events are **dropped** (not buffered) when Umami is disabled by config—buffering only applies when the script is expected but not yet loaded.
- The store is designed to be callable from **non-setup contexts** (stores, router guards) as long as the call is inside a function body, not at module top-level.
- Umami script injection is **HMR-safe**: a `querySelector` for `script[data-website-id=…]` prevents double-injection during hot reloads.
- The `globalThis.umami` global is the **only** signal that the tracker is ready; there is no `onload` callback or promise from the script itself.
