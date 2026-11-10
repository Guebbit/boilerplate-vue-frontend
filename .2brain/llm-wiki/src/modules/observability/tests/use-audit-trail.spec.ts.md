---
source: src/modules/observability/tests/use-audit-trail.spec.ts
sha256: 3b4364ab46811a549e8686e14fbd95b96148ed2a4e48c7755f5286259eed6ef5
signature: 2f07ae94abcfaf2aa76f6b16becb11e969c94d401236f3006322feeb9f17eef3
generated_at: 2026-11-10T04:56:06.206007+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/tests/use-audit-trail.spec.ts

## Purpose

Vitest unit tests for the `useAuditTrail` composable. They pin the observable contract of the composable for both the **platform** (`GET /observability/audit`) and **shop** (`GET /audit`) endpoints: which API function each `endpoint` string routes to, which filters are forwarded vs. stripped, how the response envelope is split into `entries`/`total`/`pages`, and how a failed call degrades to an `error` string instead of rejecting.

## Key elements

- **`meta(totalItems, …)`** — local helper that builds a `PaginationMeta` object for mock responses.
- **`EVENT_ITEM` / `ENTRY_ITEM`** — single-row `AuditEntryItem` fixtures (platform row has no `targetType`/`targetId`; shop row does).
- **`apiFailure(status, message)`** — builds a Problem Details reject envelope via `aProblem` for error-path tests.
- **`vi.mock('@api')`** — replaces both `listObservabilityAuditEntries` and `listAuditEntries` with mocks that resolve a `contractResponse`-wrapped envelope by default.
- **`describe('useAuditTrail — platform endpoint')`** — five tests covering: correct API call + envelope split; `target`/`ownOrder` are *never* forwarded; all declared filters pass through by name; `datetime-local` `since` is converted to ISO; failure yields empty page + `error` string.
- **`describe('useAuditTrail — shop endpoint')`** — four tests covering: correct API call + envelope split; `target` is forwarded; empty-string `target` becomes `undefined`; `ownOrder: true` is forwarded but `ownOrder: false` is omitted (sent as `undefined`).

## Relationships

- **`src/modules/observability/composables/use-audit-trail.ts`** — the system under test; the spec imports `useAuditTrail` and exercises its returned `entries`, `total`, `pages`, `error`, and `fetchPage`.
- **`tests/support/unit/orval-fixture-schema.ts`** — provides `contractResponse`, which wraps payload objects in the exact shape the Orval-generated response schema expects, so the mock resolves a structurally valid envelope.
- **`tests/support/unit/fixtures.ts`** — provides `aProblem`, a small factory for RFC 7807 Problem Details objects used in the error-path test.

## Notes

- **Filter absence convention:** Both `target: ''` and `ownOrder: false` are transmitted as `undefined` (key omitted), not as empty-string or literal `false`. The composable treats "off" as absence; tests assert this explicitly.
- **`target`/`ownOrder` on platform:** The platform contract declares neither filter. The composable strips them before calling `listObservabilityAuditEntries`; tests assert the keys are *not present* in the call argument using `expect.not.objectContaining`.
- **`since` normalization:** A `datetime-local` input yields a string with no timezone (e.g. `'2026-09-24T10:00'`). The composable converts it via `new Date(…).toISOString()` before sending; the test verifies the ISO form arrives at the API boundary.
- **Error path never rejects:** A rejected API call is caught inside the composable and surfaced as `error.value` (a string) with `entries` reset to `[]`, `total`/`pages` to `0`. The test uses `mockRejectedValueOnce` to trigger this.
- **`vi.clearAllMocks()` in `beforeEach`** ensures call-count assertions (`toHaveBeenCalledTimes(1)`, `.not.toHaveBeenCalled()`) are isolated per test.
