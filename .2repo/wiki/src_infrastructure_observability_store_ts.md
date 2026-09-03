# src/infrastructure/observability/store.ts

## Purpose

A single Pinia store that wraps two independent, lazily-initialised telemetry SDKs—Grafana Faro (errors, tracing, web-vitals) and Umami (pageview analytics)—behind one unified API. It exists so that components, stores, and router hooks can all call the same observability functions without init-order concerns, and so that the two SDKs' lifecycles are co-located and independently gated by environment config.

## Key elements

- **`useObservabilityStore`** – The Pinia store (id `observability`). Exposes state (`faroReady`, `umamiReady`), init functions, and a unified user/error API.
- **`initFaro()`** – Dynamically imports `@grafana/faro-web-sdk` and `@grafana/faro-web-tracing`, initialises Faro with web-instrumentations (errors, vitals, sessions) plus a `TracingInstrumentation` that propagates `traceparent` to the API origin. Idempotent: concurrent calls share one in-flight promise. Returns `false` when `VITE_FARO_URL` is unset.
- **`initUmami()`** – Injects the Umami `<script>` tag (with a `data-website-id` guard against HMR double-injection). Returns `false` when `VITE_UMAMI_WEBSITE_ID` is unset. Pageviews are recorded by the script itself; no per-call API is needed.
- **`identifyUser(userId, email?)`** – Sets user context on Faro (`faro.api.setUser`) and best-effort calls `window.umami.identify` (Umami v2.11+).
- **`unidentifyUser()`** – Calls `faro.api.resetUser()`; used on logout / account deletion.
- **`captureException(error, hints?)`** – Normalises a thrown value (stringifies non-`Error`) and pushes it to Faro with optional stringified context via `normalizeContext`.
- **`normalizeContext(data)`** – Local helper that coerces a `Record<string, unknown>` into `Record<string, string>` (JSON-serialises non-strings) to satisfy Faro's error-context shape.
- **`UmamiTracker` / `declare global { var umami }`** – Minimal type for the `window.umami` object the tracker script attaches; only `identify` is declared.

## Relationships

- **`@/infrastructure/observability/config.ts`** – Provides `readFaroConfig`, `readUmamiConfig`, and `originToRegExp`. The store reads all three at init time; no config is stored in reactive state.
- **`@/infrastructure/utils/logger.ts`** – Provides the shared `logger` used for debug-level trace messages on init and disable paths.
- **`@grafana/faro-web-sdk` / `@grafana/faro-web-tracing`** – Dynamically imported inside `initFaro`; kept out of the critical entry bundle.
- **`lodash-es`** – `mapValues` used by `normalizeContext`.

## Notes

- **No `track()` / `trackEvent()` function exists by design.** The module doc explicitly states that anything with an API request behind it is reported by the backend, and Umami's pageview tracking is self-managing. There is intentionally no client-side custom-event emission.
- **`faro` is a plain `let`, not a `ref`.** It is an imperative SDK handle, not reactive state. Consumers should not read it directly; use the store's methods.
- **`faroInitPromise`** guards against double-initialisation. If `initFaro` is called twice before the first resolves, both callers receive the same promise.
- **Umami script injection is idempotent** via a `querySelector` on `data-website-id`, protecting against HMR re-runs in dev.
- **Both SDKs are independently gateable.** A deployment can enable Faro without Umami or vice-versa; each init returns early (and logs) when its config is absent.
