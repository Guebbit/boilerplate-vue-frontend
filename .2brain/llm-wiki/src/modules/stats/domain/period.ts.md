---
source: src/modules/stats/domain/period.ts
sha256: 095f9c48b703f32752e132eb42835cab2311e70698c8a5637c45a4e2c84f91fd
signature: 60e465616a1056413097a05ddc702a51409148d113b2a57120084d3992bb72d8
generated_at: 2026-11-10T05:49:09.818526+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/domain/period.ts

## Purpose
Defines the stats "period" (a `from`/`to` date pair plus an interval bucket size) as a pure, dependency-free domain object. It centralises the validation rules the API enforces so the UI form can reject invalid input before a round-trip, and provides helpers to construct periods from presets or URL query params.

## Key elements
- **`StatsPeriodChoice`** – interface holding `from`, `to` (ISO date strings) and `interval` (`StatsInterval`).
- **`PeriodProblem`** – union of validation-failure keys (`'invalid' | 'reversed' | 'too-long' | 'too-many-buckets'`).
- **`PeriodPreset` / `PERIOD_PRESETS`** – the four quick-select options and their display order.
- **`bucketCount(from, to, interval)`** – upper-bound count of buckets a range produces (day → exact; week → `⌈days/7⌉+1`; month → calendar-month delta + 1).
- **`autoInterval(from, to)`** – picks `day` (≤ 31 d), `week` (≤ 183 d), or `month` so a chart stays readable.
- **`periodProblem(period, limits?)`** – returns the first `PeriodProblem` found, or `undefined` if the API would accept it. Without `limits` only shape/order is checked.
- **`presetPeriod(preset, today)`** – builds a `StatsPeriodChoice` ending at `today` for the given preset.
- **`periodFromQuery(query, today)`** – parses `from`/`to`/`interval` out of a route query object; falls back to the last-30-days preset if anything is missing or invalid.

## Relationships
- **`src/modules/stats/domain/calendar.ts`** – supplies the date primitives this file builds on: `addCalendarDays`, `daysInRange`, `isCalendarDay`, `toCalendarDay`.
- **`@types` (`StatsLimits`)** – the API ceiling shape accepted by `periodProblem`.
- **`src/modules/stats/domain/index.ts`** – barrel that re-exports this module's public API to the rest of the stats domain.
- **`src/modules/stats/components/StatsPeriodForm.vue`** – consumes `PERIOD_PRESETS`, `presetPeriod`, and `periodProblem` to render the quick-select buttons and inline validation messages.
- **`src/modules/stats/store.ts`** – persists the active `StatsPeriodChoice` for the stats views.
- **`src/modules/stats/views/StatsDashboard.vue` / `src/modules/stats/views/StatsProductSales.vue`** – read the period from the URL via `periodFromQuery` and write it back when the user changes it.
- **`contracts/rest/index.ts`** – defines the REST contract (including `StatsLimits`) that `periodProblem` mirrors client-side.
- **`src/modules/stats/tests/domain.spec.ts` / `src/modules/stats/tests/stats-period-form.spec.ts`** – unit-test the pure functions and the form's integration with them.

## Notes
- **No clock reads.** `today` is always a parameter; the file never calls `new Date()`. This keeps every function deterministic and trivially testable.
- **`periodFromQuery` does NOT receive `StatsLimits`.** It validates only shape, ordering, and interval membership — the API's own ceiling is enforced later (or by the API itself). A URL that passes `periodFromQuery` can still be rejected by `periodProblem` once limits are loaded.
- **`bucketCount` for `week` is an upper bound**, not an exact count. A range can touch one extra partial week beyond `days/7`, hence the `+1`.
- The file is declared `@module` (no default export); all consumers use named imports.
