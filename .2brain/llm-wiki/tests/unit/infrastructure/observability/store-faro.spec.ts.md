---
source: tests/unit/infrastructure/observability/store-faro.spec.ts
sha256: fbe9b590e13574af98904479d94dbad9d8cc2a828e58fc67eb0ebd6489de4f62
signature: a3eca7219165e14d65949082c6a72c5402cd4dc5dbecc4b5d748a46f5d082a98
generated_at: 2026-11-10T08:02:36.011994+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/observability/store-faro.spec.ts

## Purpose

Unit tests for the Faro-enabled half of `src/infrastructure/observability/store.ts`. While the companion `observability.spec.ts` covers the disabled state, this file verifies the repo's own mapping: the config object handed to `initializeFaro`, the one-shot init promise, consent-driven pause/unpause of the transport, trace-header propagation, and the token-stripping `beforeSend` hook. Both Faro SDKs are mocked at the module boundary; only this repo's arguments are asserted, never SDK-internal behaviour.

## Key elements

- **`fakeFaro` / `faroApi` / `faroInstrumentations`** – In-memory stand-ins for the Faro SDK instance; every method is a `vi.fn()` so calls can be asserted individually.
- **`initializeFaro`** – `vi.fn` stub returning `fakeFaro`; the single point where the store "talks" to the SDK.
- **`namedInstrumentation(name)`** – Factory returning a function-expression (not a class) that sets `this.name`; used to mock each Faro instrumentation so specs can read back *which* ones were built.
- **`tracingOptions: unknown[]`** – Array populated inside the mocked `TracingInstrumentation` constructor body so specs can inspect `propagateTraceHeaderCorsUrls` after init.
- **`vi.mock('@grafana/faro-web-sdk', …)`** – Replaces the entire Faro web SDK module with the stubs above.
- **`vi.mock('@grafana/faro-web-tracing', …)`** – Replaces the tracing SDK's `TracingInstrumentation` with a spy that records its options argument.
- **`bootInstrumentations()`** – Helper that reads the last `initializeFaro` call and returns the ordered list of instrumentation names.
- **`describe('Faro before consent')`** – Verifies Faro is not loaded without consent, the exact instrumentation set, and that session tracking is disabled.
- **`describe('setFaroConsent')`** – Covers grant → boot + unpause, idempotency, withdrawal → pause (never `remove`), re-grant → unpause without re-boot, race with in-flight loading, and no-op when config disables Faro.
- **`describe('initFaro')`** – Verifies `faroReady` flag, config passthrough (url, app, ignoreUrls), trace-header regex for the API origin, one-shot init under concurrent callers, retry-after-rejection semantics, and the `beforeSend: stripTokensFromTelemetry` hook.
- **`describe('stripSensitiveUrlParts')`** – Unit tests for the exported URL-sanitising helper (strips query string and fragment).

## Relationships

- **`tests/support/stub.ts`** — Provides `asStub`, imported and used by the `bootInstrumentations()` helper to extract typed arguments from mock call records.
- **`tests/support/unit/fixtures.ts`** — Provides `aProblem`, imported for constructing problem-detail payloads in error-normalisation assertions.
- **`scripts/eslint/no-hover-only.ts`** — A lint rule that forbids classes whose sole member is a field or constructor. The instrumentation stubs in this file deliberately use function expressions (e.g. `vi.fn(function (this) { this.name = … })`) rather than class declarations to comply with this rule, as noted in inline comments.

## Notes

- `vi.mock` factories are hoisted above all variable declarations. The `TracingInstrumentation` mock therefore pushes into `tracingOptions` inside the constructor *body* rather than capturing the array in the factory closure (which would hit a temporal dead zone).
- Consent withdrawal uses `faro.pause()` / `faro.unpause()` rather than `instrumentations.remove()` because the SDK's `remove` only detaches the last-added instrumentation.
- The one-shot guard is `faroInitPromise ??=`; a rejected init is intentionally *not* cached so the next call retries (previously a bug where a transient CDN failure permanently disabled Faro).
- The `NavigationInstrumentation` is explicitly excluded from the boot set; assertions verify it is absent.
