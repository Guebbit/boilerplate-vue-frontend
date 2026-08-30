# scripts/paired-backend-path.ts

## Purpose

Centralises the resolution of the paired backend's filesystem path and its operational commands (reset, demo). Exists so that every consumer agrees on *which* backend directory they mean and *how* to invoke it, without duplicating env-reading, path-resolution, or placeholder-substitution logic across `cypress.config.ts`, spec-identity checks, and demo bootstrapping.

## Key elements

- **`DEFAULT_BACKEND_PATH`** (`const`, `'../boilerplate-node-backend'`) — sibling-checkout convention. Serves as the fallback when `BACKEND_PATH` is unset or empty.
- **`resolveBackendPath()`** — Returns the backend location as an **absolute** path. Reads `BACKEND_PATH` (trimmed); treats `undefined` and `''` as unset; otherwise falls back to `DEFAULT_BACKEND_PATH`.
- **`resolveLiveResetCommand()`** — Returns the shell command string for `cy.resetState()`, or `undefined`. Reads `LIVE_RESET_COMMAND` (trimmed); substitutes `{backend}` with the resolved absolute path.
- **`resolveBackendDemoCommand()`** — Returns the demo-boot command as a **`readonly string[]`** (whitespace-split), or `undefined`. Reads `BACKEND_DEMO_COMMAND` (trimmed); substitutes `{backend}`. The array form avoids an intervening shell so the spawned process receives the kill signal directly.

## Relationships

- **`cypress.config.ts`** — Consumes `DEFAULT_BACKEND_PATH` (or the resolved override) inside `cy.exec('npm --prefix …')` calls for `cy.resetState()`.
- **`scripts/check-spec-identity.ts`** — Uses the same default so the identity check and Cypress never disagree about the target directory.
- **`tests/support/e2e/commands.ts`** — Wraps `resolveLiveResetCommand()` in the custom `cy.resetState` command.
- **`scripts/run-backend-demo.ts`** — Calls `resolveBackendDemoCommand()` to spawn (or skip) the backend before a shard runs.
- **`scripts/run-e2e-shards.ts`** — Orchestrates demo-boot and reset around shard execution.
- **`tests/unit/scripts/paired-backend-path.spec.ts`** — Unit tests for every export in this file.
- **`docs/tools/live-e2e.md` / `docs/getting-started.md`** — Document the `BACKEND_PATH`, `LIVE_RESET_COMMAND`, and `BACKEND_DEMO_COMMAND` variables that drive these resolvers.

## Notes

- **Empty ≠ unset.** All three resolvers treat a zero-length (or whitespace-only) env value as "not set" via `?.trim() ||` / ternary. A naive `??` check would let `BACKEND_PATH=` (as declared in `.env-example`) resolve to `path.resolve(cwd, '')` — i.e. *this* repo's root — and the sibling comparison would silently compare the frontend against itself.
- **`{backend}` is the only placeholder.** Callers never hardcode the path into the command string; substitution happens here, once.
- **Two backends, one frontend.** The command strings differ between the TypeScript and PHP paired backends (npm script vs. `composer`). The choice lives entirely in `.env` / `.env-example`; this file deliberately hardcodes neither spelling so an unconfigured checkout cannot accidentally run the wrong backend's reset or demo.
- **No shell in the demo path.** `resolveBackendDemoCommand` splits on `/\s+/` and returns an array specifically so the process is a direct child of the test runner (kill-by-signal semantics), not a child of a shell that would absorb the signal.
