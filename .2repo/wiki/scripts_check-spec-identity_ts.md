# scripts/check-spec-identity.ts

## Purpose

CLI entry point (`npm run check:spec-identity`) that verifies shared contract files in this repo are byte-identical to those in the paired backend repo. It resolves the sibling path, runs the comparison, and communicates the result exclusively through exit codes (0 / 1 / 2) and a single console message.

## Key elements

- **Top-level script (no exports).** Runs as `#!/usr/bin/env tsx`; all logic executes on import.
- **`process.loadEnvFile()`** — loaded in a `try/catch` before path resolution so `BACKEND_PATH` from `.env` is available without a dotenv dependency.
- **Missing-sibling branch** — if `resolveBackendPath()` points to a path that doesn't exist:
  - `CI` env var set → `console.error` + `exit(2)` (workflow misconfiguration).
  - No `CI` → `console.warn` + `exit(0)` (developer's half-cloned pair; check is skipped, not failed).
- **Comparison branch** — calls `compareSharedFiles(siblingRoot)` then `formatSharedFileProblems(comparisons, siblingRoot)`. Problems → `exit(1)`; clean → success message + `exit(0)`.
- **Exit-code contract:** `0` identical *or* locally skipped, `1` contract fork, `2` sibling absent in a context that should have one.

## Relationships

- **`scripts/paired-backend-path.ts`** — provides `resolveBackendPath()` (resolves `BACKEND_PATH` env / `.env` / sibling-directory default) and `DEFAULT_BACKEND_PATH` (used only in the "not found" hint message).
- **`scripts/spec-identity.ts`** — provides the actual comparison logic: `compareSharedFiles()`, `formatSharedFileProblems()`, plus the `SHARED_FILES` list and `THIS_REPO` label used in output messages.

## Notes

- The script is deliberately non-importable as a library; it has no named exports. Any refactor that needs the comparison logic should go into `spec-identity.ts`.
- The `CI` check is a single `process.env.CI` truthy test — any runner that sets that variable (GitHub Actions, GitLab CI, CircleCI, etc.) gets the strict behavior. There is no project-specific flag.
- The `try/catch` around `process.loadEnvFile()` is intentional: in CI the variable arrives from the real environment, and a missing `.env` must not crash the script.
- This file is part of `npm run complete` (the pre-commit gate) *and* `ci.yml`; the different exit-code semantics for a missing sibling are what make it safe in both contexts.
