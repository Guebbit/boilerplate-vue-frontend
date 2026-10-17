---
source: src/modules/observability/tests/use-audit-trail.spec.ts
sha256: d9eb6164239deb7a6e92145e52f3714e3de4d61a87726c30c69287e62a4b36c7
generated_at: 2026-10-17T01:13:24.779322+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/tests/use-audit-trail.spec.ts

## Purpose

Vitest unit tests for the `useAuditTrail` composable (the fetcher behind `AdminAuditTab.vue`). They pin the contract-level behavior of both the **platform** and **shop** audit endpoints: which API function is called, how filters are passed (especially the `target` asymmetry), how the response envelope is split into reactive `entries`/`total`/`pages`, and how a failed call degrades to an `error` state instead of throwing.

## Key elements

- **`meta(totalItems, …)`** – local helper that builds a `PaginationMeta` object for fixtures.
- **`EVENT_ITEM` / `ENTRY_ITEM`** – representative `AuditEntryItem` rows for the platform and shop trails respectively.
- **`apiFailure(status, message)`** – builds the `{ success: false, … }` envelope the API returns on error, used with `mockRejectedValueOnce`.
- **`vi.mock('@api', …)`** – module-level mock that resolves `listObservabilityAuditEntries` and `listAuditEntries` via `contractResponse` + schema shapes.
- **`describe('useAuditTrail — platform endpoint')`** – five tests: envelope split, absence of `target` in the call, all-filter pass-through, `datetime-local` → ISO conversion, and failure-to-error fallback.
- **`describe('useAuditTrail — shop endpoint')`** – three tests: envelope split, `target` merged into every request, and `target: undefined` when no record is fixed.

## Relationships

- **`src/modules/observability/composables/use-audit-trail.ts`** – the system under test; imported and exercised directly via `useAuditTrail(endpoint, target?)`.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – provides `contractResponse`, which wraps raw data in the schema-conformed envelope shape so mocks match what the real Orval-generated client would return.

## Notes

- `target` is a **shop-only** filter: the platform contract (`listObservabilityAuditEntries`) declares no such field, so the composable must omit it. The tests assert its absence with `expect.not.objectContaining`.
- The `since` test uses `'2026-09-24T10:00'` (no `Z`/offset) to mirror what `<input type="datetime-local">` actually emits; the composable is expected to normalize it to a full ISO instant before sending.
- Mocks are set up once at module scope via `vi.mock`; `beforeEach(vi.clearAllMocks)` resets call counts between tests, but the factory's default `mockImplementation` still applies unless overridden with `mockRejectedValueOnce`.
