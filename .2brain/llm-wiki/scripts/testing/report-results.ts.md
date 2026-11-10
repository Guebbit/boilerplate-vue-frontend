---
source: scripts/testing/report-results.ts
sha256: 83fd4bffb0254b8419d49184ab7dcff61a09276caa116c76442cc418dcd25855
signature: dc7ffe6ae9102ca1745be24081e310c989239aef961611f307123be70ffe674a
generated_at: 2026-11-10T02:48:00.383323+00:00
model: ollama:qwen3.8:27b
---

# scripts/testing/report-results.ts

## Purpose

Reads a runner JSON report (Jest `--json` or Vitest `json`, same shape) and prints a module-organised summary: per-bucket test counts and timing, the N slowest suites and individual tests, and a flat failure list attributed to its owning module. It exists because the codebase is organised by module but every other tool (CI jobs, mutation baseline, test scripts) is layer-shaped; this script is the cheapest way to answer "which module owns that red build" and "where did the time go" without changing how tests are run. Invoked via `npm run test:report`.

## Key elements

- **`bucketOf(file)`** — Derives a bucket label from a test file's path. `src/modules/<name>/…` → `<name>`; `tests/<layer>/…` → `(<layer>)`; other `src/<area>/…` → `(<area>)`; fallback → `(other)`. No registration or config needed.
- **`readReport(file)`** — Reads and parses the JSON report. If the file is missing, prints a hint (`npm run test:unit:ci`) and exits with code 2.
- **`Report` / `SuiteResult` interfaces** — The minimum JSON shape this script consumes: `testResults[]` each with `assertionResults[]`, plus top-level `num*Tests` counters. Verified compatible across Jest and Vitest.
- **`buckets: Map<string, Bucket>`** — Single-pass aggregation of suites, test counts, failures, and duration per bucket.
- **`slowestSuites` / `slowestTests`** — Top `SLOWEST` (8) entries by duration, drawn from suite and assertion-level timings respectively.
- **`failures`** — Flat list of every failed assertion with its bucket, relative file path, full test name, and the first line of the failure message.
- **`REPO_ROOT`** — Set to `process.cwd()` (not `__dirname` or `import.meta.url`) so the file is byte-identical under CJS and ESM.

## Relationships

- **`tests/e2e/specs/journeys/op35-staff-sessions-idle-out.cy.ts`** — Indirect: this spec's results appear in the JSON report that this script reads. The script does not import or reference the spec directly; the connection is purely through the report artefact the runner produces.

## Notes

- **Fork, not shared.** This is a copy of the backend's `scripts/testing/report-results.ts`. It is deliberately *not* in `SHARED_FILES` (`scripts/pairing/spec-identity.ts`) and the two copies are not kept in step.
- **Always exits 0.** The script is a reader; the runner already gated on pass/fail. A non-zero exit here would either duplicate or contradict that verdict.
- **Wall-clock caveat.** The "suite time" figure is the sum of per-suite durations. With parallel workers this exceeds real wall clock; it is a work-total, not a stopwatch reading.
- **Crashed suites.** A suite that fails on import has no `startTime`/`endTime`; the script treats its duration as 0 rather than producing `NaN`.
- **Sorting.** Modules (bare labels) sort before layer/area buckets (parenthesised labels), alphabetically within each group. This is intentional so domain modules are found first.
- **JSON over JUnit is deliberate.** JUnit would require `jest-junit` on the backend and carries less per-assertion detail. If PR-line annotations are needed later, add a JUnit reporter *alongside* this one rather than replacing it.
