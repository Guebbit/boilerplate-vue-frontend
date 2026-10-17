---
source: tests/unit/scripts/pairing/spec-identity.spec.ts
sha256: c1f862620e3fea61dfc416c72c6ccf6a0ea9d6defa6fd670e04cb1b17ff74a94
generated_at: 2026-10-17T02:45:16.808951+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/pairing/spec-identity.spec.ts

## Purpose

Vitest suite that exercises the cross-repo contract-comparison logic in `scripts/pairing/spec-identity.ts` entirely against synthetic temp directories. It verifies that the comparison function correctly reports matches, drifts, and missing files between a frontend and a backend copy of shared spec files, and that the YAML-aware `fingerprint` normalizes formatting differences while still catching real content changes. It does **not** assert that the two real repos agree today — that is the job of the dedicated `check:spec-identity` CI job.

## Key elements

- **`makeRoot(files)`** — creates a `mkdtempSync` directory and writes the given `Record<name, contents>` into it.
- **`sharedFiles(role, suffix?)`** — builds a fixture record keyed by the *role-specific* path (from `SHARED_FILES`), with contents indexed by array position so both sides get identical bytes despite different filenames.
- **`OPENAPI` / `ASYNCAPI`** — named string constants for `'openapi.yaml'` and `'asyncapi.yaml'`; declared as variables because a bare string literal as an object key trips the project's naming-convention lint rule.
- **`sharedFilesWith(role, file, contents)` / `withoutFile(role, file)`** — one-entry mutation helpers for single-file fixture variants.
- **`HERE` / `THERE`** — role constants (`'frontend'` / `'backend'`).
- **`CROSS_PATH`** — the first entry in `SHARED_FILES` whose `backend` and `frontend` paths differ; used to exercise the cross-path comparison path.
- **`root(files)`** — wraps `makeRoot` and registers the path in a `roots` array for `afterAll` cleanup via `rmSync`.
- **`describe('SHARED_FILES')`** — asserts `THIS_REPO` is `'frontend'`, the exact set of six shared files, exclusion of generated files, presence of at least one cross-path pair, and no duplicates.
- **`describe('compareSharedFiles')`** — covers identical matches, cross-path match/drift, missing-sibling (empty sibling root), missing-here, and the empty-vs-empty no-throw case.
- **`describe('fingerprint')`** — verifies that `fingerprint` equals `hashFile` for non-YAML, normalises YAML quoting / map-key order / block-scalar chomping (`|` vs `|-`), still distinguishes different content, and does **not** reorder YAML lists.

## Relationships

- **`scripts/pairing/spec-identity.ts`** — the module under test. This spec imports `SHARED_FILES`, `THIS_REPO`, `siblingRole`, `compareSharedFiles`, `formatSharedFileProblems`, `hashFile`, `fingerprint`, `sharedFileProblems`, and the `RepoRole` type directly from it.
- The other listed neighbours (`security-txt-entrypoint.spec.ts`, `demo-remove-registry.spec.ts`, `demo-remove-tests.spec.ts`) share no visible import, helper, or data dependency with this file.

## Notes

- Fixtures are keyed by **array index**, not filename, precisely because the two repos disagree on where seed-identity files live; keying by path would make every pair appear forked.
- The `OPENAPI`/`ASYNCAPI` constants exist solely to sidestep a lint rule that flags string-literal object keys; the computed-key helpers (`sharedFilesWith`, `withoutFile`) are the only two fixture shapes needed.
- All tests run without a sibling checkout — that is intentional so the suite passes on any standalone clone or CI runner. The live "do the two repos agree right now?" assertion lives in a separate CI job.
- `fingerprint` normalises YAML formatting (quoting, map-key order, chomping) but deliberately preserves list order, since positional meaning (`security`, `enum`, path `parameters`) is semantically significant.
- Temp roots are tracked in a module-level `roots` array and force-removed in `afterAll`; individual tests do not clean up after themselves.
