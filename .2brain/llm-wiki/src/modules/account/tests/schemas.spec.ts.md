---
source: src/modules/account/tests/schemas.spec.ts
sha256: 18a1a403e4a786bc899fca2be3bf9a0f137e8a2747496e188f2112ee4a1bc521
signature: 5346885534a6ff025183a0034b9f50970e520b24d57f35f7c0fb9b4345ae68ff
generated_at: 2026-11-10T03:41:23.185471+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/schemas.spec.ts

## Purpose

Vitest spec that pins the validation boundaries of the account-module Zod schemas. It asserts that each string field accepts exactly its contractual maximum (and rejects one character more) and that required fields reject empty strings, keeping the test suite in lockstep with the shared API contract without retyping numeric limits.

## Key elements

- **`validAddress`** – shared fixture object representing a minimal passing entry; used as the base that individual tests mutate one field at a time.
- **`describe('addressSchema')`** – tests `addressSchema` from `../schemas`:
  - "accepts a minimal valid entry" – sanity check that the fixture passes.
  - `it.each` "caps %s at the contract maximum" – for each of `label`, `fullName`, `street`, `zip`, `phone`, asserts `max` length passes and `max + 1` fails. Bounds are imported from `@api/schemas` (`createAddressBody*Max`).
  - `it.each` "requires %s" – for `fullName`, `street`, `city`, `zip`, `country`, asserts an empty string is rejected.
- **`describe('loginPasswordSchema')`** – single test that checks `loginPasswordSchema` from `../schemas` accepts exactly `loginBodyPasswordMin` and `loginBodyPasswordMax` (both from `@api/schemas`) and rejects `min − 1` and `max + 1`.

## Relationships

- **`src/modules/account/schemas.ts`** – the module under test; provides `addressSchema` and `loginPasswordSchema`, whose parse behavior is exercised by every assertion in this file.
- **`@api/schemas`** (external package) – source of the numeric bound constants (`createAddressBody*Max`, `loginBodyPasswordMin/Max`). Tests import these so that any contract change in the API package automatically shifts the expected boundaries in this file.

## Notes

- Bounds are never hardcoded as literals; they come from `@api/schemas`. If that package's constants change, the tests break without any edit to this file.
- `label` and `phone` have max-length bounds but are **not** in the "requires" list, meaning empty strings are permitted for those two fields by design.
- The `it.each` for address caps skips `label` in the "requires" check but **includes** it in the max-length check, confirming `label` is optional but length-capped.
