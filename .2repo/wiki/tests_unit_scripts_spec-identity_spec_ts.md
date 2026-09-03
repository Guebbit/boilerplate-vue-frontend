# tests/unit/scripts/spec-identity.spec.ts

## Purpose

Unit tests for the cross-repo contract checker (`scripts/spec-identity.ts`). Validates that the shared-file comparison logic works correctly against synthetic fixture roots (no sibling checkout required), that the YAML fingerprint normalises semantically-equivalent serialisations, and that the real-pair comparison runs conditionally when a sibling repo is present.

## Key elements

- **`makeRoot`** — creates a temp directory populated with named files; tracked for cleanup in `afterAll`.
- **`sharedFiles(role, suffix?)`** — builds a `Record<string, string>` of all `SHARED_FILES` using the *role-specific* path names but indexed (not named) contents, so the two sides can differ in filename without appearing forked.
- **`sharedFilesWith` / `withoutFile`** — fixture variants that replace or remove a single entry; exist as computed-key helpers to avoid a lint rule triggered by string-literal object keys like `'openapi.yaml'`.
- **`OPENAPI` / `ASYNCAPI`** — named constants for the two contract filenames.
- **`HERE` / `THERE`** — shorthand for `'frontend'` / `'backend'` roles.
- **`CROSS_PATH`** — the first entry in `SHARED_FILES` whose `backend` and `frontend` paths differ.
- **`describe('SHARED_FILES')`** — guards the module's static data: `THIS_REPO` value, coverage of both contract files, exclusion of regenerated files, existence of a cross-path pair, no duplicates.
- **`describe('compareSharedFiles')`** — exercises match, cross-path match, one-sided drift, missing-sibling, missing-here, and empty-empty cases.
- **`describe('fingerprint')`** — confirms YAML normalisation (quoting, key order, chomping) produces identical digests while genuine content or list-order differences do not; non-YAML files fall through to `hashFile`.
- **`describe('hashFile')`** — basic byte-hash equivalence (section truncated in source).

## Relationships

- **`scripts/spec-identity.ts`** — the module under test. The spec imports `SHARED_FILES`, `THIS_REPO`, `siblingRole`, `compareSharedFiles`, `formatSharedFileProblems`, `hashFile`, `fingerprint`, `sharedFileProblems`, and the `RepoRole` type.
- **`scripts/paired-backend-path.ts`** — imported via `resolveBackendPath`; used by the conditional real-pair test to locate the sibling checkout.

## Notes

- Fixtures are derived from `SHARED_FILES`, so adding a new shared file automatically covers every test case without editing this file.
- File contents are keyed by *index* (`shared-0 contents…`) rather than by path, because the two repos use different filenames for the same logical file.
- The real-pair test (when a sibling checkout exists) is intentionally conditional: it reports **skipped** rather than passing silently, so a missing sibling is visible in the output.
- The `fingerprint` tests encode specific real-world YAML serialisation differences (PHP `symfony/yaml` vs. redocly dumper, chomping indicator `|` vs `|-`) that a raw byte hash would falsely flag as forks.
- List order is deliberately *not* normalised (e.g., `enum: [a,b]` ≠ `enum: [b,a]`), because position is semantically significant in OpenAPI/AsyncAPI.
- Mirrors `tests/unit/scripts/spec-identity.test.ts` in the backend repo, minus the YAML-fingerprint section (that section is unique to this frontend copy).
