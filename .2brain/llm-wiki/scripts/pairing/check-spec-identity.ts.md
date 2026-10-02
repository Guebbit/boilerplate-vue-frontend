---
source: scripts/pairing/check-spec-identity.ts
sha256: f4d9445c0ea041d97d5bdb7af7452956e37c3d6ffd65d15170ff323ce708ad06
generated_at: 2026-10-02T11:40:16.015401+00:00
model: ollama:qwen3.8:27b
---

# scripts/pairing/check-spec-identity.ts

## Purpose

CLI entry point for the cross-repo contract check (`npm run check:spec-identity`). It locates the paired backend checkout, compares a set of shared contract files between the two repos, and reports whether they have forked. Serves as the gate for `npm run complete` (pre-commit) and is also invoked directly by `ci.yml`.

## Key elements

- **`siblingRoot`** — Resolved once at module top via `resolveBackendPath()`; the path to the backend checkout to compare against.
- **Missing-sibling branch** — If `existsSync(siblingRoot)` is false, the script checks `process.env.CI`: in CI it prints a diagnostic and exits **2**; locally it warns and exits **0** (skip).
- **Comparison branch** — Calls `compareSharedFiles(siblingRoot)`, then `formatSharedFileProblems(comparisons, siblingRoot)`. Non-empty result → exit **1**; otherwise logs success and exits **0**.
- **Exit-code contract** — `0` identical (or locally skipped), `1` specs have drifted, `2` sibling not found in an environment that should have one.

## Relationships

- **`scripts/pairing/paired-backend-path.ts`** — Provides `resolveBackendPath()` (shell `BACKEND_PATH` → `.env` → default convention) and `DEFAULT_BACKEND_PATH` used in the skip message.
- **`scripts/pairing/spec-identity.ts`** — Provides the actual comparison logic (`compareSharedFiles`, `formatSharedFileProblems`), the list of files to compare (`SHARED_FILES`), and the repo label for output (`THIS_REPO`).

## Notes

- Exit code **2** is deliberately separate from **1**: it signals an *environment* problem (sibling not checked out) rather than a *contract* drift, so callers can distinguish "misconfigured pipeline" from "specs forked".
- A missing sibling is non-fatal locally (exit 0) so that `npm run complete` remains usable for developers who cloned only one half of the pair. In CI the same condition is fatal (exit 2) because `ci.yml` is expected to check out the sibling first.
- The script reads `.env` itself (via `resolveBackendPath`) because `npm run` does not source `.env` into the shell environment.
- All logic is top-level (no exported functions); the file is a pure entry point.
