---
source: tests/unit/infrastructure/utils/money.spec.ts
sha256: 569d8dfe2871da18f590977d0c87f66a30f8331515eec3f1324c05c1ed70f01b
signature: 569d8dfe2871da18f590977d0c87f66a30f8331515eec3f1324c05c1ed70f01b
generated_at: 2026-11-10T08:06:43.450265+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/utils/money.spec.ts

## Purpose

Vitest unit-test suite for the decimal-text money utilities in `src/infrastructure/utils/money.ts`. It verifies that all arithmetic (round-trip conversion, summing, multiplying, comparing) is exact and free of IEEE-754 float drift, and that locale-format normalisation (`it`/`en`) produces clean, server-acceptable decimal strings. Expected values are hand-computed from the inputs rather than derived from the implementation.

## Key elements

- **`decimalScale`** — returns the number of decimal places in a decimal-text string (non-numeric input → `0`).
- **`toMinor` / `fromMinor`** — round-trip between decimal text and integer minor units at a given scale; includes a guard test with a large value a `Number` would lose precision on.
- **`multiplyDecimal`** — multiplies a decimal-text unit price by an integer quantity; result scale equals the input scale.
- **`sumDecimals`** — sums an array of decimal texts at the widest scale present; empty array → `"0"`.
- **`compareDecimals`** — numeric comparison returning `-1 | 0 | 1`; treats `"71"` and `"71.00"` as equal.
- **`zeroDecimal`** — formats zero at a given number of decimal places.
- **`padDecimal`** — right-pads a decimal to a target scale; intentionally does **not** truncate over-scale values or non-numeric input (left as-is for the caller to reject).
- **`isDecimal` / `NON_NEGATIVE_DECIMAL`** — regex/validator guards; `isDecimal` accepts signed decimals, `NON_NEGATIVE_DECIMAL` additionally rejects negatives and exponent notation.
- **`boundOf`** — trims and validates a filter bound; with an optional locale argument it first calls `normalizeAmount`, then returns `undefined` for blanks, non-decimals, or negative results.
- **`normalizeAmount`** — converts locale-formatted number strings (IT: `1.234,50` / EN: `1,234.50`) into a plain decimal string; invalid input still passes through so the caller's regex check can reject it.

## Relationships

- **`@/infrastructure/utils/money`** — the sole import; every `describe` block exercises a named export from that module. No other files are referenced.

## Notes

- Tests are data-driven via `it.each` tables; add new cases to the existing arrays rather than writing separate `it` blocks.
- `padDecimal` deliberately preserves over-scale and non-numeric input verbatim — do not "fix" this to truncate; the server is expected to reject.
- `normalizeAmount` is **not** a validator: it returns a best-effort plain string and relies on the caller (`NON_NEGATIVE_DECIMAL`, `isDecimal`) to reject garbage. Tests assert this two-step contract.
- `boundOf` with a locale argument will return `undefined` for negative results (e.g. `"-3"`) even if the string is a valid decimal.
- The float-drift guard test (`9007199254740993.01`) is the regression anchor for the "use decimal text, not `Number`" design decision.
