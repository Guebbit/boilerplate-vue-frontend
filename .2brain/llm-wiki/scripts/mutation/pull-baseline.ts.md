---
source: scripts/mutation/pull-baseline.ts
sha256: 1d43c4bbe13f27f1aa208612448c417f69f273698eee98a9347ba15960506f10
generated_at: 2026-10-17T00:03:10.555059+00:00
model: ollama:qwen3.8:27b
---

# scripts/mutation/pull-baseline.ts

## Purpose

Pulls the newest mutation-testing baseline artifact uploaded by the nightly CI run (which has no repo write access) and overwrites the local `mutation-baseline.json` so a developer can review the diff and commit it. Invoked via `npm run test:mutation:pull`.

## Key elements

- **`run`** — promisified `execFile`; all child-process calls use argument lists (no shell interpolation).
- **`listArtifacts()`** — calls `gh api` against the repo's actions-artifacts endpoint filtered by the `BASELINE_ARTIFACT` name; returns the parsed artifact list.
- **`download(runId, directory)`** — calls `gh run download` to fetch a single named artifact into a target directory.
- **`install(artifact)`** — orchestrates the full pull: creates a `mkdtemp` scratch dir → downloads the artifact → copies `MUTATION_BASELINE_PATH` from the scratch dir to the working tree → removes the scratch dir. Logs a one-line summary with the run ID and timestamp.
- **Top-level script** (no exports) — resolves the newest baseline via `newestBaseline`, calls `install`, or exits 1 with a message if no eligible artifact exists.

## Relationships

- **`scripts/mutation/baseline.ts`** — supplies `MUTATION_BASELINE_PATH`, the canonical path of the local baseline file that gets overwritten.
- **`scripts/mutation/github-artifacts.ts`** — supplies the `GitHubArtifact` type, the `BASELINE_ARTIFACT` name constant, and `newestBaseline()` which selects the most recent eligible artifact from the list.

## Notes

- Requires an authenticated GitHub CLI (`gh auth login`); `{owner}/{repo}` is resolved from the current checkout's remote.
- `per_page=100` is the API's page maximum and is assumed to cover ~3 months of nightly runs.
- The script is self-contained (no exports); it sets `process.exitCode = 1` on failure rather than calling `process.exit` directly.
- Run with the `tsx` shebang — no build step needed.
