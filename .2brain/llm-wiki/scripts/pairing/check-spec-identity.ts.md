---
source: scripts/pairing/check-spec-identity.ts
sha256: 6e80e47341069b61f9d5f27af2d5025c7cc17fd049ae3bd5ef139d19e9e438ab
signature: 30c29072d1531075794fa9231129c4c99b97062cbe18d39aedfe229dbfbf9f7b
generated_at: 2026-11-10T02:46:27.195319+00:00
model: ollama:qwen3.8:27b
---

# scripts/pairing/check-spec-identity.ts

## Purpose

CLI entry point for the cross-repo contract check. It compares a fixed set of shared spec files between this repository and its paired backend checkout, failing if they have drifted. Wired into `ci.yml`, `npm run complete` (pre-commit gate), and available standalone via `npm run check`.

## Key elements

- **`siblingRoot`** — Resolved path to the paired backend checkout, obtained from `resolveBackendPath()`.
- **Missing-sibling guard** — If the path does not exist on disk, the script exits early: exit `0` locally (with a `console.warn` explaining how to fix it) or exit `2` under CI (`process.env.CI` set).
- **`compareSharedFiles(siblingRoot)`** (from `./spec-identity`) — Performs the file-by-file comparison and returns a structured result.
- **`formatSharedFileProblems(comparisons, siblingRoot)`** (from `./spec-identity`) — Produces a human-readable failure report, or nothing when everything matches.
- **Exit codes** — `0` identical or skipped locally; `1` specs forked or a shared file missing on one side; `2` sibling checkout not found in a context where one is expected (CI).

## Relationships

- **`scripts/pairing/paired-backend-path.ts`** — Supplies `resolveBackendPath()` (shell `BACKEND_PATH` → `.env` → sibling-directory default) and the `DEFAULT_BACKEND_PATH` constant used in the "clone it here" hint.
- **`scripts/pairing/spec-identity.ts`** — Supplies all comparison logic: `compareSharedFiles`, `formatSharedFileProblems`, the `SHARED_FILES` list, and the `THIS_REPO` label. This file is the thin CLI layer over that module.

## Notes

- The script reads `.env` itself via `resolveBackendPath()`; `npm run` does not load `.env` into the environment.
- A missing sibling is intentionally **non-fatal locally** (exit 0) so that `npm run complete` remains usable for anyone who has cloned only one half of the pair. The same condition is **fatal under CI** (exit 2) because `ci.yml` is expected to check out the sibling first — a missing sibling there signals a misconfigured workflow, not a developer's partial clone.
- The comment block in the header explicitly warns that the local leniency is "exactly how a check quietly stops running," which is the rationale for keeping it fatal in the one place (CI) where a real fork could otherwise go unnoticed.
