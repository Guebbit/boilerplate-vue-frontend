---
source: tests/unit/infrastructure/observability.spec.ts
sha256: 80211358a182770901746bd4a1c526bffb1fa14ddc78cac3456b3eeb1c97ff4a
signature: 4135ecdbb0be2352873f278939b08c73242a556ef534a12ea5d58f6b1f118c44
generated_at: 2026-11-10T08:01:56.997328+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/observability.spec.ts

## Purpose
Unit tests for the observability Pinia store, covering the Umami analytics injection/consent flow and the safety guarantees of `captureException` while Faro is disabled. The file was written to close the repo's largest untested surface (123 unmutated mutants in the telemetry module).

## Key elements
- **`readyStore()`** — helper that stubs Umami env vars, creates the store, calls `initUmami()`, and returns the store in a "tracker-injected" state.
- **`setUmamiConsent` block** — verifies consent gating (withhold / load tracker), `localStorage` flag (`umami.disabled`), the `VITE_UMAMI_REQUIRE_CONSENT=false` bypass, the `data-exclude-hash`/`data-exclude-search` attributes on the injected `<script>`, and graceful behaviour when `localStorage.setItem` throws.
- **`initUmami` block** — verifies the no-op path (empty/whitespace website id), correct script attributes (`src`, `defer`), the `umamiReady` flag, and idempotency (repeated calls produce exactly one `<script>` tag).
- **"with Faro disabled" block** — asserts `captureException` is a safe no-op for `Error`, string, `undefined`, and a second-arg metadata object; asserts `faroReady` is `false`.

## Relationships
No graph neighbors are recorded for this file. Its sole import under test is the observability store, and all assertions target the DOM and `localStorage` directly via Vitest's jsdom environment.

## Notes
- **`initFaro` is intentionally untested.** The header comment explains that exercising it would require loading two large Grafana SDKs into jsdom or mocking them so thoroughly the assertions become tautological. Instead, every branch *gated* by Faro's absence (the no-op path) is tested.
- **`readyStore()` contains a duplicated `vi.stubEnv('VITE_UMAMI_SRC', …)` line.** Harmless but a copy-paste artifact; not a bug in the code under test.
- All env-var stubs use `vi.stubEnv`, which mutates `import.meta.env`-style access; `beforeEach` clears mocks and `document.head` but does **not** call `vi.unstubAllEnvs()`, so env state can leak between describes within the same file run.
- The "survives blocked storage" test spies on `Storage.prototype.setItem` and restores it manually at the end of the test rather than relying on the `beforeEach` cleanup.
