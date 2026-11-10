---
source: src/infrastructure/utils/formatters.ts
sha256: 7b6d7eb86e683ded595d2819779c9c1f4008b44bc55a9ac6125d7ec2529ed773
signature: 969bc9d2659ab96fd256181b7a9aabf986d98b3a769351449eefca5d396fbef7
generated_at: 2026-11-10T03:11:45.036245+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/formatters.ts

## Purpose

Locale-bound formatting wrappers that bind the pure `@guebbit/js-toolkit` `formatX` functions to this app's active locale and a shared empty-value glyph. Call sites never restate either, and cannot accidentally pick a different locale than the rest of the page.

## Key elements

- **`EMPTY_VALUE`** — Shared fallback glyph (em dash by default), overridable via `VITE_APP_EMPTY_VALUE` or `runtimeValue('APP_EMPTY_VALUE')`.
- **`formatText(value?)`** — Pass-through text with nullish/empty → `EMPTY_VALUE`.
- **`formatDateTime(value?)`** — Localized date + time from an ISO string.
- **`formatDate(value?)`** — Date-only (no time), explicit numeric `y/m/d`.
- **`formatDay(value?)`** — Date-only read as **UTC**; for server-resolved `YYYY-MM-DD` days that must not shift with the viewer's zone.
- **`formatUtcDate(value?)`** — UTC day with month in words (e.g. "5 December 2026"); for deadlines fixed to a UTC calendar day.
- **`formatBucketStart(value, timeZone, interval)`** — Short axis label for a stats bucket, read in the shop's IANA zone; month+year for monthly buckets, day+month otherwise.
- **`formatCurrency(value, currency, format?)`** — Formats a decimal string as currency using the exact text (no float round-trip). No default currency. Malformed codes degrade to a plain number.
- **`formatPercent(rate?)`** — Fraction → localized percentage, up to 2 decimal places.
- **`formatTime(value?)`** — Time-of-day only (`h:m:s`).
- **`formatMegabytes(bytes?)`** — Raw bytes → whole-MB string.
- **`formatUptime(seconds?)`** — Seconds → compact duration; `undefined` → `EMPTY_VALUE`.
- **`formatFlag(value, trueLabel, falseLabel)`** — Boolean → caller-supplied label; nullish → `EMPTY_VALUE`.
- **`formatCountry(code?)`** — ISO 3166-1 alpha-2 → localized name via `countryLabel`.
- **`formatAddressLine(address?)`** — Assembles `fullName, street, zip city, country` into one comma-separated line.
- **`AddressLineParts`** (interface) — Shape for `formatAddressLine`.

## Relationships

- **`src/infrastructure/utils/money.ts`** — Provides `decimalScale` and `isDecimal`, used by `formatCurrency` to derive the fraction-digit count from the decimal string and to validate that a value is a well-formed decimal before formatting.
- **`src/modules/notifications/store.ts`** — Consumes these formatters to render localized values (amounts, dates, flags, etc.) in notification displays.

## Notes

- **Time-zone discipline:** `formatDay` and `formatUtcDate` pin `timeZone: 'UTC'` to prevent the browser's zone from shifting a calendar day. `formatDate` deliberately does *not* pin a zone (viewer-local is the intent). `formatBucketStart` pins to the shop's zone.
- **Exact-decimal formatting:** `formatCurrency` passes the decimal string directly to `Intl.NumberFormat.format()` (the string overload), so no `parseFloat` rounding occurs. The fraction-digit count is derived from the text itself (`decimalScale`), not from a per-currency table.
- **No default currency:** `formatCurrency` requires the caller to supply the code; omitting it is a bug, not a case to paper over.
- **`formatUptime`** is the only formatter that does *not* delegate to a toolkit `formatXBase`; it calls `formatDuration` directly and handles the `undefined` case itself, because the toolkit renders `0m` for a missing value and this app wants `EMPTY_VALUE`.
