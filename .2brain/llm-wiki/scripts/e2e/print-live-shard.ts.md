---
source: scripts/e2e/print-live-shard.ts
sha256: d14e8ebd074ac99094cfb0ae9e0c972fa1aecc56717b727e99c02d027df9d64a
signature: 10a41e979ec8841df31cc4463fd6031fd340c27c808136de17f7f3d453bd74e1
generated_at: 2026-11-10T02:34:53.394739+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/print-live-shard.ts

## Purpose

CLI helper (run via `tsx`) that prints one or more nightly live-e2e shard assignments as comma-separated `--spec` values for `cypress run`. It supports three invocation modes — a specific shard index, `antibot` (all antibot specs in a single unsliced job), and `all` (every slice from one durations read). The `e2e-live.yml` matrix invokes it to feed each parallel job its spec list.

## Key elements

- **CLI arg parsing** — Reads two positional args from `process.argv`. First is a shard index (number), `antibot`, or `all`; second is the shard count (or the count when first is `all`).
- **Antibot branch** — Globs `ANTIBOT_SPEC_GLOBS`, prints them all on one line, exits. No slicing.
- **`printAll` branch** — Uses `liveShardSlices(files, durations, total)` to produce every slice from a single durations snapshot.
- **Single-shard branch** — Uses `liveShardFiles(files, durations, index, total)` for one slice.
- **Duration resolution** — For each spec file: prefers a recorded value from `readSpecDurations()` (keyed by full path); falls back to the `SECONDS` table (keyed by basename without `.cy.ts`); omits specs in neither.
- **Empty-slice guard** — If any requested slice is empty, prints an error and exits with code 2 (prevents `cypress run --spec ""` from silently running the entire suite).
- **`REPO_ROOT`** — Resolved two levels above this file; all globs are relative to it.

## Relationships

- **`cypress-spec-globs.ts`** — Provides `FUNCTIONAL_SPEC_GLOBS` (the pool to shard) and `ANTIBOT_SPEC_GLOBS` (the unsliced antibot set).
- **`live-shard.ts`** — Provides `liveShardFiles` (partition into one slice) and `liveShardSlices` (partition into all slices).
- **`shard-balancer.ts`** — Provides the `SECONDS` static duration table used as a fallback when no measured duration exists for a spec.
- **`spec-durations.ts`** — Provides `readSpecDurations()`, which reads the per-checkout durations file (absent in fresh CI checkouts).

## Notes

- The `all` mode intentionally reads the durations file **once** and partitions from that snapshot, so a concurrent run appending to the file cannot make two printed slices disagree.
- All file paths are normalized to POSIX separators (`/`) before being passed to `cypress --spec`, regardless of the host OS.
- The `SECONDS` lookup is by **basename** (e.g. `login`), while the recorded lookup is by **full relative path** (e.g. `cypress/e2e/login.cy.ts`); a spec missing from both is simply unweighted.
- Exit code on failure is `2`, not `1`, to distinguish "configuration error" from a generic crash.
