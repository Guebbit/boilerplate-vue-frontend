---
source: src/modules/cart/tests/stock-poll-interval.spec.ts
sha256: 71b230342ad0b807476f0ed4c15778503952a671b29adeab54e8efb310108790
signature: 71b230342ad0b807476f0ed4c15778503952a671b29adeab54e8efb310108790
generated_at: 2026-11-10T04:09:40.778580+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/stock-poll-interval.spec.ts

## Purpose
Vitest spec for `stockPollIntervalMs`, which converts the `VITE_CART_STOCK_POLL_SECONDS` env-var string into a millisecond value. The contract under test: a positive whole number (seconds) yields `seconds × 1000`; every other spelling yields `undefined` (poll disabled). The file exists to pin that strict parsing boundary against regressions.

## Key elements
- **`describe('stockPollIntervalMs')`** – top-level suite grouping all cases around the single function under test.
- **Positive-case table (`it.each`)** – asserts that `'1'`, `'30'`, `' 5 '` (whitespace-padded), and `'2147483'` produce `1000`, `30_000`, `5000`, and `2_147_483_000` ms respectively.
- **Negative-case table (`it.each`)** – asserts that 14 "off" inputs (unset, empty string, whitespace, zero, negative, fractional, non-numeric, suffixed unit, `Infinity`, `NaN`, hex, exponent form, explicit `+` sign, and a value described as "too long for a timer, which would fire at once") all return `undefined`.

## Relationships
- **`src/modules/cart/domain/index.ts`** – the test imports `stockPollIntervalMs` from `'../domain'`, which resolves to this barrel re-export.
- **`src/modules/cart/domain/stock-poll.ts`** – the likely implementation module behind the barrel export; this spec is the primary (and only visible) test guarding its parsing behavior.

## Notes
- The upper-bound positive case (`'2147483'` → 2 147 483 000 ms) is immediately followed by a negative case (`'2147484'`) that the test labels as "too long for a timer, which would fire at once." Any change to that threshold must update both tables.
- Whitespace trimming is exercised explicitly (`' 5 '`) but the implementation is not required to trim on the negative side (e.g., `'   '` is treated as blank → off).
- The env-var name `VITE_CART_STOCK_POLL_SECONDS` is documented in the module JSDoc but is not referenced by the test itself; the test calls the pure function directly with string arguments.
