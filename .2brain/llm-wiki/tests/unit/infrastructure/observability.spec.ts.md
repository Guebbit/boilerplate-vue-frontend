---
source: tests/unit/infrastructure/observability.spec.ts
sha256: e4259d0f7ff84b85e8007f155eff7192af9f5d061ccd832d0083203feb5535cc
generated_at: 2026-10-17T02:37:57.203872+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/observability.spec.ts

## Purpose

Unit tests for `useObservabilityStore` (the Pinia store in `@/infrastructure/observability/store.ts`). This file was added to cover the previously zero-coverage telemetry surface, which carried 123 uncovered mutants. It exercises the Umami analytics integration (consent gating, script injection, identity APIs) and verifies that every Faro-dependent method is a safe no-op when Faro is not initialised.

## Key elements

- **`installUmamiTracker`** – helper that assigns a mock `{ identify: vi.fn() }` to `globalThis.umami`, simulating the object the real Umami script attaches to `window`.
- **`readyStore`** – helper that stubs the `VITE_UMAMI_*` env vars, creates the store, and calls `initUmami()`, returning the store in its "ready" state.
- **`describe('setUmamiConsent')`** – six tests covering: no-op without a website id, consent-withheld behaviour (script absent, `localStorage['umami.disabled']` set), consent-granted behaviour (script present, flag cleared), `VITE_UMAMI_REQUIRE_CONSENT=false` bypass, `excludeHash`/`excludeSearch` dataset attributes on the injected script, and survival when `Storage.prototype.setItem` throws.
- **`describe('initUmami')`** – four tests covering: no injection without a website id, whitespace-only id treated as unset, deferred `<script>` injection with correct `src` and `defer` attribute, and the single-injection guard (calling `initUmami` repeatedly still yields exactly one script tag).
- **`describe('with Faro disabled')`** – seven tests verifying that `identifyUser`, `unidentifyUser`, and `captureException` never throw when `globalThis.umami` is absent, partial, or fully present, and that `faroReady` reports `false`.

## Relationships

- **`@/infrastructure/observability/store.ts`** (imported via `useObservabilityStore`) – the sole subject under test. No other graph neighbors are listed.
- **`pinia`** (`createPinia`, `setActivePinia`) – provides a fresh store instance per test.
- **`vitest`** (`vi.stubEnv`, `vi.fn`, `vi.spyOn`) – environment stubbing and mock utilities.

## Notes

- **`initFaro` is deliberately untested.** It dynamically imports two Grafana SDK packages; testing it would either load them into jsdom or reduce the test to asserting mock shape. Instead, the tests cover every branch that Faro's *absence* controls.
- **Global tracker hygiene.** Because the real Umami script attaches to `window`, `afterEach` deletes `globalThis.umami` and `beforeEach` clears `document.head.innerHTML` to prevent cross-test contamination.
- **`captureException` must never throw.** It is called from the router's `onError` handler, so a throw would replace a page error with a crash inside the error handler itself. Tests confirm it tolerates `Error`, strings, `undefined`, and arbitrary extra arguments.
- **`readyStore` contains a duplicated `vi.stubEnv('VITE_UMAMI_SRC', …)` line** (harmless but a copy-paste artifact).
- Environment is configured via `vi.stubEnv` per-test rather than a `.env.test` file; all stubs are unstubbed in `afterEach`.
