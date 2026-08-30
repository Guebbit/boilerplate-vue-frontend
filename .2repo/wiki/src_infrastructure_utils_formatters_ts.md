# src/infrastructure/utils/formatters.ts

## Purpose

Locale-bound formatting wrappers that bind the pure `@guebbit/js-toolkit` `formatX` functions to this app's active locale and shared empty-value glyph. Call sites invoke these wrappers without restating the locale or the fallback symbol, and cannot accidentally pick a different locale than the rest of the page.

## Key elements

- **`EMPTY_VALUE`** – Shared fallback glyph, sourced from `VITE_APP_EMPTY_VALUE` (defaults to em dash `—`). Exported so other modules can reference the same sentinel.
- **`getLocale`** *(internal)* – Returns the active locale tag from `getCurrentLocale()`, or `undefined` to let the runtime pick its default.
- **`formatText(value)`** – Wraps toolkit `formatText`; converts nullish/empty strings to `EMPTY_VALUE`.
- **`formatDateTime(value)`** – Localised full date + time from an ISO 8601 string.
- **`formatDate(value)`** – Date-only variant of `formatDateTime`; uses an explicit `{year, month, day: 'numeric'}` format.
- **`formatTime(value)`** – Time-only variant; uses `{hour, minute, second: 'numeric'}`.
- **`formatCurrency(value, currency?, format?)`** – Locale-aware currency formatting; defaults to `EUR` and 2 decimals.
- **`formatMegabytes(bytes?)`** – Rounds raw byte count to whole MB for display (e.g. `"42 MB"`). Implemented locally, not via the toolkit.
- **`formatUptime(seconds?)`** – Wraps toolkit `formatDuration`; special-cases `undefined` to `EMPTY_VALUE` because the toolkit renders `0m` for unknown values.
- **`formatFlag(value, trueLabel, falseLabel)`** – Maps a boolean to caller-supplied labels; null/undefined yields `EMPTY_VALUE`.

## Relationships

No graph neighbors are registered. The file's only external dependencies are `@guebbit/js-toolkit` (pure formatting primitives) and `@/infrastructure/i18n` (`getCurrentLocale`).

## Notes

- **`EMPTY_VALUE` is env-driven.** A deployment can change the glyph (e.g. `N/A`) via `VITE_APP_EMPTY_VALUE` without a code change.
- **`formatCurrency` defaults to EUR.** Pass an explicit ISO 4217 code for other currencies.
- **`formatMegabytes` is intentional rounding.** The API stores bytes because the conversion is lossy (a leak detector needs sub-MB deltas); rounding is a presentation decision kept in this file.
- **`formatUptime` deviates from the pattern.** The other wrappers pass `EMPTY_VALUE` through the toolkit's `empty` option; here the check is explicit because `formatDuration` has no `empty` parameter and would render `"0m"` for `undefined`.
