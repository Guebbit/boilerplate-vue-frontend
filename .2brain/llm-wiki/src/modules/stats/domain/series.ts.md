---
source: src/modules/stats/domain/series.ts
sha256: 0f2c47cea750051c47929f04c5c56ea1ce6bf17aef613adad1bf4b4b476ac50c
generated_at: 2026-10-17T01:42:15.595589+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/domain/series.ts

## Purpose

Converts API time-bucket start instants into short, human-readable axis labels for stat charts. It exists to handle the timezone subtlety: a bucket's `start` is the shop's local midnight encoded as a UTC instant, so it must be formatted in the shop's IANA zone (not the viewer's browser zone) to produce a correct day/month label.

## Key elements

- **`bucketLabel(start, timeZone, interval, locale)`** — The sole export. Parses an ISO 8601 start string, formats it via `Intl.DateTimeFormat` in the given IANA timezone, and returns a short label:
  - `interval === 'month'` → `month: 'short', year: 'numeric'` (e.g. "Oct 2026")
  - any other interval → `day: 'numeric', month: 'short'` (e.g. "12 Oct")

- **`StatsInterval`** (imported from `@types`) — The union of valid bucket sizes; only the `'month'` case is special-cased for display.

## Relationships

- **`src/modules/stats/domain/index.ts`** — Barrel file; re-exports `bucketLabel` so consumers import from the domain root.
- **`src/modules/stats/components/SalesSection.vue`** — Chart-rendering component that calls `bucketLabel` to build axis tick labels for its time series.
- **`src/modules/stats/views/ProductSales.vue`** — Top-level stats view; passes the answer's `period.timeZone` and `interval` down into `SalesSection`, which in turn feeds them to `bucketLabel`.
- **`src/modules/stats/tests/domain.spec.ts`** — Unit tests covering `bucketLabel` output across intervals, locales, and timezones.

## Notes

- The timezone is **always the shop's** (`period.timeZone`), never the viewer's local zone. Passing the browser zone would shift a midnight bucket to the previous calendar day for viewers west of the shop.
- The function is pure and has no side effects; it is safe to call per-tick in a render loop.
- Only two formatting branches exist. If a new `StatsInterval` value is added upstream, it falls into the day+month branch automatically.
