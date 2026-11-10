---
source: mutation-baseline.json
sha256: 4053dbdc499da78fb544381493fb6cdcba22825056ce5af74713fad5de2a0e9c
signature: 4053dbdc499da78fb544381493fb6cdcba22825056ce5af74713fad5de2a0e9c
generated_at: 2026-11-10T02:17:08.439407+00:00
model: ollama:qwen3.8:27b
---

# mutation-baseline.json

## Purpose
Stores the last-known mutation-testing scores (percentage of mutants killed, 0–100) for every tracked source file. It serves as a reference point so that CI can detect score regressions or improvements relative to the previous run. The file is a generated artifact, not hand-edited.

## Key elements
- **`generatedAt`** — ISO-8601 timestamp indicating when the baseline was produced.
- **`files`** — Flat object keyed by source-file path (e.g. `src/modules/account/stores/auth.ts`) with a numeric score as the value. A score of `100` means all mutants in that file were killed; `0` means none were.

## Relationships
- **`github/workflows/mutation.yml`** — The CI workflow that runs the mutation-testing tool, writes this baseline, and/or compares the current run's per-file scores against the values stored here to gate or report changes.

## Notes
- This is a **generated file**; do not edit values by hand. It is overwritten on each baseline update.
- Scores are **per-file**, not per-line or per-mutant; a file at `100` still may have untested branches that simply produced no mutants.
- A handful of files sit well below the general cluster (e.g. `use-method-label.ts` at `0`, `use-post-login-redirect.ts` at `4.76`, `locales/schemas.ts` at `23.81`). These are expected hot-spots, not necessarily failures—check the workflow's threshold configuration before treating them as regressions.
- The `generatedAt` timestamp is the only way to know how stale the baseline is; there is no separate commit-linked version.
