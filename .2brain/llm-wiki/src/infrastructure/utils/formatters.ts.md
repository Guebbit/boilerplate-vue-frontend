---
source: src/infrastructure/utils/formatters.ts
sha256: 9154a0bea9b6ea547bf26e6254722c3c3ee1b9d604ebb3183c748cc4826ddd32
generated_at: 2026-10-17T00:13:06.016808+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/formatters.ts

## Purpose

Locale-bound formatting wrappers that bind the pure `@guebbit/js-toolkit` `formatXBase` functions to this app's active locale (`getCurrentLocale()`) and a shared empty-value glyph (`EMPTY_VALUE`). Call sites never restate locale or fallback, and cannot accidentally pick a different locale than the rest of the page.

## Key elements

- **`EMPTY_VALUE`** — Resolved at module load from `runtimeValue('APP_EMPTY_VALUE')` → `VITE_APP_EMPTY_VALUE` → `'—'`. Used as the fallback glyph by every formatter.
- **`formatText(value?)`** — Trims and passes through non-empty strings; returns `EMPTY_VALUE` for nullish/empty input.
- **`formatDateTime(value?)`** — Localized date + time from an ISO 8601 string.
- **`formatDate(value?)`** — Date-only variant (explicit `numeric` year/month/day) for table columns.
- **`formatCurrency(value, currency, format?)`** — Locale-aware currency. **No default currency** is supplied; the caller must pass the ISO 4217 code from the same resource the value came from.
- **`currencyDigits(currency)`** — Returns the minor-unit decimal places for a currency code (cached in a module-level `Map`). Falls back to 2 for unrecognised codes instead of throwing.
- **`formatPercent(rate?)`** — Formats a fraction (e.g. `0.055`) as a locale-aware percentage with up to 2 fraction digits (rounding, not truncating).
- **`formatTime(value?)`** — Time-of-day only (hour/minute/second).
- **`formatMegabytes(bytes?)`** — Rounds bytes to whole MB for display (e.g. `"42 MB"`).
- **`formatUptime(seconds?)`** — Delegates to the toolkit's `formatDuration`; returns `EMPTY_VALUE` when `seconds` is `undefined`.
- **`formatFlag(value, trueLabel, falseLabel)`** — Maps a boolean to a caller-supplied localized label; `EMPTY_VALUE` for null/undefined.

## Relationships

No graph neighbors are registered for this file. It depends on:

- `@guebbit/js-toolkit` (pure formatting primitives)
- `@/i18n` → `getCurrentLocale()`
- `@/infrastructure/runtime-config` → `runtimeValue`

## Notes

- **`formatCurrency` has no default currency by design.** Forgetting to pass `currency` is treated as a bug, not silently filled with EUR.
- **`currencyDigits` mirrors the backend's `minorUnitExponent`** (`orders/domain/money.ts`) so frontend precision always matches what the server stores. The toolkit does not export this helper.
- **`formatPercent` uses `Intl.NumberFormat` with `maximumFractionDigits: 2`** rather than `Math.round(rate * 100)`, preserving sub-point precision (e.g. 5.5 % ≠ 6 %).
- **`EMPTY_VALUE` is deployment-configurable** via `VITE_APP_EMPTY_VALUE` / `APP_EMPTY_VALUE`; no code change is needed to swap the glyph.
- **`formatUptime` special-cases `undefined`** because the toolkit renders `"0m"` for a missing duration; this file overrides that with `EMPTY_VALUE`.
- **`formatMegabytes` rounds** (presentation-only); the API intentionally ships raw bytes so leak detection can see sub-MB deltas.
