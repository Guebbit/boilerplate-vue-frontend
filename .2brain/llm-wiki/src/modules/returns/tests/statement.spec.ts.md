---
source: src/modules/returns/tests/statement.spec.ts
sha256: 491e477995f2d1ea7e566ee4522df4a3fcb1585040661715656c3868ca719281
signature: 491e477995f2d1ea7e566ee4522df4a3fcb1585040661715656c3868ca719281
generated_at: 2026-11-10T05:40:45.107879+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/tests/statement.spec.ts

## Purpose

Vitest spec that pins the shared stated-day time rules (local `datetime-local` string ↔ ISO instant conversion, and the "not in the future" guard) used across three staff forms. Exists so the domain logic in `statement.ts` is verified in one place rather than duplicated per form.

## Key elements

- **`describe('toLocalInput')`** — asserts `toLocalInput` formats a `Date` as a `YYYY-MM-DDTHH:mm` string (minute precision, seconds truncated).
- **`describe('localToIso')`** — asserts `localToIso` round-trips back to the same ISO instant, and asserts (via `toBeUndefined()`) that empty or unparseable input is rejected.
- **`describe('isStatedInTime')`** — asserts the guard accepts "now" and past values, rejects future values and empty strings. Uses a fixed `now` constant (`2026-06-07T12:00` local) so results are deterministic.

## Relationships

- **`src/modules/returns/domain/statement.ts`** — the unit under test. This spec imports `toLocalInput`, `localToIso`, and `isStatedInTime` from that module and exercises each in isolation.

## Notes

- All test dates are hard-coded to 2026 (Jan/June) to keep assertions deterministic; no `new Date()` at call time except the single pinned `now` constant.
- `localToIso` bad-input cases are asserted with `toBeUndefined()` — the contract is specifically that the function returns `undefined` (not `null` or an empty string).
- The domain module's own doc comment states these three functions are shared by three staff forms; this spec is the single source of truth for that contract.
