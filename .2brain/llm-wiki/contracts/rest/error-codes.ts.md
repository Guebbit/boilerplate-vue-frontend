---
source: contracts/rest/error-codes.ts
sha256: e5ce5332a80a96fbb5663f50c5ba94931f5ecb41d1d9f8b92e66a50b61711a88
generated_at: 2026-10-02T14:29:54.953239+00:00
model: ollama:qwen3.8:27b
---

# contracts/rest/error-codes.ts

## Purpose

Generated registry of every error code the REST contract declares. It exists so that both server and client can reference a single typed constant for `errors[].code` values without hard-coding strings. Generated from `openapi.yaml` via `npm run gen:api` — do not edit by hand.

## Key elements

- **`ERROR_CODES`** — A `const` object mapping named keys to their string values (e.g. `ANTIBOT_NO_CHALLENGE`, `CART_CHANGED`, `RATE_LIMITED`, …). Each entry's JSDoc states the HTTP status it pairs with and a one-line description. Covers auth, cart/checkout, orders, payments, returns, inventory, rate-limiting, multipart upload limits, webhooks, and generic fallbacks.
- **`ErrorCode`** — Union type derived from the values of `ERROR_CODES`. The JSDoc explicitly notes it is *not* exhaustive at the type level because the wire contract uses a bare `code: string`.

## Relationships

No graph neighbors. This file has no imports and, per the dependency graph, nothing imports it (consumers likely reference the type/constant via the generated client or shared types pulled from the same spec).

## Notes

- **Generated — do not edit.** Regenerate with `npm run gen:api`.
- **Open-ended by design (CT-D5):** adding a new code is additive and never a breaking change; the type union grows accordingly.
- **Not a closed enum on the wire:** the contract's `errors[].code` field is typed as `string`, so consumers must handle unknown codes gracefully even though the `ErrorCode` union lists the known ones.
- **Status-code pairing is documentation, not enforcement:** the HTTP status is recorded in the JSDoc comment only; the object itself carries no status numbers.
- Some codes are domain-specific fallbacks (e.g. `REQUEST_ERROR`, `INTERNAL_ERROR`) intended to catch cases where no more specific code applies.
