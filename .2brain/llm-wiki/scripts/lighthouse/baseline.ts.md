---
source: scripts/lighthouse/baseline.ts
sha256: 7df14315b8be3f547248ba02d8725d26a07646875ad9591d3a04075d440b10a6
signature: 8b6ef66816f1c6bd10b10e2388338860ba2e5f702e005d16411184ac4aea038c
generated_at: 2026-11-10T02:42:00.300429+00:00
model: ollama:qwen3.8:27b
---

# scripts/lighthouse/baseline.ts

## Purpose

Defines the Lighthouse timing baseline data model and the **ratchet** function that merges a fresh run into the committed baseline, allowing metrics to only improve (or stay flat). It exists so that performance numbers are tracked as a ratchet over time—improvements are recorded automatically, regressions are silently ignored, and a human commit is the only way to raise a number. Nothing in the baseline gates a build; it is purely a report artifact that forks inherit as data, not a verdict.

## Key elements

- **`LIGHTHOUSE_BASELINE_PATH`** – Repo-relative path (`lighthouse-baseline.json`) of the committed baseline file.
- **`PROPOSED_BASELINE_PATH`** – Path (`reports/lighthouse/lighthouse-baseline.json`) where the runner writes a proposed baseline next to its reports.
- **`CaseMetrics`** – Interface for per-case medians: `lcp`, `fcp`, `tbt`, `si`, `cls` (ms or unitless) and `performance` (0–100).
- **`BaselineEnvironment`** – Identifies the measuring machine: `lighthouseVersion`, `chromeVersion`, `benchmarkIndex`.
- **`LighthouseBaseline`** – Shape of the committed JSON: `generatedAt`, `environment`, and a `cases` map (case id → `CaseMetrics`).
- **`RatchetResult`** – Return type of `ratchet`: the merged baseline plus `added`, `improved`, and `dropped` lists for human-readable summaries.
- **`ratchet(current, measured, environment, declared, generatedAt)`** – Core merge logic. For each declared case: new cases are recorded as-is; existing cases adopt lower values for `lcp/fcp/tbt/si/cls` and a higher `performance` score; regressions are discarded. Cases in the old baseline but absent from `declared` are dropped. Returns the updated baseline and a change summary.
- **`readBaseline(file?)`** – Reads and parses the committed baseline JSON; returns `undefined` if the file does not yet exist.

## Relationships

- **`scripts/lighthouse/update-baseline.ts`** – Consumes `ratchet` and `readBaseline` to produce and write the proposed baseline after a run.
- **`scripts/lighthouse/pull-baseline.ts`** – Uses `LIGHTHOUSE_BASELINE_PATH` to fetch the committed baseline for comparison.
- **`scripts/lighthouse/evaluate.ts`** – Produces the per-case `CaseMetrics` medians that feed into `ratchet`.
- **`scripts/lighthouse/summary.ts`** – Reads `RatchetResult` (added/improved/dropped) to render the printed change summary.
- **`scripts/lighthouse/run.ts`** – Orchestrates the pipeline: evaluate → ratchet → write proposed baseline.
- **`tests/unit/scripts/lighthouse/baseline.spec.ts`** – Unit-tests `ratchet` and `readBaseline` directly.
- **`tests/unit/scripts/lighthouse/evaluate.spec.ts`** – Tests the evaluation step that produces the `CaseMetrics` input to the ratchet.

## Notes

- The ratchet is **asymmetric**: the `performance` score (0–100, higher-is-better) is handled separately from the five `LOWER_IS_BETTER` metrics. A regression in any metric is simply not recorded; the old value is kept.
- `PROPOSED_BASELINE_PATH` is exported but **not written by this module**—it is a convention for the runner/`update-baseline.ts` to use. This file only reads the committed path.
- The `declared` parameter to `ratchet` is the authoritative list of cases that currently exist. Any baseline case not in that list is dropped, so deleting a case file automatically cleans up the baseline on the next ratchet.
- Numbers are machine-specific (see `BaselineEnvironment`); cross-machine comparison is explicitly discouraged in the module doc comment.
