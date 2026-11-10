---
source: src/modules/observability/tests/use-admin-observability.spec.ts
sha256: 9fcc030d9269cce1e7fcb72d9295fb5ff5af9247abce661783cc1cced839e888
signature: 8efd48c4001841ac75ed3e16858b48f07fc7a142d18bdd3fa23b5b365282dd72
generated_at: 2026-11-10T04:55:52.175580+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/tests/use-admin-observability.spec.ts

## Purpose

Unit tests for the `useAdminObservability` composable's composition layer: verifying that each fetcher writes only its own slice of reactive state, that a failing endpoint degrades to an error message beside the panel that succeeded, and that the correct error message (API-supplied vs. i18n fallback) surfaces in each case. Loading/error mechanics delegated to `useAsyncAction` and audit-trail behavior are explicitly out of scope.

## Key elements

- **`HEALTH` / `METRICS`** — Typed fixtures matching the `ObservabilityHealth` and `ObservabilityMetricsSummary` contracts; used as both mock return values and equality assertions.
- **`apiFailure(status, message)`** — Builds the exact rejection envelope (a plain object via `aProblem`, *not* an `Error`) that `onResponseReject` produces in production, so composable message-extraction is tested against the real shape.
- **`vi.mock('@api')`** — Stubs both `getObservabilityHealth` and `getObservabilityMetricsOverview` to resolve via `contractResponse`, giving the composable a realistic response wrapper to unwrap.
- **`describe('initial state')`** — Asserts all six refs (`health`, `metrics`, `loadingHealth`, `loadingMetrics`, `errorHealth`, `errorMetrics`) start at their idle values.
- **`describe('fetchHealth')` / `describe('fetchMetrics')`** — Per-fetcher tests: successful unwrap, in-flight loading flag, and failure isolation (one panel's error never leaks into the other's state).
- **`describe('fetchAll')`** — Verifies both calls start concurrently, both panels populate on success, and a single-panel failure still leaves the other panel's data intact.

## Relationships

- **`src/modules/observability/composables/use-admin-observability.ts`** — The unit under test; the spec imports `useAdminObservability` and exercises its returned refs and methods.
- **`tests/support/unit/orval-fixture-schema.ts`** — Provides `contractResponse`, which wraps a typed fixture into the same response envelope the real HTTP client returns, so the composable's unwrapping logic is exercised.
- **`tests/support/unit/fixtures.ts`** — Provides `aProblem`, the helper that constructs the rejection object shape matching `onResponseReject`'s output.
- **`@api`** (module boundary) — Mocked entirely; the spec asserts call counts on `getObservabilityHealth` and `getObservabilityMetricsOverview` and controls their resolve/reject values per test.

## Notes

- Rejections are deliberately **plain objects**, not `Error` instances. The inline comment explains that asserting against `Error` would mask a composable that only reads `.message` off `instanceof Error` objects — a bug that would show the i18n fallback to every user.
- The i18n fallback key (`'admin-page.error-load-metrics'`) is asserted only for the *no-readable-message* case (status 0, no body). When the API returns a message, that message is surfaced verbatim — the fallback is a last resort, not the default.
- Audit-trail behavior is intentionally excluded; it lives in `use-audit-trail.spec.ts`. Loading/error state-machine semantics are covered in `tests/unit/infrastructure/use-async-action.spec.ts`. This file asserts only the composable-specific configuration (fallback messages, state isolation).
