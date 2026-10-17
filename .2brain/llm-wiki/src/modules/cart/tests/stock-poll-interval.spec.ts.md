---
source: src/modules/cart/tests/stock-poll-interval.spec.ts
sha256: 71b230342ad0b807476f0ed4c15778503952a671b29adeab54e8efb310108790
generated_at: 2026-10-17T00:42:33.987766+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/stock-poll-interval.spec.ts

## Purpose

Vitest spec that pins down the parsing contract of `stockPollIntervalMs`: a raw string from the `VITE_CART_STOCK_POLL_SECONDS` environment variable is accepted only when it is a positive whole number of seconds (whitespace-trimmed), and every other form — zero, negative, fractional, non-numeric, hex, exponent, signed, out-of-range — must resolve to `undefined` (poll disabled).

## Key elements

- **`describe('stockPollIntervalMs')`** — single top-level suite covering one exported function.
- **First `it.each` block** (valid inputs) — asserts that `'1'→1000`, `'30'→30000`, `' 5 '→5000`, and the upper boundary `'2147483'→2_147_483_000` all return a positive millisecond value.
- **Second `it.each` block** (invalid inputs) — 14 cases (unset, empty, blank, `'0'`, `'-5'`, `'2.5'`, `'often'`, `'30s'`, `'Infinity'`, `'NaN'`, `'0x10'`, `'1e1'`, `'+5'`, `'2147484'`) each asserting the function returns `undefined`.

## Relationships

- **`src/modules/cart/domain/index.ts`** — barrel re-export; this spec imports `stockPollIntervalMs` through `../domain`.
- **`src/modules/cart/domain/stock-poll.ts`** — houses the actual implementation of `stockPollIntervalMs`; this spec is its sole test file.

## Notes

- The upper-bound test (`'2147483'`) encodes that `2147484` (i.e. anything ≥ 2³¹ ms) overflows `setTimeout`'s signed-32-bit limit and must be rejected. If you raise the boundary, update both the valid and invalid cases together.
- The function returns `undefined`, **not** `0` or `null`, to signal "polling is off." Downstream consumers must check for `undefined` rather than falsy.
- Whitespace trimming is part of the contract (`' 5 '` is valid); stripping is done inside the function, not by the caller.
- The spec deliberately excludes hex (`0x10`), exponent (`1e1`), and signed (`+5`) forms — the parser is intentionally stricter than `parseInt`/`Number`.
