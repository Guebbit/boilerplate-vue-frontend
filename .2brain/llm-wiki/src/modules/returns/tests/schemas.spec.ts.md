---
source: src/modules/returns/tests/schemas.spec.ts
sha256: 7026a323a9153f880f961f1a88b7a21a0b40ee8ad2bdc9242c01894fdb4104ca
signature: 7026a323a9153f880f961f1a88b7a21a0b40ee8ad2bdc9242c01894fdb4104ca
generated_at: 2026-11-10T05:40:34.012597+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/tests/schemas.spec.ts

## Purpose
Vitest test suite that verifies the three return-related Zod schemas (`declineReasonSchema`, `declineMessageSchema`, `returnNoteSchema`) accept and reject the correct values, with boundary checks driven by shared contract constants rather than hardcoded numbers.

## Key elements
- **`declineReasonSchema` tests** — asserts the schema is an enum: empty string and arbitrary labels (e.g. `'Worn'`) fail; the four listed codes (`return_period_ended`, `not_returnable`, `no_defect_found`, `other`) pass.
- **`declineMessageSchema` tests** — asserts an empty string is valid, a string of exactly `declineReturnBodyMessageMax` characters is valid, and one character beyond that limit is rejected.
- **`returnNoteSchema` tests** — same boundary pattern using `createReturnBodyNoteMax` from `@api/schemas`.
- **Boundary imports** — `declineReturnBodyMessageMax` and `createReturnBodyNoteMax` are imported from `@api/schemas` so the caps live in one place; the tests never retype the limit.

## Relationships
- **`src/modules/returns/schemas.ts`** — the sole system under test. The spec imports `declineReasonSchema`, `declineMessageSchema`, and `returnNoteSchema` directly from that module and asserts on their `safeParse` results.
- **`@api/schemas`** — provides the numeric max-length constants used in boundary assertions, keeping the test and the production schema in lockstep with the API contract.

## Notes
- Tests use `safeParse` (non-throwing) so a schema change that alters the parse result is caught as a plain assertion failure, not an unhandled exception.
- The caps are imported, not duplicated; if the API contract changes a max length, the tests fail immediately and the fix is a single constant update—no magic numbers to hunt for.
- The enum test hardcodes the four valid codes inline. If a new decline reason is added to the schema, the test will still pass (it only checks that the listed codes succeed and that invalid strings fail), so a new code won't be accidentally excluded from validation until someone adds it to the test list.
