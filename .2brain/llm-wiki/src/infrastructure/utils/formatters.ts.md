---
source: src/infrastructure/utils/formatters.ts
sha256: d64b9c3a72cb223038fecd6d7705789dd192c491ee5ac384b184e1a71b091bd9
generated_at: 2026-10-02T12:04:11.059253+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/formatters.ts

## Purpose

Locale-bound formatting wrappers that pre-bind the `@guebbit/js-toolkit` pure formatters to this app's active locale and shared empty-value glyph. Call sites invoke these instead of the toolkit directly so they never restate locale or fallback, and can't accidentally pick a different locale than the rest of the page.

## Key elements

- **`EMPTY_VALUE`** — Shared fallback glyph for nullish/empty display values. Resolved from `runtimeValue('APP_EMPTY_VALUE')` → `VITE_APP_EMPTY_VALUE` → em dash `'—'`.
- **`formatText(value?)`** — Renders raw text or the fallback glyph.
- **`formatDateTime(value?)`** — Localized date + time from an ISO 8601 string.
- **`formatDate(value?)`** — Date-only variant (numeric y/m/d) for table columns.
- **`formatCurrency(value, currency, format?)`** — Localized currency. `currency` (ISO 4217) is **required**; there is no default.
- **`currencyDigits(currency)`** — Decimal places a currency's minor unit represents (e.g. 0 for JPY, 3 for KWD). Cached per code; mirrors the backend's `minorUnitExponent` in `orders/domain/money.ts`.
- **`formatPercent(rate?)`** — Fraction → locale-aware percentage with up to 2 fraction digits (avoids the `Math.round` truncation pitfall).
- **`formatTime(value?)`** — Time-of-day only (h:m:s).
- **`formatMegabytes(bytes?)`** — Raw byte counter → whole-MB string (presentation-only rounding).
- **`formatUptime(seconds?)`** — Compact duration (`"2h 15m"`); returns `EMPTY_VALUE` for `undefined` since the toolkit would render `0m`.
- **`formatFlag(value, trueLabel, falseLabel)`** — Boolean → localized label; `null`/`undefined` → `EMPTY_VALUE`.

## Relationships

- **`@guebbit/js-toolkit`** — Provides the pure `formatText`, `formatDateTime`, `formatCurrency`, `formatFlag`, `formatDuration` functions that this file wraps.
- **`@/i18n`** — `getCurrentLocale()` supplies the active locale tag for every formatter.
- **`@/infrastructure/runtime-config`** — `runtimeValue()` reads the deployment-configured empty-value glyph.
- **`orders/domain/money.ts`** — `currencyDigits` intentionally mirrors that file's `minorUnitExponent` so frontend price-input precision matches what the server stores.

## Notes

- **No default currency.** `formatCurrency` omits a fallback by design (referenced as FA37): every money resource carries its own `currency` field, and a call site that fails to pass one is a bug, not a case to paper over with a silent EUR.
- **`currencyDigits` is cached and defensive.** `Intl.NumberFormat` throws `RangeError` for unrecognised codes; the catch falls back to 2 and does not crash a product form.
- **`formatPercent` and `formatMegabytes` bypass the toolkit** and use `Intl.NumberFormat` / plain arithmetic directly, because the toolkit has no percent or byte-size helper.
- **`formatUptime` special-cases `undefined`** before delegating to `formatDuration`, because the toolkit (correctly, as a general library) renders `0m` for it rather than a configurable "empty" glyph.
- The module is declared `@module` — it has **no default export**, only named exports.
