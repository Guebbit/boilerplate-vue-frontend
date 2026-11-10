---
source: tests/support/unit/reset-shop.ts
sha256: dd2d192255aa46745459abdd5cb480ab2dc03b777b445475251150daef0ac76f
signature: dd2d192255aa46745459abdd5cb480ab2dc03b777b445475251150daef0ac76f
generated_at: 2026-11-10T07:42:47.345050+00:00
model: ollama:qwen3.8:27b
---

# tests/support/unit/reset-shop.ts

## Purpose

A test-support module that re-exports `resetShop` so sibling-module specs can reset the loaded shop state between test cases. The `shop` barrel does not expose this function (no production consumer needs it), so this file provides a test-only entry point.

## Key elements

- **`resetShop`** (re-exported from `@/modules/shop/shop`) — resets/forgets the currently loaded shop instance so each test case starts with a clean slate.

## Relationships

- **`src/modules/products/tests/product-create-currency.spec.ts`** — the consumer. It imports `resetShop` from this file to clear shop state between its test cases, since it cannot (and should not) import directly from the shop barrel.

## Notes

- This file contains **no logic** — it is a pure re-export. Any changes to reset behavior live in `@/modules/shop/shop`.
- The reason it exists in `tests/support/unit/` rather than in the shop module's barrel is intentional: `resetShop` has no production caller, so it is deliberately kept out of the public API surface.
