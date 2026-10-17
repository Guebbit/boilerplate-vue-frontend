---
source: scripts/mutation/github-artifacts.ts
sha256: bc2e0f95125712e836a1ea8a9695f19ce63c32eb2b0d4ddf06dc31cdf8b6965e
generated_at: 2026-10-17T00:03:01.476819+00:00
model: ollama:qwen3.8:27b
---

# scripts/mutation/github-artifacts.ts

## Purpose

Defines the constants, types, and a single pure selector for identifying which `mutation-baseline` GitHub Actions artifact to download. It exists to keep the "which artifact" logic separate from `pull-baseline.ts`, which handles the network calls and file I/O.

## Key elements

- **`BASELINE_ARTIFACT`** (`'mutation-baseline'`) — the artifact name the nightly mutation run uploads.
- **`BASELINE_BRANCH`** (`'main'`) — the only branch whose uploaded baselines are considered valid.
- **`GitHubArtifact`** (interface) — a minimal projection of GitHub's "list artifacts" response: `name`, `expired`, `created_at`, and `workflow_run.{id, head_branch}`.
- **`newestBaseline(artifacts)`** (pure function) — filters to non-expired artifacts matching `BASELINE_ARTIFACT` on `BASELINE_BRANCH`, sorts descending by `created_at` (ISO-8601 string comparison), and returns the first entry or `undefined`.

## Relationships

- **`scripts/mutation/pull-baseline.ts`** — imports `BASELINE_ARTIFACT`, `BASELINE_BRANCH`, `GitHubArtifact`, and `newestBaseline` to decide what to download and from which run. This file performs no I/O; `pull-baseline.ts` does.
- **`tests/unit/scripts/mutation/github-artifacts.spec.ts`** — unit-tests `newestBaseline` against synthetic `GitHubArtifact` arrays (ordering, expiry, branch mismatch).

## Notes

- `newestBaseline` uses `toSorted` (non-mutating) and relies on ISO-8601 strings being lexicographically sortable — both `created_at` values must share the same timezone offset or the sort breaks.
- The module is intentionally side-effect-free and importable in any context (tests, scripts, docs) without pulling in `gh` or network dependencies.
- `expired` artifacts are still returned by GitHub's list endpoint; the filter here excludes them, but a caller that iterates the full list independently must apply the same check.
