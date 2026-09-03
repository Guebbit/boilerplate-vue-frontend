# src/modules/admin/tests/use-admin-observability.spec.ts

## Purpose

Unit tests for the `useAdminObservability` composable, focused exclusively on the **composition layer**: that each of the three fetchers writes its own state slice without leaking into the others, that the audit envelope is decomposed into `items` + pagination meta (not stored as one opaque object), and that a dead endpoint degrades to a per-panel error message while the other panels still render. Loading/error bookkeeping delegated to `useAsyncAction` is intentionally out of scope.

## Key elements

- **Mocked API surface (`@api`)** — `getObservabilityHealth`, `getObservabilityMetricsOverview`, `getObservabilityAuditLogs`, `deleteExpiredTokens` are all `vi.mock`-ed to return canned responses.
- **`meta(totalItems, totalPages?, page?, pageSize?)`** — helper that builds a `PaginationMeta`-shaped object for audit-log fixtures.
- **`apiFailure(status, message)`** — constructs the exact rejection envelope that `onResponseReject` produces in production (a plain object with `success`, `status`, `message`, `errors[]`), never an `Error` instance.
- **`describe` blocks** — `initial state`, `fetchHealth`, `fetchMetrics`, `fetchAuditLogs`, `fetchAll`; each asserts state isolation, response unwrapping, error isolation, filter-payload pass-through, and concurrency.

## Relationships

No registered graph neighbors. The file's only runtime dependencies are:

- `@/modules/admin/composables/use-admin-observability` — the composable under test.
- `@api` — the API client module (mocked wholesale via `vi.mock`).

## Notes

- **Resolves, never rejects.** Every `fetch*` call is expected to *resolve* (possibly `undefined`), with errors landing in `errorHealth` / `errorMetrics` / `errorAudit` state. A test that expects a thrown promise would be wrong by design.
- **Rejection shape matters.** Tests reject with the `apiFailure()` envelope, not a raw `Error`, to mirror what `onResponseReject` actually throws. The fallback-message test (`errorMetrics` → `'admin-page.error-load-metrics'`) only triggers when the rejection carries no readable `message` (e.g. `{ status: 0 }`).
- **Filter payload is fully keyed.** Calling `fetchAuditLogs()` with no arguments still sends every filter key as `undefined`; the test asserts the exact call signature rather than a partial object.
- **Empty audit page → 0 pages.** An empty result sets `auditPages` to `0`, not `1`; the UI pager hides itself below two pages.
- **`fetchAll` is concurrent.** The test asserts all three `loading*` flags are `true` *before* any promise settles, confirming parallel dispatch rather than sequential chaining.
- **`deleteExpiredTokens` is mocked but not exercised** in the visible portion of the file; it is included in the mock to prevent accidental real calls.
