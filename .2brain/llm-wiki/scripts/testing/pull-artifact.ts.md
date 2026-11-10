---
source: scripts/testing/pull-artifact.ts
sha256: 6ac13fece3d841b0c4f99e49562e742bcf8271db46a0c3342ab7ad5c0793ef30
signature: e828b5da1efb4b9d1bc910e1513a3fc03333f12942e470862448e9cd52d3f1b5
generated_at: 2026-11-10T02:47:45.250808+00:00
model: ollama:qwen3.8:27b
---

# scripts/testing/pull-artifact.ts

## Purpose

Downloads the newest unexpired GitHub Actions artifact that a nightly job uploaded and copies designated files out of it into the repo. Nightlies lack write access to commit results directly, so they upload artifacts; this script is the consumer side that retrieves them. It is the shared "GitHub half" of the `pull-*` script family.

## Key elements

- **`pullArtifact`** (exported) — Main entry point. Takes an artifact spec (`{ name, files }`) and a log tag. Finds the newest unexpired artifact via `listArtifacts`, downloads it, copies the requested files into the repo, and prints a one-line summary.
- **`PulledFile`** (exported interface) — Describes one file to extract: `inArtifact` (path inside the zip) and `target` (destination relative to repo root; parent dirs are created).
- **`listArtifacts(name)`** — Calls `gh api repos/{owner}/{repo}/actions/artifacts?name=…&per_page=100` and returns the parsed `GitHubArtifact[]`.
- **`download(runId, name, directory)`** — Calls `gh run download <id> --name <name> --dir <dir>` to unzip one artifact into a target directory.
- **`copyInto(directory)`** — Curried helper; returns a function that copies one `PulledFile` from the download dir to its target, creating parent folders as needed.
- **`downloadAndCopy(runId, artifact)`** — Orchestrates the full pull: creates a `mkdtemp` scratch dir → downloads → copies all files in parallel → removes the scratch dir in `.finally()`.
- **`run`** — Promisified `execFile` (no shell involved).

## Relationships

- **`scripts/testing/github-artifacts.ts`** — Provides the `newestArtifact` selector and the `GitHubArtifact` type used throughout this file.
- **`scripts/mutation/pull-report.ts`** — Consumer; calls `pullArtifact` to fetch the mutation-testing report artifact.
- **`scripts/lighthouse/pull-baseline.ts`** — Consumer; calls `pullArtifact` to fetch the Lighthouse baseline artifact.

## Notes

- Requires the GitHub CLI (`gh`) to be installed and authenticated (`gh auth login`). The `{owner}/{repo}` placeholder in the API URL is resolved by `gh` from the current checkout's remote.
- `per_page=100` is the hard maximum of the artifacts endpoint; the listing assumes all relevant runs fit on one page.
- All child-process calls use `execFile` with argument arrays — no shell string interpolation.
- The scratch directory is cleaned up in `.finally()`, so it is removed even if `copyFile` throws.
- The `log` parameter is purely cosmetic (prefixes the `console.log` line); it does not affect behaviour.
