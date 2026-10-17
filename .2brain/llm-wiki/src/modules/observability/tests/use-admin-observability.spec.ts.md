---
source: src/modules/observability/tests/use-admin-observability.spec.ts
sha256: d2a9f117bea5cb93df2c85f1302d931ecdd47f87b01133914b11b39dee4826ed
generated_at: 2026-10-17T01:13:14.379013+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/tests/use-admin-observability.spec.ts

## Purpose

Unit tests for the `useAdminObservability` composable. Verifies that the two fetchers (`fetchHealth`, `fetchMetrics`) write independent state slices, that a failing endpoint degrades to an error message beside the panel that did answer, and that `fetchAll` fires both calls concurrently. Scope is limited to composition logic; audit-trail behavior is tested in `use-audit-trail.spec.ts` and async loading/error bookkeeping in `use-async-action.spec.ts`.

## Key elements

- **`HEALTH` / `METRICS`** — Typed fixture constants (`ObservabilityHealth`, `ObservabilityMetricsSummary`) used as the mock API responses. Typing them against the generated contract types turns any missing required field into a compile error.
- **`apiFailure(status, message)`** — Builds the plain-object rejection envelope that `onResponseReject` produces in production (never an `Error` instance).
- **`vi.mock('@api', …)`** — Replaces `getObservabilityHealth` and `getObservabilityMetricsOverview` with `vi.fn` stubs that resolve via `contractResponse(schema, fixture)`.
- **`describe('initial state')`** — Asserts all six reactive refs start undefined/false.
- **`describe('fetchHealth')`** — Unwrapping, loading flag lifecycle, and isolated error reporting (does not touch `errorMetrics`).
- **`describe('fetchMetrics')`** — Unwrapping and the per-panel fallback i18n key (`'admin-page.error-load-metrics'`) used only when the rejection carries no readable message (status 0).
- **`describe('fetchAll')`** — Both panels load in one call, start concurrently, and one panel's failure does not block the other.

## Relationships

- **`src/modules/observability/composables/use-admin-observability.ts`** — The composable under test; the spec imports `useAdminObservability` and exercises its public surface (`health`, `metrics`, `loadingHealth`, `loadingMetrics`, `errorHealth`, `errorMetrics`, `fetchHealth`, `fetchMetrics`, `fetchAll`).
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — Supplies `contractResponse`, which wraps a fixture value in the exact JSON envelope the generated HTTP client would unwrap, ensuring mocks mirror the real wire shape.

## Notes

- Rejections are asserted as plain objects (`{ success: false, status, message, errors[] }`), not `Error` instances. Using `Error` here would let a composable that branches on `instanceof Error` pass in tests while still showing the generic fallback to users.
- The fallback i18n key is only asserted in the `status: 0` (no body) case; when the API supplies its own message, the composable surfaces that message verbatim instead.
- `contractResponse` is imported from a `.ts` path (not a package alias), which is the project convention for cross-module test utilities outside the `@api` namespace.
