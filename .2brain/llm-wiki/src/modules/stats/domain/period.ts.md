---
source: src/modules/stats/domain/period.ts
sha256: 1d4ed89b6d05efd4ddf599d6a86e12aee93a0f733bccc76e32865dcd0bdb9a2e
generated_at: 2026-10-17T01:42:07.274966+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/stats/domain/period.ts

## Purpose

Defines the "question" a stats page asks the API — a date range plus a bucket size — and provides the pure, side-effect-free logic that validates, constrains, and constructs that question before any network round-trip. It centralises the API's own limits (max range, max buckets) so the form can reject bad input locally.

## Key elements

- **`StatsPeriodChoice`** — the core shape: `{ from, to, interval }` in `YYYY-MM-DD` strings.
- **`MAX_RANGE_DAYS` (730) / `MAX_BUCKETS` (400)** — the API ceilings; 730 is a day short of 731 so a leap day never tips the range over.
- **`PeriodProblem`** — discriminated union (`'invalid' | 'reversed' | 'too-long' | 'too-many-buckets'`) used as a key the form maps to user-facing messages.
- **`PeriodPreset` / `PERIOD_PRESETS`** — the four quick-choice buttons (`last-7`, `last-30`, `last-90`, `this-year`) in display order.
- **`bucketCount(from, to, interval)`** — upper-bounds how many buckets a range produces; `week` adds +1 to account for a partial extra week, `month` counts each calendar month touched.
- **`autoInterval(from, to)`** — picks the smallest readable bucket: `day` ≤ 31 d, `week` ≤ 183 d, `month` beyond.
- **`periodProblem(period)`** — validates a `StatsPeriodChoice` against format, ordering, range, and bucket-count rules; returns the first problem or `undefined`.
- **`presetPeriod(preset, today)`** — builds a concrete `StatsPeriodChoice` from a preset, ending on `today` and sizing the interval via `autoInterval`.
- **`periodFromQuery(query, today)`** — reads `from`/`to`/`interval` off a router query object, validates the result with `periodProblem`, and falls back to `last-30` on any mismatch. This is the entry point a view calls to hydrate state from the URL.

## Relationships

- **`calendar.ts`** — provides `addCalendarDays`, `daysInRange`, `isCalendarDay`, `toCalendarDay`; period.ts is the only consumer of these helpers.
- **`index.ts`** — barrel file that re-exports this module's public API to the rest of the stats feature.
- **`StatsPeriodForm.vue`** — the form component that calls `periodProblem` for inline validation and iterates `PERIOD_PRESETS` to render quick-choice buttons.
- **`store.ts`** — holds the active `StatsPeriodChoice` and dispatches changes back to the URL.
- **`StatsDashboard.vue` / `ProductSales.vue`** — call `periodFromQuery(route.query, new Date())` on mount to restore the period from the URL (dashboard → product links carry it this way).
- **`domain.spec.ts` / `stats-period-form.spec.ts`** — unit-test the pure functions above and the form's integration with them.

## Notes

- "Today" is **always injected** as a parameter; nothing calls `new Date()` internally, keeping every function deterministic and testable.
- `bucketCount` for `week` returns an **upper bound** (the `+ 1` accounts for a range that starts mid-week), not an exact count. The API's 400-bucket limit is checked against this bound, so a range that *could* produce 401 is rejected even if the real count is 400.
- `periodFromQuery` silently ignores any query keys other than `from`, `to`, `interval`, and treats a non-string or missing value as "use the fallback" rather than throwing.
- The `interval` cast inside `periodFromQuery` is safe only because of the `includes()` guard immediately above it; if you reorder that check, the cast becomes unsound.
