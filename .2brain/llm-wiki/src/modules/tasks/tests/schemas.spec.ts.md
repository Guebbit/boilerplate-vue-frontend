---
source: src/modules/tasks/tests/schemas.spec.ts
sha256: be390b7314a2f6370224bf28e2f33edb3c4236e3159d105acea3c4724027d593
signature: 84b8cce2ac6e7258cad70d100a245f98511deb07264b5da00ec4eb2b19ec0879
generated_at: 2026-11-10T06:00:11.561895+00:00
model: ollama:qwen3.8:27b
---

# src/modules/tasks/tests/schemas.spec.ts

## Purpose

Tests that `contactSchema` (from `../schemas`) enforces the same field-length caps defined in the shared API contract (`@api/schemas`). The caps are imported rather than hardcoded, so a contract change automatically moves the boundary assertions with it: exactly the cap passes, one past fails.

## Key elements

- **`validMessage`** — a minimal fixture (`email`, `subject`, `message`) used as the base payload for every test case.
- **`describe('contactSchema')`** — the single test suite.
  - *accepts a minimal valid message* — sanity check that `safeParse` succeeds on the fixture.
  - *caps %s at the contract maximum* (`it.each`) — parameterized over `name`, `subject`, `message`, `orderNumber`; asserts `'a'.repeat(max)` passes and `'a'.repeat(max + 1)` fails.
  - *accepts a one-character message* — confirms the schema does not impose an additional lower bound beyond the contract (a single `?` is valid).
  - *rejects an empty message with the required-message key* — asserts `safeParse` fails **and** that the first issue's message equals the i18n key `'contact-page.message-required'`.

## Relationships

- **`src/modules/tasks/schemas.ts`** — the SUT. Exports `contactSchema`, the Zod (or similar) schema under test.
- **`@api/schemas`** (external contract package) — source of the four `createContactTaskBody*Max` constants. The test does not redeclare cap values; it reads them at runtime so it tracks contract drift.

## Notes

- Boundary tests use the "one-past" pattern (`max` vs `max + 1`) rather than a range loop, keeping failure output to a single character of difference.
- The empty-message test asserts the **i18n key** (`contact-page.message-required`), not a human-readable string. If the error message text changes, this test breaks; the key is the stable contract.
- `validMessage` has no `name` or `orderNumber` field, yet the parameterized cap test injects them via spread. Those fields must be **optional** in `contactSchema` for the base case to parse successfully.
