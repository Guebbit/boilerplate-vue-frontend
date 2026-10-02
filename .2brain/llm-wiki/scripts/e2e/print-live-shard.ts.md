---
source: scripts/e2e/print-live-shard.ts
sha256: 1f094d10aeb60a404de1e7f7fd6f182733c1e87dbcc536a8a133e4cb386fb727
generated_at: 2026-10-02T11:35:37.939299+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/print-live-shard.ts

## Purpose

CLI helper that resolves one nightly live-e2e shard into a comma-separated list of spec files suitable for `cypress run --spec …`. The `e2e-live.yml` GitHub Actions matrix invokes it per job; each job then passes the output to `npm run test:e2e:live:spec`. Two modes: a numeric `index total` pair selects a functional shard, or the keyword `antibot` prints the full antibot spec set.

## Key elements

- **Antibot branch** – When `argv[2] === 'antibot'`, globs `ANTIBOT_SPEC_GLOBS`, normalises path separators to `/`, sorts, and prints the full list. Exits `2` if the list is empty.
- **Functional shard branch** – Globs `FUNCTIONAL_SPEC_GLOBS`, builds a `file → seconds` duration map (recorded durations first, `SECONDS` table by basename second), then calls `liveShardFiles(files, durations, index, total)` to obtain the slice. Prints the slice or exits `2` if empty.
- **`REPO_ROOT`** – Resolved two directories above the script (`scripts/e2e/` → repo root) so that `globSync` cwd matches where the glob patterns are written.
- **Empty-guard on both paths** – Prevents `cypress run --spec ""`, which would silently run the *entire* suite against the wrong backend.

## Relationships

- **`scripts/e2e/cypress-spec-globs.ts`** – Source of the two glob constants (`FUNCTIONAL_SPEC_GLOBS`, `ANTIBOT_SPEC_GLOBS`) that define *which* files each mode targets.
- **`scripts/e2e/live-shard.ts`** – Supplies `liveShardFiles`, the balancing algorithm that actually partitions the file list into the requested shard given durations.
- **`scripts/e2e/shard-balancer.ts`** – Exports the `SECONDS` table (static per-spec estimates by basename) used as the fallback duration source.
- **`scripts/e2e/spec-durations.ts`** – Exports `readSpecDurations`, which returns locally-measured durations (present in a dev checkout, absent in CI), taking priority over the `SECONDS` table.

## Notes

- Duration priority per spec: `readSpecDurations()` (recorded) → `SECONDS[basename]` (static table) → the mean (handled inside `liveShardFiles`). In CI only the static table and mean apply.
- All file paths are normalised from `path.sep` to `/` before printing, because `cypress run --spec` expects forward-slash paths regardless of the host OS.
- The script is meant to be run via `tsx` (see the shebang); it is not a library module.
