---
source: scripts/pairing/check-spec-identity.ts
sha256: a86e6d51eab59312eec845ea79890fed73eb603e81737cec08c25b75dbd9ba09
generated_at: 2026-10-17T00:03:31.736184+00:00
model: ollama:qwen3.8:27b
---

# scripts/pairing/check-spec-identity.ts

## Purpose
CLI entry point (`npm run check:spec-identity`) that verifies the shared contract files in this repo are byte-identical to those in the paired backend repo. It exists to catch spec drift between the two halves of a paired-repo setup, and is wired into CI (`ci.yml`) and the pre-commit gate (`npm run complete`).

## Key elements
- **Top-level script logic** — no exports. Resolves the sibling path, checks existence, runs the comparison, and exits with a code.
- **Exit-code contract** — `0` identical or locally skipped; `1` files have forked or a shared file is missing on one side; `2` sibling checkout not found *and* `CI` is set (environment problem, not a contract problem).
- **CI vs. local branching** — when the sibling directory is absent: locally it prints a hint and exits `0` (so the pre-commit gate stays usable for a half-cloned pair); under `CI` it exits `2` (the workflow should have checked the repo out).
- **Comparison delegation** — calls `compareSharedFiles(siblingRoot)` for the actual diff and `formatSharedFileProblems(comparisons, siblingRoot)` for the human-readable failure report.

## Relationships
- **`scripts/pairing/paired-backend-path.ts`** — provides `resolveBackendPath()` (shell `BACKEND_PATH` → `.env` → sibling-directory convention) and `DEFAULT_BACKEND_PATH` (used in the "what to do" message). This file is the *consumer* of that resolution logic.
- **`scripts/pairing/spec-identity.ts`** — provides the comparison engine: `compareSharedFiles`, `formatSharedFileProblems`, the `SHARED_FILES` list, and the `THIS_REPO` label. This file is a thin CLI wrapper around that module.

## Notes
- `npm run` does **not** load `.env`, so `resolveBackendPath()` reads it itself; don't assume `dotenv` has run.
- Exit code `2` is deliberately separate from `1`: a standalone clone of the boilerplate should report "I can't see the other repo," not "your specs have drifted."
- The local leniency (exit `0` on missing sibling) is a known trade-off: it means the check silently does nothing on a half-cloned machine. The only place that leniency is removed is CI, where `ci.yml` is expected to check out the sibling first.
