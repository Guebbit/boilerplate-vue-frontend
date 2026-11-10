---
source: scripts/lighthouse/pull-baseline.ts
sha256: e5b33e51c08805339ae208d5cd9bce5ab73ddab7e4a3651fcd4bd6d00a37d22b
signature: e5b33e51c08805339ae208d5cd9bce5ab73ddab7e4a3651fcd4bd6d00a37d22b
generated_at: 2026-11-10T02:43:30.603801+00:00
model: ollama:qwen3.8:27b
---

# scripts/lighthouse/pull-baseline.ts

## Purpose

Downloads the Lighthouse baseline artifact uploaded by the nightly `lighthouse.yml` CI run and writes it over the local `lighthouse-baseline.json`. It exists because the nightly job has no repository write access, so it publishes the proposed baseline as an artifact for a human (or developer) to fetch, review, and commit manually.

## Key elements

- **`BASELINE_ARTIFACT`** – Constant (`'lighthouse-baseline'`) naming the artifact the `lighthouse.yml` workflow uploads.
- **`pullArtifact(...)` call** – Pulls that artifact using the `lighthouse-pull` tag, mapping the artifact's internal file `lighthouse-baseline.json` to the local path defined by `LIGHTHOUSE_BASELINE_PATH`.
- **Success handler** – Prints a reminder to `git diff` and commit the change.
- **Error handler** – Logs the error message and sets `process.exitCode = 1` (covers both "no artifact yet" and network/GitHub auth failures).

## Relationships

- **`scripts/lighthouse/baseline.ts`** – Imports `LIGHTHOUSE_BASELINE_PATH`, the single source of truth for where the local baseline JSON lives. This file never hard-codes the path.
- **`scripts/testing/pull-artifact.ts`** – Provides the `pullArtifact` helper that encapsulates the `gh` CLI artifact-download logic. This file supplies the artifact name, file mapping, and CI tag.

## Notes

- Requires the GitHub CLI to be installed and authenticated (`gh auth login`); the script does not set up auth itself.
- The tag `lighthouse-pull` scopes which run's artifact is fetched—distinct from the upload tag the nightly uses.
- The script is run via `npm run test:lighthouse:pull` (tsx shebang); it is not a module with exports.
- Failure is signalled via `process.exitCode = 1` rather than `process.exit`, so pending stdout/stderr still flushes before the shell sees the non-zero code.
