# tests/unit/scripts/paired-backend-path.spec.ts

## Purpose

Unit tests for `scripts/paired-backend-path.ts`, the resolver that tells both halves of a frontend/backend pairing where to find each other. The tests focus on the failure modes that produce confusing downstream errors (wrong npm prefix, false fork reports) rather than the happy path, and on the subtle distinction between "unset" and "set to empty string."

## Key elements

- **`describe('resolveBackendPath')`** — Verifies the sibling-directory fallback, that empty/whitespace values are treated as unset (not as `path.resolve(cwd, '')`), that relative overrides resolve against `cwd`, and that the result is always an absolute path.
- **`describe('resolveLiveResetCommand')`** — Confirms the function returns `undefined` when unset/empty (so the step is skipped), and that the `{backend}` placeholder is substituted with the resolved path.
- **`describe('resolveBackendDemoCommand')`** — Same unset/empty checks, plus that the `{backend}` placeholder is substituted and that the returned array never contains empty-string arguments (which `spawn` would reject).
- **`afterEach`** — Restores (or deletes) `BACKEND_PATH`, `BACKEND_DEMO_COMMAND`, and `LIVE_RESET_COMMAND` to their pre-test values.
- **`sibling`** — Module-level constant: `path.resolve(cwd, DEFAULT_BACKEND_PATH)`, the expected sibling checkout location used as the reference for all assertions.

## Relationships

- **Imports from `scripts/paired-backend-path.ts`** — The module under test; exercises `DEFAULT_BACKEND_PATH`, `resolveBackendPath`, `resolveBackendDemoCommand`, and `resolveLiveResetCommand`.
- The module under test is consumed by `cypress.config.ts` (shells into the path via `npm --prefix` for `cy.resetState()`) and `check-spec-identity.ts` (hashes files under it). The tests exist so a regression in resolution doesn't surface as an opaque npm error or a false fork report in those callers.
- The file's doc comment notes it mirrors `tests/unit/scripts/frontend-path.test.ts` in the backend repo (same structure, opposite direction).

## Notes

- **The empty-string case is the load-bearing test.** `.env-example` ships `BACKEND_PATH =` (no value), so every copied `.env` defines the variable as `''`. Using `??` would let `''` through to `path.resolve(cwd, '')`, which resolves to *this repo's own root* — the sibling check would then compare the frontend against itself. The tests assert that `''` and `'   '` both fall back to the sibling convention.
- **`resolveBackendDemoCommand` returns an array (argv), not a string.** The backend is spawned via `child_process.spawn` without a shell, so a string would have its signals swallowed. `resolveLiveResetCommand` returns a string because it is intended for `npm --prefix` (shell context). The "no empty arguments" test guards the `split` used to build the argv.
- Env-var restoration in `afterEach` distinguishes "was `undefined`" (delete the key) from "was set" (restore the old value), avoiding cross-test contamination under Vitest's parallel runner.
