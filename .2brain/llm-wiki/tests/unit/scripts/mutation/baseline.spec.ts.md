---
source: tests/unit/scripts/mutation/baseline.spec.ts
sha256: 71cfd4282065a573a181e6ff12cfe805ca3620d17cb82e350afb5cd8e0e05f43
signature: 0c5664f0442a02f952432973df1c149161fb4d13bd460469dfbe38c332b2b714
generated_at: 2026-11-10T08:22:04.742362+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/mutation/baseline.spec.ts

## Purpose

Unit tests for the mutation-testing ratchet (`scripts/mutation/baseline.ts`). They pin the core asymmetry of the gate—improvements move the baseline up, regressions never move it down—and exercise scoring, comparison, ratchet updates, human-readable formatting, and the partial-run guard, all against synthetic Stryker-shaped reports so no long mutation run is needed.

## Key elements

- **`report(...)`** — Fixture helper that builds a Stryker-shaped report object from `[file, status[]]` tuples.
- **`scores(...)`** — Fixture helper for per-file numeric scores.
- **`baselineOf(...)`** — Fixture helper for a `MutationBaseline` object with a fixed `generatedAt` timestamp.
- **`describe('scoresFromReport', …)`** — Verifies killed/timeout as "detected", non-viable mutants excluded from the denominator, empty-viable files score 100, all-survived files score 0, and per-file independence.
- **`describe('compareToBaseline', …)`** — Covers all five verdicts (`regressed`, `improved`, `held`, `new`, `removed`) plus the no-baseline first-run case.
- **`describe('nextBaseline — the ratchet', …)`** — The critical tests: improvements are recorded, regressions keep the old (higher) value, new files are recorded at first-measured score (including zero), removed files are dropped, and monotonicity across sequential runs holds.
- **`describe('formatRegressions', …)`** — Asserts the regression message names the file, both numbers, points to `reports/mutation/index.html`, and mentions the `test:mutation:baseline` escape hatch.
- **`describe('formatUnrecorded', …)`** — Asserts unrecorded-file messages include the file, its score, and the escape hatch.
- **`describe('missingFromReport', …)`** — The partial-run guard: names files the report omits, stays silent when the report is a superset or when no baseline exists.

## Relationships

- **`scripts/mutation/baseline.ts`** — Sole dependency. Every test case exercises a function or type exported from that module (`SCORE_TOLERANCE`, `compareToBaseline`, `missingFromReport`, `formatRegressions`, `formatUnrecorded`, `nextBaseline`, `scoresFromReport`, `MutationBaseline`). This spec is the only test file that gates that module.

## Notes

- Fixtures use **tuples** (`[string, string[]]`, `[string, number]`) instead of object literals because file-path keys in object literals trip a naming-convention lint rule; disabling the rule per line would be noisier than the helper.
- `SCORE_TOLERANCE` is treated as a measurement error bar (timeout/survivor race), not as intentional slack—tests explicitly verify a drop *within* tolerance is **not** flagged as regressed.
- The partial-run guard (`missingFromReport`) exists to prevent a `stryker run --mutate 'src/one/file.ts'` recording from silently rebuilding the baseline from a single file, which would launder regressions in all other files on the next full run.
- `nextBaseline` is tested for **monotonicity across repeated runs** (good → better → bad), not just in isolation.
