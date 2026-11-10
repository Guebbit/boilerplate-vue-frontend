---
source: src/infrastructure/utils/money.ts
sha256: d8a1f991f0e2d89deb160358aa7ba1ad42136f5f764c17b53f10e397ee50deca
signature: c6a46c550a5acc8bad6d458e0bdca33ed81d5fd556e68442f4f383befa36505b
generated_at: 2026-11-10T03:13:06.073442+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/money.ts

## Purpose

Pure utility module for handling money as decimal strings exactly as the API transmits them (e.g. `"19.90"`, JPY `"1000"`, KWD `"1.500"`). All arithmetic is performed on `BigInt` minor units so no floating-point ever touches an amount. Also parses user-typed, locale-formatted numbers back into the plain decimal the API expects.

## Key elements

- **`DECIMAL`** (internal) — regex matching an optional sign, digits, optional fraction.
- **`NON_NEGATIVE_DECIMAL`** (exported) — regex for a non-negative plain decimal; used by `boundOf`.
- **`partsOf`** (internal) — splits a decimal string into `{ negative, whole, fraction }` or `undefined`.
- **`isDecimal(text)`** — validates that a string is a plain decimal amount.
- **`decimalScale(text)`** — returns the number of fraction digits (0 for integers or non-decimals).
- **`toMinor(text)`** — converts a decimal string to a `BigInt` of minor units.
- **`fromMinor(minor, scale)`** — writes a `BigInt` back to a decimal string at the given scale.
- **`sumDecimals(amounts)`** — sums an array of decimal strings exactly; result carries the widest input scale.
- **`multiplyDecimal(amount, quantity)`** — multiplies an amount by a whole count (unit price × quantity).
- **`compareDecimals(a, b)`** — value-based comparison so `"71"` ≡ `"71.00"`; returns −1/0/1.
- **`zeroDecimal(scale)`** — produces `"0"`, `"0.00"`, `"0.000"`, …
- **`padDecimal(text, scale)`** — pads user input to a currency's scale; leaves text unchanged if it has *more* places than `scale` (preserves server-side rejection).
- **`normalizeAmount(text, locale?)`** — reads a locale-formatted number (group/decimal marks from `Intl.NumberFormat`) back into a plain decimal. Appends `?` on refusal (group-mark misalignment, extra fraction segments).
- **`boundOf(text, locale?)`** — extracts a valid non-negative plain decimal from a filter field, or `undefined`. Not padded (a filter has no single currency).

## Relationships

- **`src/infrastructure/utils/formatters.ts`** — sibling utility in the same `infrastructure/utils` layer; related via the dependency graph as a consumer of money-related formatting logic.

## Notes

- **No floats, no imports.** The module is self-contained, pure, and has no Vue or runtime dependencies. Scale is carried in the string itself; there is no currency table on the client.
- **Refusal convention.** `normalizeAmount` signals an unparseable or suspiciously-grouped input by appending `?`. That suffix will always fail the downstream `NON_NEGATIVE_DECIMAL` / `DECIMAL` check, so the field falls through to its normal invalid-state message and nothing is sent to the server.
- **Locale detection trick.** `normalizeAmount` calls `formatToParts(1_234_567.5)` to discover the active locale's group and decimal marks rather than hard-coding them. The test value is chosen large enough that locales which only group from five digits (e.g. Italian) still emit a group mark.
- **`padDecimal` vs `boundOf`.** `padDecimal` is for a known-currency input field and *does* pad. `boundOf` is for range filters (no single currency) and intentionally does *not* pad.
- **`partsOf` fraction typing.** `match[3]` is typed `string` but is `undefined` at runtime when the optional group didn't participate; the code coerces with `?? ''`.
