---
source: src/modules/orders/tests/schemas.spec.ts
sha256: 186f998b16971a57b03abc007a50b2e920026f9247f4152084eb5ce4e25093c3
signature: e1b2dfc0ea8c3fa5315de5d630ae8869c0ec712f15f65eadf40f00712d465377
generated_at: 2026-11-10T05:04:59.205436+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/schemas.spec.ts

## Purpose

Vitest suite that verifies `shippingAddressCorrectionSchema` enforces the staff shipping-address correction contract: a valid address parses, each string field rejects input beyond its documented maximum, and whitespace-only required fields are rejected. Bounds are read from the shared `@api/schemas` constants so the tests track the contract automatically.

## Key elements

- **`validAddress`** — module-level fixture (object literal) representing a minimal passing address; used as the base object that each test mutates via spread. Note `phone` is `''`, confirming the field is optional/empty-allowed.
- **`describe('shippingAddressCorrectionSchema')`** — top-level suite grouping all assertions.
- **`it('accepts a minimal valid address')`** — sanity check that the fixture parses successfully.
- **`it.each([...])('caps %s at the contract maximum', …)`** — parameterised boundary test over five fields (`fullName`, `street`, `city`, `zip`, `phone`). For each field it asserts `safeParse` succeeds at exactly `max` characters and fails at `max + 1`.
- **`it('refuses a required field that is only whitespace')`** — asserts that a whitespace-only `street` value fails validation.

## Relationships

- **`src/modules/orders/schemas.ts`** (imported as `../schemas`) — provides `shippingAddressCorrectionSchema`, the Zod (or equivalent) schema under test. This test file is its primary behavioural spec.
- **`@api/schemas`** — supplies the five `correctOrderShippingAddressBodyOne*Max` numeric constants used as boundary values, keeping the test in lockstep with the public API contract.

## Notes

- The file's module docblock (`@module`) names the *target* (`src/modules/orders/schemas.ts`) rather than itself; this is a convention in this repo where spec files carry a docblock describing what they test.
- `phone` is the only field allowed to be an empty string in the valid fixture; the other four are non-empty strings. Do not assume `phone` is required.
- Boundary tests use `'a'.repeat(n)` — any character would work, but this keeps the test readable.
- The whitespace test exercises `street` specifically; it does not iterate all required fields. If a new required field is added to the schema, a matching whitespace test should be added.
