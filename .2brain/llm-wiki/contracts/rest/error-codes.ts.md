---
source: contracts/rest/error-codes.ts
sha256: d6d359dc2e4127003e1f0dedcde785d2e0c1dd3ed03a5761f0e5bda3e192feb8
signature: 79572838dce74dedd688afdc4e8318279270b426cb69c3df7ecc11a22e47b9ca
generated_at: 2026-11-10T02:11:29.599732+00:00
model: ollama:qwen3.8:27b
---

# contracts/rest/error-codes.ts

## Purpose

Generated catalogue of every error code the REST contract declares. It exists so that consumers (clients, test harnesses, docs) can reference a single stable set of string identifiers for all API error conditions without hard-coding literals.

## Key elements

- **`ERROR_CODES`** (const object, the sole export) — a flat mapping of human-readable code names to their string values (e.g. `CART_EMPTY: 'CART_EMPTY'`). Every entry carries a JSDoc comment stating the HTTP status it maps to, the scenario that triggers it, and—where applicable—the shape of `errors[].details` the client can expect.
  - Covers domains: cart/checkout, delivery/fulfillment, email/account, locale/translation, idempotency, inventory, multipart upload limits, anti-bot, example lifecycle, and generic client/server errors.
  - Status codes used: 400, 403, 404, 409, 413, 422, 429, 500.
  - `CLIENT_ERROR` is a catch-all for any 4xx whose derived name is not individually listed; never a 5xx.
  - `INTERNAL_SERVER_ERROR` is the sole 5xx; never carries stack or library detail.

## Relationships

- **tests/support/e2e/action-table.ts / envelope.ts / problem-stub.ts** — test-support modules that import `ERROR_CODES` to construct expected response envelopes and to assert specific error codes in e2e scenarios, keeping the string literals in one place.

## Notes

- **Generated file.** Produced by `npm run gen:api` from `openapi.yaml`. Do not edit by hand; regenerate instead.
- **Open-ended by design.** Adding a new code is additive and never a breaking change; no enum or sealed union is used.
- **`CLIENT_ERROR` vs. specific codes.** If a 4xx response's derived code is not in this object, the client should fall back to `CLIENT_ERROR`. A 5xx will never use it.
- **`details` is not guaranteed on every code.** Only the docstrings that mention `errors[].details` promise a structured payload; other codes may return a bare message.
- **`CART_INSUFFICIENT_STOCK` vs. `CART_PRODUCT_UNAVAILABLE`.** The former covers stock-level refusals (`insufficient_stock`, `out_of_stock`, `unavailable`); the latter covers a product that was deleted or set `active: false` (`availability: 'removed'`). They are distinct and must not be conflated.
