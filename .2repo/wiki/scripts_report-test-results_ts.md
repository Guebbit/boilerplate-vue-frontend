# scripts/report-test-results.ts

## Purpose

CLI reader that turns a Jest/Vitest JSON test report into a human-readable summary organised by module: which module owns a failure, where the wall-clock time went, and per-module line coverage. It exists because the rest of the toolchain is layer-shaped (unit, contract, CI jobs) and cannot tell you what a single module's tests cost or which module a red build belongs to. Invoked as `npm run test:report [-- <file.json>]`.

## Key elements

- **`bucketOf(file: string): string`** — Maps a test-file path to a bucket label. `src/modules/<name>/` → `<name>`; `tests/<layer>/` → `(layer)`; `src/<area>/` → `(area)`; anything else → `(other)`. This is the single classification used for every section of the report.
- **`readReport(file: string): Report`** — Reads and parses the JSON report; exits with code 2 and a hint if the file is missing.
- **`readCoverage(file: string)`** — Parses `coverage/lcov.info` (SF:/LF:/LH: records) into a `Map<bucket, {hit, found}>`. Returns `undefined` when the file is absent (coverage is optional; the per-file floors in the runner configs remain the gate).
- **`SLOWEST` (constant, 8)** — Row count for the "slowest suites" and "slowest tests" sections.
- **Main script body** — Iterates `report.testResults`, aggregates per-bucket suite/test/failure/duration counts, prints a table, then the slowest suites, slowest individual tests, a failure list (first line of each failure message only), and optionally the coverage table. Always exits 0.
- **`Report` / `SuiteResult` interfaces** — Describe the JSON shape shared by Jest `--json` and Vitest's `json` reporter (`testResults[]` → `assertionResults[]`).

## Relationships

None (no graph neighbors listed).

## Notes

- **Byte-identical shared script.** This file is copied verbatim into both `boilerplate-node-backend` (Jest) and `boilerplate-vue-frontend` (Vitest) and must stay identical; `npm run check:spec-identity` enforces it. The JSON shape it reads was verified by diffing actual output from both runners before the script was written.
- **`process.cwd()`, not `__dirname`/`import.meta.url`.** The script must run under both CommonJS and ESM; `process.cwd()` is the only path anchor that works in both. This assumes invocation via `npm run` from the package root.
- **Always exits 0.** It is a reader, not a gate. A non-zero exit here would either duplicate the runner's verdict or risk disagreeing with it.
- **Sorting convention.** Modules (bare names) sort before layer buckets (parenthesised) despite ASCII ordering putting `(` before letters; the comparator in `rows` and the coverage section explicitly puts `isLayer` entries last.
- **Duration for crashed suites.** A suite with no `endTime`/`startTime` (e.g. import crash) is treated as 0 ms rather than producing `NaN`.
- **Failure messages are truncated to the first line.** The full stack is expected in the runner's own log; this report is an index, not a transcript.
- **JSON over JUnit, by design.** JSON needs no extra dependency on either side and carries per-assertion durations, ancestor titles, and full messages. The comment notes that a JUnit reporter should be *added alongside* if PR-line annotations are ever needed, not substituted for this file.
