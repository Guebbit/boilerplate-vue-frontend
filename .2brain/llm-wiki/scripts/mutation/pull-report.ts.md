---
source: scripts/mutation/pull-report.ts
sha256: a5fb52d82a4535f35390c15315bf03621fdec6fcb34b326223a0d8e0a22f530e
signature: 9c06212acc3376ae38e9701b0e84caa8b777521554f3512768ff2a2252416533
generated_at: 2026-11-10T02:45:46.134386+00:00
model: ollama:qwen3.8:27b
---

# scripts/mutation/pull-report.ts

## Purpose

Brings the latest nightly mutation-testing report back from CI into the local working tree, then re-derives `mutation-baseline.json` from that report using the same code path CI uses. It exists so the local baseline is always a faithful copy of what the nightly produced, eliminating any chance of drift between the report and its baseline.

## Key elements

- **`REPORT_ARTIFACT`** – Name of the GitHub Actions artifact (`mutation-report`) that the nightly uploads.
- **`REPORT_DIRECTORY`** – `path.dirname(MUTATION_REPORT_PATH)`; the destination folder where the pulled `mutation.json` and `index.html` are written (same location a local run uses).
- **`recordBaseline()`** – Spawns `npx tsx scripts/mutation/check-baseline.ts --update` via `spawnSync`; returns the child's exit code (1 = a file is below its baseline, 2 = unexpected failure).
- **Main flow (top-level `pullArtifact(...).then(...)`)** – Downloads `mutation.json` and `index.html` from the artifact, then calls `recordBaseline()` and prints a reminder to review and commit the baseline diff. Catches errors, sets `process.exitCode = 1`.

## Relationships

- **`github/workflows/mutation.yml`** – Produces the `mutation-report` artifact that this script downloads. This script is the local consumer of that workflow's output.
- **`scripts/mutation/baseline.ts`** – Supplies `MUTATION_REPORT_PATH`, which determines where pulled files are written and (indirectly) which baseline file gets updated.
- **`scripts/testing/pull-artifact.ts`** – Provides the `pullArtifact` helper that performs the actual GitHub-artifact download via the `gh` CLI.

## Notes

- Requires a logged-in GitHub CLI (`gh auth login`); the script exits 1 if no run has uploaded a report yet or GitHub is unreachable.
- The baseline is re-recorded with the **same** `check-baseline.ts --update` command CI uses, guaranteeing the two sources cannot disagree.
- After a successful pull, the operator is expected to `git diff mutation-baseline.json` and commit the change manually — the script does not commit anything itself.
- `spawnSync` (not async) is used for the baseline step because the script is a short-lived CLI; the overall flow is still top-level-await style via `.then()`.
