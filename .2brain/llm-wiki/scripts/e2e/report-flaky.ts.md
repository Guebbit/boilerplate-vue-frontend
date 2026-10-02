---
source: scripts/e2e/report-flaky.ts
sha256: 902ba6f191cc494fb32c917f60ccf837e119a9e500c07599f9f8c2904254f602
generated_at: 2026-10-02T11:35:48.903446+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/report-flaky.ts

## Purpose

A thin entry-point script (run via `tsx`) that prints which Cypress tests passed only on a retry in the last run. It exists for CI paths that do **not** go through `run-shards.ts` (e.g. a live-profile or single-spec invocation): a CI step invokes this file after Cypress finishes, regardless of pass/fail, to surface flaky tests as a warning.

## Key elements

- **`printFlakyReport()`** – Imported from `./flaky-report`; the sole function call in the file. All formatting and data-reading logic lives there.
- The file itself contains no functions, classes, or additional exports — it is a one-line entry script.

## Relationships

- **`scripts/e2e/flaky-report.ts`** – Provides the `printFlakyReport` function. This file is its only consumer in the graph; all actual report generation (reading Cypress artifacts, filtering retry-passes, printing) is delegated to that module.

## Notes

- **Always exits 0.** A retry-pass is treated as a warning, not a failure, so the script never sets a non-zero exit code. Downstream CI logic must not rely on its exit status to detect flaky tests.
- **Trigger is external.** Nothing in this file schedules itself; a CI step calls it directly after the Cypress command completes.
- **Not used by sharded runs.** If a run goes through `run-shards.ts`, the flaky report is presumably produced there; this script is the fallback for non-sharded invocations.
