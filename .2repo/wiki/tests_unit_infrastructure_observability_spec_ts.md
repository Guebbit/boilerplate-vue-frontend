# tests/unit/infrastructure/observability.spec.ts

## Purpose

Unit tests for the observability store (`@/infrastructure/observability/store.ts`). This file was written because the telemetry surface had 123 mutants with zero coverage. It exercises the Umami script-injection path and every "Faro disabled" safety branch — the state a real visitor actually sees when `VITE_FARO_URL` is absent.

## Key elements

- **`installUmamiTracker()`** – Installs a mock `globalThis.umami` object with a spy `identify` method; returns the spy for assertions.
- **`readyStore()`** – Stubs `VITE_UMAMI_WEBSITE_ID` / `VITE_UMAMI_SRC`, calls `store.initUmami()`, and returns the store in its post-init state.
- **`describe('initUmami')`** – Four tests covering: no-op when no website ID, whitespace-only ID treated as unset, deferred `<script>` injection with correct `src`/`data-website-id`, and idempotency (multiple calls produce one script tag).
- **`describe('with Faro disabled')`** – Six tests verifying that `identifyUser`, `unidentifyUser`, and `captureException` are safe no-ops (or degrade gracefully) when `globalThis.umami` is missing or lacks methods, and that `faroReady` stays `false`.

## Relationships

No graph neighbors are recorded for this file. It imports `useObservabilityStore` from `@/infrastructure/observability/store.ts` and depends on `pinia` for store activation, but those edges are not present in the dependency graph.

## Notes

- **`initFaro` is deliberately untested.** It dynamically imports `@grafana/faro-web-sdk` and `@grafana/faro-web-tracing`; testing it would either pull two large SDKs into jsdom or reduce assertions to mock shape. The branches it *controls* (the safety no-ops) are covered instead.
- **`afterEach` deletes `globalThis.umami`.** The real Umami script attaches its tracker to `window`; without cleanup, a test that never initialised analytics would still see a previous test's spy.
- **`captureException` must never throw** — it is invoked from the router's `onError` handler, so a throw would replace a page-level error with a crash inside the error handler itself.
- **`beforeEach` clears `document.head.innerHTML`** to guarantee the script-injection assertions start from a clean DOM.
