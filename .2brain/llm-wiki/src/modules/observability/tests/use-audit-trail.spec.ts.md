---
source: src/modules/observability/tests/use-audit-trail.spec.ts
sha256: 84f8852bdc4e536fdbb67a94eaf58491cd7d6a5cf96102946266eb1a09dfaebb
generated_at: 2026-10-02T15:19:51.522280+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/tests/use-audit-trail.spec.ts

## Purpose
Unit tests for the `useAuditTrail` composable, verifying that each `endpoint` value routes to the correct API contract, that the `target` filter is merged into shop requests but excluded from platform requests, that the response envelope is split into `entries`/`total`/`pages`, and that a failed call degrades to an `error` string rather than rejecting.

## Key elements
- **`meta(totalItems, …)`** — helper that builds a `PaginationMeta` object with sensible defaults.
- **`EVENT_ITEM`** — a fully-typed `AuditEventItem` fixture for platform-trail responses.
- **`ENTRY_ITEM`** — a fully-typed `AuditEntryItem` fixture for shop-trail responses.
- **`apiFailure(status, message)`** — builds a failure envelope matching the API error shape.
- **`vi.mock('@api', …)`** — replaces `getObservabilityAuditLogs` and `listAuditEntries` with resolvers that return schema-validated responses via `contractResponse`.
- **`describe('useAuditTrail — platform endpoint')`** — asserts correct endpoint routing, filter passthrough, datetime-local → ISO conversion, and error degradation.
- **`describe('useAuditTrail — shop endpoint')`** — asserts correct endpoint routing, `target` merge behavior (present when fixed, `undefined` when absent), and that `getObservabilityAuditLogs` is never called.

## Relationships
- **SUT:** imports `useAuditTrail` from `@/modules/observability/composables/use-audit-trail.ts` — the composable under test.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`:** imports `contractResponse`, which wraps a response payload against the generated Orval schema so the mock returns structurally valid data.
- **`@api` (mocked):** `getObservabilityAuditLogs` (platform) and `listAuditEntries` (shop) are the two contract functions whose call arguments the tests assert on.
- **`@api/schemas`:** imported to reference `GetObservabilityAuditLogsResponse` and `ListAuditEntriesResponse` schemas inside `contractResponse`.

## Notes
- The platform "no target" test uses `expect.not.objectContaining({ target: expect.anything() })` with an inline `eslint-disable` for `@typescript-eslint/no-unsafe-assignment` because Vitest types `expect.anything()` as `any`.
- The `since` conversion test specifically uses a `datetime-local` string (no `Z`, no offset) to pin the composable's normalization to `new Date(…).toISOString()`.
- `beforeEach` clears all mocks; individual tests may layer `mockRejectedValueOnce` on top for failure-path coverage.
