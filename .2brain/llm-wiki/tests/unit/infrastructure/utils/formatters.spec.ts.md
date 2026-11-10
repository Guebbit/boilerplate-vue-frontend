---
source: tests/unit/infrastructure/utils/formatters.spec.ts
sha256: 167cc9129d75049bdc1c0e2dc78d36a1c8ad8ffbad178ef3138bb5e5adf27ce2
signature: 81b7ef64cd2616d4be77fa1cc499b4845cfbe3c77126d9217c31d12b7f9e50e1
generated_at: 2026-11-10T08:05:29.817529+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/utils/formatters.spec.ts

## Purpose

Vitest test suite for the display-formatter utilities in `@/infrastructure/utils/formatters`. Written specifically because a Stryker mutation run scored the formatters file at 0 %—every mutant survived because no test exercised the fallback branches (missing/empty data) that users only encounter when a field is null. Each formatter gets coverage of its "happy path" *and* its empty-value fallback.

## Key elements

- **`pretendBrowserZone(zone)`** – helper that spies on `Intl.DateTimeFormat` and `Date.prototype.toLocaleString`, injecting a `timeZone` option. Exists because `process.env.TZ` is ineffective under Stryker's worker-thread Vitest execution.
- **`formatText` tests** – passthrough, `EMPTY_VALUE` fallback for `undefined`/`null`/`''`, whitespace-only treated as empty, surrounding whitespace preserved on non-blank strings.
- **`formatDateTime` / `formatDate` tests** – ISO input → localized output; `formatDate` verified to drop the time component that `formatDateTime` keeps.
- **`formatUtcDate` tests** – pins output to UTC regardless of simulated browser zone; asserts month word and absence of a clock time.
- **`formatBucketStart` tests** – verifies bucket start is read in the *shop* zone (not browser zone) for `day` and `month` granularities; fallback on unparseable input.
- **`formatCurrency` tests** – decimal-place preservation (incl. zero-exponent JPY, three-exponent KWD, HUF/IDR/IQD via `it.each`), invalid/empty currency code degrades to plain number, zero rendered, locale-tolerant decimal/thousands separator matching, large-number precision.
- **`formatPercent` tests** – whole-number rates, fractional rate kept (5.5 % not rounded to 6 %), zero rendered, non-number fallback.
- **`formatTime` / `formatMegabytes` / `formatFlag` / `formatUptime` tests** – single-concern formatting checks plus `EMPTY_VALUE` fallback for `undefined`/`null`; `formatUptime` verifies minute vs. hour+minute rendering.
- **`"the app-shaped bindings"` block** – asserts the `||`/`??` fallback expressions in the formatters module (e.g. locale lookup, empty-value constant) resolve correctly at their edge. *(Truncated in source.)*

## Relationships

- Imports the SUT from `@/infrastructure/utils/formatters` (the module under test). No other runtime dependencies beyond `vitest`.

## Notes

- **Why the file exists:** every test targets a branch that manual QA never hits (missing data). Without these tests, Stryker reports 0 % mutation coverage on the formatters.
- **Timezone mocking constraint:** `process.env.TZ` is a no-op in Stryker's worker threads (it copies `process.env` before workers start). The `pretendBrowserZone` spy is the only reliable way to shift the effective zone inside a test.
- **Locale tolerance:** assertions use regexes that accept both `.` and `,` as decimal/thousands separators so the suite passes under any locale the CI runner happens to select.
- **`formatPercent` motivation:** the module exists to fix a prior `Math.round(rate * 100)` bug that collapsed 5.5 % into 6 %.
- **`it.each` for HUF/IDR/IQD:** `Intl.NumberFormat` rounds these currencies to 0 decimals; the formatters preserve the caller's decimal places instead. Tests pin that behavior explicitly.
