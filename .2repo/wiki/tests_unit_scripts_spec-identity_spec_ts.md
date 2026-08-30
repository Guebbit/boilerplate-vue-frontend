# tests/unit/scripts/spec-identity.spec.ts

## Purpose
Vitest suite for `scripts/spec-identity.ts`, the cross-repo contract check that verifies shared files (OpenAPI, AsyncAPI, analytics-events) are identical between this frontend checkout and its paired backend. Tests run against synthetic temp-directory fixtures so they work on any CI runner or standalone clone, plus a conditional live check against the real sibling when present.

## Key elements

- **`makeRoot` / `root`** — Creates a throwaway temp directory populated with a name→contents map; all roots are tracked in a module-level `roots[]` array and removed in `afterAll`.
- **`sharedFiles(role)`** — Builds a fixture object keyed by the file's path *as that role spells it*, with contents keyed by pair index (not path) so cross-path pairs compare content correctly.
- **`backendPath(entry)`** — Resolves a `SHARED_FILES` entry's backend side to a single path (first candidate when multiple exist).
- **`OPENAPI` / `ASYNCAPI`** — Named string constants for the two contract filenames, declared as variables to avoid lint errors from dot-containing literal object keys.
- **`sharedFilesWith` / `withoutFile`** — Fixture helpers that replace or delete a single entry from the base `sharedFiles` output.
- **`CROSS_PATH`** — The first `SHARED_FILES` entry whose frontend and backend paths differ.
- **`CANDIDATE_ENTRY` / `FIRST_CANDIDATE` / `SECOND_CANDIDATE`** — The entry with a multi-path backend candidate; used to exercise candidate-fallback logic.
- **`describe('SHARED_FILES')`** — Asserts the constant's shape: this repo is `'frontend'`, exactly three files are listed, no duplicates, and at least one cross-path and one multi-candidate entry exist.
- **`describe('compareSharedFiles')`** — Exercises match, drift (one-side edit), cross-path matching, second-candidate fallback, `missing-there` vs. missing-checkout distinction, and deletion on the local side.

## Relationships

- **`scripts/spec-identity.ts`** (primary subject under test) — Imports `SHARED_FILES`, `THIS_REPO`, `siblingRole`, `compareSharedFiles`, `formatSharedFileProblems`, `hashFile`, `fingerprint`, `sharedFileProblems`, and the `RepoRole` type. Every assertion in this file validates one of those exports.
- **`scripts/paired-backend-path.ts`** — Imports `resolveBackendPath`, which is used (indirectly through the candidate-resolution logic under test) to pick which of multiple backend layout paths actually exists on disk.

## Notes

- Fixtures derive their file list from `SHARED_FILES` rather than a hardcoded array, so adding a file to the contract automatically covers it in every case here without editing this spec.
- Contents are keyed by **index** (not path) because the two repos may store the same logical file at different paths; keying by path would make every cross-path pair appear forked.
- The "real pair" test (live sibling comparison) is intentionally conditional: it **skips** rather than passes silently when the sibling checkout is absent, so a missing check is visible in CI output.
- This file mirrors a sibling test in the backend repo, except for the two-backend-candidate cases, which exist only here because only this repo faces more than one possible backend layout.
