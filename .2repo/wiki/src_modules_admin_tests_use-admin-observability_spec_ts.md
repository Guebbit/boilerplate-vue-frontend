# src/modules/admin/tests/use-admin-observability.spec.ts

## Purpose

Unit tests for the `useAdminObservability` composable. The file verifies the *composition* layer: that each of the three API fetchers (health, metrics, audit logs) writes only its own state slice, that the audit pagination envelope is decomposed into `items` / `total` / `pages` rather than stored as a single object, and that a failed endpoint degrades to a per-panel error message without affecting the panels that did succeed. Loading/error bookkeeping delegated to `useAsyncAction` is explicitly out of scope here.

## Key elements

- **`apiFailure(status, message)`** – builds the rejection envelope shape (`{ success: false, status, message, errors: [message] }`) that `onResponseReject` produces in production. Used to simulate API failures so tests exercise the real code path.
- **`meta(totalItems, totalPages, page, pageSize)`** – factory for a `PaginationMeta` object used in audit-log response fixtures.
- **`describe('initial state')`** – asserts every ref starts as `undefined` / `false` / `[]` / `0`.
- **`describe('fetchHealth')`** – unwrapping, in-flight loading flag, and isolated error reporting (API message preferred over fallback).
- **`describe('fetchMetrics')`** – unwrapping and the i18n-key fallback (`'admin-page.error-load-metrics'`) when a rejection carries no readable message.
- **`describe('fetchAuditLogs')`** – envelope splitting (items + total + pages), large-pagination fidelity, filter pass-through under contract names, undefined-filter default, empty-page → zero pages, error → empty defaults + message, and replace-not-append semantics.
- **`describe('fetchAll')`** – concurrent dispatch of all three fetchers and independent resolution.

## Relationships

No external graph neighbors are recorded for this file. It imports from `@api` (mocked) and `@/modules/admin/composables/use-admin-observability` (the unit under test).

## Notes

- **Rejection shape matters.** The `apiFailure` helper mirrors the *plain-object* envelope produced by `onResponseReject`. Mocking a raw `Error` or an arbitrary throw would let a composable that reads `.message` off a non-`Error` object pass while showing its fallback to real users.
- **Fallback vs. API message.** When the rejection carries a `message`, the composable surfaces *that* string. The i18n fallback key (e.g. `'admin-page.error-load-metrics'`) is only used when no readable message exists (e.g. `{ status: 0 }`). Tests assert both paths.
- **Zero pages ≠ one empty page.** An audit response with `totalItems: 0` yields `auditPages.value === 0`, which the pager component uses to hide itself. Tests pin this to prevent off-by-one pager rendering.
- **`deleteExpiredTokens`** is mocked but not yet exercised in the visible test blocks; it is included in the `@api` mock to keep the module interface complete.
- **Conventions:** `vi.mock('@api', …)` at module level; `vi.clearAllMocks()` in `beforeEach`; async assertions use `expect(promise).resolves` or chained `.then()` rather than `await` inside `it` blocks.
