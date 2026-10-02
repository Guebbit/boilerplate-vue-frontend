---
source: src/modules/observability/tests/use-admin-observability.spec.ts
sha256: fa6eb12bf3077fddab6a3739f122460393c823cc82274297fdc60babb5368feb
generated_at: 2026-10-02T15:19:31.366202+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/tests/use-admin-observability.spec.ts

## Purpose

Unit tests for the `useAdminObservability` composable. The file asserts the **composition contract**: each fetcher writes only its own slice of state, a dead endpoint degrades to a per-panel error message without blocking the panel that answered, and the sole write action (`clearExpiredTokens`) rejects rather than swallowing. Loading/error bookkeeping and the audit trail are explicitly out of scope (see `use-async-action.spec.ts` and `use-audit-trail.spec.ts`).

## Key elements

- **`HEALTH` / `METRICS`** – Typed fixture objects (`ObservabilityHealth`, `ObservabilityMetricsSummary`). Adding a required field to the API contract produces a compile error here before any endpoint can ship without it.
- **`apiFailure(status, message)`** – Builds the rejection envelope exactly as `onResponseReject` emits it (a plain object, never an `Error`). Used to simulate API failures.
- **`vi.mock('@api', …)`** – Stubs `getObservabilityHealth`, `getObservabilityMetricsOverview`, and `deleteExpiredTokens`, wrapping return values through `contractResponse` so the shape matches the real orval client.
- **`describe('initial state')`** – Asserts all refs start `undefined`/`false`.
- **`describe('fetchHealth')` / `describe('fetchMetrics')`** – Per-panel success, in-flight loading flag, and failure isolation (one panel's error never leaks into the other's state).
- **`describe('fetchAll')`** – Both panels load concurrently; one panel's failure still lets the other render.
- **`describe('clearExpiredTokens')`** – Pending-flag lifecycle, resolution (view owns the user-facing message), and pass-through rejection on failure (`.finally` clears the spinner).

## Relationships

- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – Provides `contractResponse`, which wraps fixture data into the exact response envelope the orval-generated client returns. Every mocked API call in this file funnels through it, ensuring tests exercise the same unwrapping path as production.
- **`@/modules/observability/composables/use-admin-observability`** – The system under test; the composable's public API (`health`, `metrics`, `loadingHealth`, `loadingMetrics`, `errorHealth`, `errorMetrics`, `clearingExpiredTokens`, `fetchHealth`, `fetchMetrics`, `fetchAll`, `clearExpiredTokens`) is exercised throughout.
- **`@api` (mocked)** – `getObservabilityHealth`, `getObservabilityMetricsOverview`, `deleteExpiredTokens`; their call counts and rejection shapes are the primary assertions.

## Notes

- Rejections are simulated as **plain objects**, not `Error` instances. This mirrors `onResponseReject` output and guards against a composable that would pass if it checked `instanceof Error` while showing the generic fallback to real users.
- The fallback-message test for metrics rejects with `{ status: 0 }` (no `message` field) specifically to hit the i18n key `admin-page.error-load-metrics` — the only code path where the composable supplies its own copy rather than relaying the API's message.
- `clearExpiredTokens` is the **only** action that rejects to the caller. The two reads swallow errors into their own `error*` refs. Tests assert `.rejects.toBe('down')` to pin this asymmetry.
- `beforeEach` calls `vi.clearAllMocks()`; there is no `afterEach` reset because the composable is re-instantiated per test.
