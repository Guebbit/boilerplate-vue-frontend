---
source: tests/unit/infrastructure/observability/store-faro.spec.ts
sha256: ae1e0869ac70e0eb4c57ab82023c88680767438ca7e6939698643f9df54b99cf
generated_at: 2026-10-17T02:38:23.375843+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/observability/store-faro.spec.ts

## Purpose

Unit tests for the **Faro-enabled** path of `src/infrastructure/observability/store.ts`. While `observability.spec.ts` covers the disabled state, this file verifies what this repo actually hands to the Faro SDKs: the `initializeFaro` config object, the one-shot init-promise semantics (idempotency, retry-after-failure, no-collector short-circuit), consent-driven instrumentation add/remove, and the token-stripping helpers (`stripSensitiveUrlParts`, `stripTokensFromTelemetry`). Both SDK modules are mocked at the boundary so only this repo's own arguments are asserted.

## Key elements

- **`vi.mock('@grafana/faro-web-sdk')`** — replaces `initializeFaro` with a spy returning `fakeFaro`; exports each instrumentation class as a named `vi.fn` so tests can assert *which* ones are passed.
- **`vi.mock('@grafana/faro-web-tracing')`** — replaces `TracingInstrumentation` with a constructor spy that pushes its `options` into `tracingOptions` for later assertion on `propagateTraceHeaderCorsUrls`.
- **`faroApi` / `faroInstrumentations` / `fakeFaro`** — the mock surface the store calls (`setUser`, `resetUser`, `pushError`, `instrumentations.add/remove`).
- **`namedInstrumentation(name)`** — factory returning a `vi.fn` that sets `this.name`; used so specs can read back *which* instrumentation was constructed.
- **`bootInstrumentations()`** — helper that extracts the `name` field from every instrumentation in the last `initializeFaro` call.
- **`namesOf(call)`** — extracts names from a single `instrumentations.add/remove` call's arguments.
- **`fakeTransportItem(overrides)`** — builds a minimal `TransportItem` shape for `stripTokensFromTelemetry` tests.
- **Test suites** — `Faro before consent`, `setFaroConsent`, `initFaro`, `stripSensitiveUrlParts`, `stripTokensFromTelemetry`.
- **Env stubbing** — `VITE_FARO_URL`, `VITE_FARO_APP_NAME`, `VITE_FARO_APP_VERSION`, `VITE_FARO_ENVIRONMENT`, `VITE_API_URL`, `VITE_UMAMI_WEBSITE_ID` are set in `beforeEach` and cleaned in `afterEach`.

## Relationships

- **`tests/support/stub.ts`** — imports `asStub`, a type-unsafe cast helper used to destructure `initializeFaro.mock.calls.at(-1)` without an explicit `as` annotation.
- **`@/infrastructure/observability/store.ts`** (SUT) — imports `useObservabilityStore`, `stripSensitiveUrlParts`, `stripTokensFromTelemetry`; all assertions target this module's public surface.
- **`@grafana/faro-web-sdk`** — fully mocked via `vi.mock`; no real SDK code executes.
- **`@grafana/faro-web-tracing`** — fully mocked via `vi.mock`; the `TracingInstrumentation` constructor is a spy.
- **`pinia`** — `createPinia` / `setActivePinia` provide a fresh store instance per test.

## Notes

- **`vi.mock` hoisting & TDZ**: `tracingOptions` is a module-level array, but the mock factory runs *before* that line executes. The `TracingInstrumentation` mock reads `tracingOptions` at *call* time (inside the function body), not at factory time, avoiding a temporal-dead-zone error.
- **Function expressions instead of classes**: Both `namedInstrumentation` and the `TracingInstrumentation` mock use `vi.fn(function …)` rather than `class` because the project's lint rule rejects classes whose only member is a field or constructor. An arrow function can't be used because the store calls them with `new`.
- **Retry-after-failure is intentional**: `faroInitPromise` is only cached on *success*. A thrown init (e.g. CDN 502) does not poison subsequent calls — the test explicitly verifies a second `initFaro()` succeeds.
- **Consent-before-load**: `setFaroConsent(true)` called before `initFaro()` resolves is queued and applied once Faro is ready; the test asserts `instrumentations.add` is a no-op until `initFaro` completes.
- **Token stripping is security-critical**: One-time email tokens (`?token=…`) are the sole credential for their action. `stripSensitiveUrlParts` and `stripTokensFromTelemetry` exist to keep them out of every Faro-shipped event. The `beforeSend` hook passed to `initializeFaro` is asserted to be exactly `stripTokensFromTelemetry`.
