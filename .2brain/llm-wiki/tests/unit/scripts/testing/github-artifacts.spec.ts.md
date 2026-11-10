---
source: tests/unit/scripts/testing/github-artifacts.spec.ts
sha256: aa8ed33c430da013f7a3f88867ad63c1eff8ec1e01eef2332e9fe7bcd3d5a310
signature: 6caa1707fbbc0a99adce9d80912a1dc9538c624f694e36682655e6e29c19dbe0
generated_at: 2026-11-10T08:23:18.343694+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/testing/github-artifacts.spec.ts

## Purpose

Unit tests for the `newestArtifact` selection logic in `scripts/testing/github-artifacts.ts`. Verifies that, given a list of GitHub workflow-run artifacts, the function picks the correct one (newest, non-expired, same branch, matching name) or yields no result. Driven entirely against synthetic data—no network or GitHub CLI calls.

## Key elements

- **`REPORT_ARTIFACT`** (`'mutation-report'`) — the artifact name every test case targets.
- **`newestReport`** — thin wrapper calling `newestArtifact(artifacts, REPORT_ARTIFACT)` to keep test bodies terse.
- **`artifact(runId, createdAt, overrides?)`** — factory that builds a `GitHubArtifact` object with sensible defaults (`main` branch, not expired, `REPORT_ARTIFACT` name) and allows per-case overrides.
- **`describe('newestReport', …)`** — five cases:
  - Selects the newest `created_at` regardless of list order.
  - Skips artifacts flagged `expired: true`.
  - Skips artifacts whose `workflow_run.head_branch` differs from `main`.
  - Skips artifacts with a different `name`.
  - Asserts `toBeUndefined` when the list is empty.

## Relationships

- **`scripts/testing/github-artifacts.ts`** — the sole production dependency. This spec imports the `GitHubArtifact` type and the `newestArtifact` function to test its selection logic in isolation.

## Notes

- The `artifact` factory's `overrides` parameter is typed as `Partial<Omit<GitHubArtifact, 'workflow_run'>> & { branch?: string }`, so callers override `workflow_run.head_branch` via the top-level `branch` key rather than nesting under `workflow_run`.
- Dates use ISO-8601 UTC strings (`2026-…Z`); ordering is determined solely by `created_at` lexicographic/chronological comparison, not by `workflow_run.id`.
