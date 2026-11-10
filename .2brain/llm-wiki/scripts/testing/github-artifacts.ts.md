---
source: scripts/testing/github-artifacts.ts
sha256: 1166aedf5888e77564b6f47959f7b927102c6f319a621fb4f6e74a743465a080
signature: 339a8ba16a95567ff50a65e918452a7d19c7b89dd899c8b1f319ee129290ed45
generated_at: 2026-11-10T02:47:33.736469+00:00
model: ollama:qwen3.8:27b
---

# scripts/testing/github-artifacts.ts

## Purpose

Pure helper module that selects *which* GitHub Actions artifact a `pull-*` script should download: the newest unexpired artifact of a given name, produced by a run on `main`. It is shared by the mutation-report and Lighthouse-baseline pull flows, keeping the selection logic separate from the network I/O performed by `pull-artifact.ts`.

## Key elements

- **`ARTIFACT_BRANCH`** — constant `'main'`; the branch whose runs are considered valid sources.
- **`GitHubArtifact`** — interface mirroring the subset of fields read from GitHub's "list artifacts for a repository" endpoint (`name`, `expired`, `created_at`, `workflow_run.id`, `workflow_run.head_branch`).
- **`newestArtifact(artifacts, name)`** — filters to artifacts matching `name`, not expired, and originating from a run on `ARTIFACT_BRANCH`, sorts by `created_at` descending, and returns the first (or `undefined`).

## Relationships

- **`scripts/testing/pull-artifact.ts`** — consumes `newestArtifact` and `GitHubArtifact` to decide which artifact to fetch, then performs the actual `gh` API calls and local file writes.
- **`tests/unit/scripts/testing/github-artifacts.spec.ts`** — unit-tests the filtering/sorting behavior of `newestArtifact`.

## Notes

- The module is intentionally side-effect-free (marked `@module` with no top-level I/O). All GitHub interaction lives in `pull-artifact.ts`.
- Artifacts are matched by `workflow_run.head_branch === 'main'`; artifacts from PR branches or other branches are excluded even if they carry the same name.
- `toSorted` (immutable) is used rather than `sort`, so the caller's array is never mutated.
- `created_at` is compared via `localeCompare` (lexicographic on ISO-8601 strings), which is correct for same-timezone timestamps but relies on the API consistently returning UTC.
