---
source: tests/unit/scripts/mutation/github-artifacts.spec.ts
sha256: 91548ad713ac140b70f7e269ea3acadba10bc72a7ec34e43b1cb212ae45d7c42
generated_at: 2026-10-17T02:44:46.292499+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/mutation/github-artifacts.spec.ts

## Purpose

Unit tests for the artifact-selection logic in `scripts/mutation/github-artifacts.ts`. They verify which baseline artifact `npm run test:mutation:pull` would pick, using only synthetic in-memory lists — no GitHub API or CLI calls.

## Key elements

- **`artifact` (local helper)** – Builds a `GitHubArtifact` object with sensible defaults (name = `BASELINE_ARTIFACT`, expired = `false`, branch = `main`) and a single `overrides` parameter so each test mutates only the field under test.
- **`describe('newestBaseline')`** – Five cases covering the selection contract:
  - Picks the most recent `created_at` regardless of list order.
  - Skips artifacts flagged `expired: true`.
  - Skips artifacts whose `workflow_run.head_branch` is not `main`.
  - Skips artifacts whose `name` differs from `BASELINE_ARTIFACT`.
  - Returns `undefined` when the list is empty.

## Relationships

- **`scripts/mutation/github-artifacts.ts`** – The unit under test. This spec imports the `GitHubArtifact` type, the `BASELINE_ARTIFACT` constant, and the `newestBaseline` function from that module. No other files are touched; the download half (`pull-baseline.ts`) is explicitly out of scope.

## Notes

- Tests are deterministic and hermetic: the `artifact` helper replaces any real GitHub response, so no network, fixtures, or mocking of the GitHub CLI is needed.
- The `overrides` parameter on `artifact` accepts `Partial<Omit<GitHubArtifact, 'workflow_run'>> & { branch?: string }`, letting a test override `workflow_run.head_branch` without rewriting the entire nested object.
- Dates in the tests are 2026 ISO-8601 strings; they are chosen to be far in the future so no clock-skew edge cases interfere.
