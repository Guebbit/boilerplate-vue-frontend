---
source: tests/unit/scripts/e2e/cypress-spec-globs.spec.ts
sha256: 54a2dbe9d3504e4fe92cd97a64e30117262a56b311c6b56f77bde8edc1ea561b
signature: 1f456dfd3cc819f83bbfae26e4b4539a424ddb5caf0d7f9f842418253f236e49
generated_at: 2026-11-10T08:15:46.716847+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/cypress-spec-globs.spec.ts

## Purpose

Guard test that the five places defining "which Cypress specs exist" actually agree. It resolves the `--spec` globs hardcoded in `package.json` npm scripts against the real filesystem and compares the resulting file sets to those produced by the constants in `scripts/e2e/cypress-spec-globs.ts`, catching the silent failure mode where a shallow `tests/e2e` glob and its recursive form look alike but schedule different suites. It also asserts that config files and helper scripts reference the shared constants rather than inlining their own glob strings.

## Key elements

- **`resolve(globs: string[])`** — runs `globSync` (Node 22+) against `REPO_ROOT` and returns a sorted array of POSIX-normalised paths. Used to compare *sets of files*, never raw strings.
- **`scripts()`** — reads `package.json` with `JSON.parse` and returns the `scripts` map.
- **`specArgumentOf(scriptName)`** — extracts the `--spec` value from a named npm script via regex, unwrapping the `${E2E_SPEC:-…}` default, then splits on commas into individual globs.
- **`codeLinesOf(file)`** — reads a source file as plain text and returns lines with comment lines (`//` or `/*`) stripped, so glob detection only sees code.
- **Test suite "every spelling … resolves to the same files"** — asserts `test:e2e:serial`, `test:e2e:live`, `test:e2e:visual`, `test:e2e:visual:update`, and `test:e2e:antibot` each resolve to exactly the matching constant's file set; that the three suites partition `ALL_SPEC_GLOBS` with no overlap; that antibot specs are excluded from the functional set; and (guard on the guard) that the resolved sets are non-trivially sized.
- **Test suite "nothing spells the spec set by hand"** — scans `cypress.config.ts`, `eslint.config.ts`, and `scripts/e2e/run-shards.ts` for inline `*.cy.ts` or `{cy,spec}` glob patterns and asserts none exist, while confirming each file *does* reference a `SPEC_GLOBS` constant.

## Relationships

- **`scripts/e2e/cypress-spec-globs.ts`** — the primary import source; provides `ALL_SPEC_GLOBS`, `ANTIBOT_SPEC_GLOBS`, `FUNCTIONAL_SPEC_GLOBS`, `VISUAL_SPEC_GLOBS`. Every "same files" assertion compares the resolved npm-script globs against these constants.
- **`scripts/e2e/run-shards.ts`** — checked in the "nothing spells the spec set by hand" suite to confirm it references the shared constants rather than hard-coding its own glob strings.

## Notes

- Comparison is done by resolving both sides to concrete file lists on disk, not by comparing glob strings. This is deliberate: two different globs can spell the same file set (or the same glob string can be a prefix of a recursive one), and only the resolved set matters to Cypress.
- `specArgumentOf` only checks the *default* of `${E2E_SPEC:-…}`; caller-supplied overrides are out of scope.
- Config files are read as text rather than imported to avoid pulling their entire plugin graph into the jsdom test environment (same rationale as `mutate-scope.spec.ts` reading `vitest.config.ts`).
- The glob-detection regex in the "nothing spells" test (`/\*[^\s"']*\.cy\.ts|{cy,spec}/`) is intentionally permissive: it catches both `*.cy.ts` and the `{cy,spec}` brace form, but will not match a `path.basename(file, '.cy.ts')` call, which is fine.
- `REPO_ROOT` is computed as four directory levels above this spec file; the file must remain at `tests/unit/scripts/e2e/` for the path to resolve correctly.
