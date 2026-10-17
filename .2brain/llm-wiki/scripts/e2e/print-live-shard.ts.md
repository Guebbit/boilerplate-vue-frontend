---
source: scripts/e2e/print-live-shard.ts
sha256: 8ce83c0ba16e38f4332516a13afb85405a64b0eb0e86e2c216395d4f59f82359
generated_at: 2026-10-17T00:00:57.731643+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/print-live-shard.ts

## Purpose

CLI helper that prints a comma-separated `--spec` value for one (or all) live-e2e shard slices, so CI's `e2e-live.yml` matrix can hand each job a non-overlapping subset of functional or antibot specs. It exists to keep the glob-and-balance logic out of the YAML and to guarantee no slice is ever empty (an empty `--spec` would make Cypress run the full suite against the wrong backend).

## Key elements

- **Antibot branch** (`first === 'antibot'`) – globs `ANTIBOT_SPEC_GLOBS`, prints them all in one job; no slicing. Exits `2` if zero files match.
- **`all` branch** – calls `liveShardSlices(files, durations, total)` once, printing every slice on separate lines. Durations are read a single time so concurrent appends to the durations file can't make two slices disagree.
- **Single-shard branch** – calls `liveShardFiles(files, durations, index, total)` for one slice.
- **Duration resolution** – for each spec file, prefers `readSpecDurations()` (local measurement), falls back to the `SECONDS` table (keyed by basename), otherwise the file is omitted from balancing (zero weight).
- **Empty-slice guard** – if any requested slice has zero files, prints an error to stderr and exits `2`.
- **Path normalisation** – all glob results are converted to POSIX separators (`/`) before printing, regardless of host OS.

## Relationships

- **`./cypress-spec-globs.ts`** – source of `FUNCTIONAL_SPEC_GLOBS` and `ANTIBOT_SPEC_GLOBS`; determines which spec files are in scope.
- **`./live-shard.ts`** – provides `liveShardFiles` (single-shard split) and `liveShardSlices` (all-slices split); the actual balancing algorithm lives there.
- **`./shard-balancer.ts`** – exports the `SECONDS` lookup table used as the duration fallback when no local measurement exists.
- **`./spec-durations.ts`** – exports `readSpecDurations()` to load locally-recorded per-spec timing data (present in developer checkouts, absent in CI).

## Notes

- **Empty-slice = full-suite danger.** The script deliberately exits `2` rather than printing an empty string, because `cypress run --spec ""` is treated by Cypress as "run everything."
- **`all` mode reads durations exactly once** (`readSpecDurations()` is called before `liveShardSlices`), so a file being appended to between calls cannot produce inconsistent slices.
- **REPO_ROOT** is derived from `import.meta.url` (two levels up), not `process.cwd()`, so the script works regardless of where `tsx` is invoked from.
- Exit code is `0` on success, `2` on "no specs" errors; there is no `1` path.
