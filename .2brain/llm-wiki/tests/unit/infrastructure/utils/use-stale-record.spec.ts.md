---
source: tests/unit/infrastructure/utils/use-stale-record.spec.ts
sha256: 43fb0e1fb7ee18316d3b8de1aa4995b1d6ea724b32a56e3d5e80ab72cdf3e707
signature: 4e64c4233f3275f9479e7484e1fad6d57f86460f128e7a8ee9ecd8d3de67a0df
generated_at: 2026-11-10T08:09:09.160083+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/utils/use-stale-record.spec.ts

## Purpose

Unit tests for the `useStaleRecord` composable. Verifies that a 412 rejection is recognised, surfaced as a blocking warning, and that the reload path clears the warning before re-reading the record, while non-412 or non-envelope rejections are passed through untouched.

## Key elements

- **`useStaleRecord(blocking, reload)`** — the composable under test. Returns `{ handle, isStale, reloadLatest, clear }`.
- **`handle(rejection)`** — tested to return `true` only for a 412 envelope (setting `isStale` and calling `blocking.warn` with the i18n key `generic.error-stale-record`); returns `false` for 409, 422, 500, 0, a plain `Error`, or `undefined`.
- **`reloadLatest()`** — tested to call `blocking.clear()` before invoking the reload callback, then clear the stale flag.
- **`clear()`** — tested to reset `isStale` without calling the reload callback.
- **`rejection(status)`** — local helper that wraps `aProblem(status, [...])` to build a realistic rejection envelope.
- **`makeBlocking()`** — factory returning a mock `{ warn, clear }` pair for assertion.
- **`vi.mock('@/i18n')`** — stubs `translate` so assertions can match on deterministic `t:<key>` strings.

## Relationships

- **`tests/support/unit/fixtures.ts`** — imports `aProblem` to construct the Problem+Details envelope (status + error list) that simulates the `onResponseReject` output the composable must inspect.

## Notes

- The i18n module is mocked at module level; the composable's internal call to `translate` resolves to a plain `t:<key>` string, so assertions are stable without a real i18n setup.
- The 412 test asserts `stale.handle(...)` returns a **synchronous** `boolean` (`true`/`false`), not a Promise — the composable is expected to handle the 412 synchronously and delegate all other rejections to the caller.
- `reloadLatest` ordering (`clear` before `reload`) is explicitly tested via an `order` array to guard against regressions where the warning is re-shown after the record is re-read.
