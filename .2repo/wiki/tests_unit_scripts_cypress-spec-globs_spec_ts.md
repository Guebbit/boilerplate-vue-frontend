# tests/unit/scripts/cypress-spec-globs.spec.ts

## Purpose

Guard test that verifies every location which enumerates the Cypress spec set resolves to the **same file set**. It does so by expanding each glob against the real filesystem (via `globSync`) and comparing the resulting path arrays, rather than comparing glob strings — because a shallow `tests/e2e/*.cy.ts` and its recursive `tests/e2e/**/*.cy.ts` form look similar but schedule different suites once a spec lands in a subdirectory. It also asserts that config and script files reference the shared constants from `cypress-spec-globs.ts` instead of inlining their own globs.

## Key elements

- **`resolve(globs)`** — Expands a list of glob patterns (relative to repo root) into a sorted array of POSIX-style file paths using `node:fs` `globSync`.
- **`specArgumentOf(scriptName)`** — Reads `package.json`, extracts the `--spec` value from a named script (handling the `${E2E_SPEC:-…}` default in `test:e2e:spec`), and returns the individual glob strings.
- **`codeLinesOf(file)`** — Reads a source file as text and strips comment lines, so the test can search for glob literals in *code* without false-matching prose.
- **"every spelling resolves to the same files"** — Asserts `test:e2e:serial|live|spec` each match `FUNCTIONAL_SPEC_GLOBS`, `test:e2e:visual|visual:update` each match `VISUAL_SPEC_GLOBS`, that the two suites partition `ALL_SPEC_GLOBS` with no overlap, and that neither suite is empty.
- **"nothing spells the spec set by hand"** — Checks `cypress.config.ts`, `eslint.config.ts`, and `scripts/run-e2e-shards.ts` for absence of inline `*.cy.ts` / `{cy,spec}` globs and for presence of a `SPEC_GLOBS` token.

## Relationships

- **`scripts/cypress-spec-globs.ts`** — Source of the three imported constants (`ALL_SPEC_GLOBS`, `FUNCTIONAL_SPEC_GLOBS`, `VISUAL_SPEC_GLOBS`). This test is the primary consumer that pins their values to the filesystem.
- **`scripts/run-e2e-shards.ts`** — Inspected as text to confirm it references the shared constant rather than hard-coding a glob.
- **`src/modules/cart/tests/use-line-quantity.spec.ts`** — A member of the resolved spec set; any glob regression that would exclude (or duplicate) this file is caught by the set-equality assertions.

## Notes

- Cypress **intersects** `--spec` with `specPattern`: a spec outside the pattern silently doesn't run even if explicitly named, and a shallow glob yields a green run with fewer specs. This is the failure mode the test guards.
- Config files (`cypress.config.ts`, `eslint.config.ts`) are read as text, **not** imported, to avoid pulling their plugin graphs into the jsdom test environment.
- The `E2E_SPEC` environment-override in `test:e2e:spec` is intentionally **not** validated — only the fallback default is checked, since the override is the caller's responsibility.
- The "is checking a real suite" test (functional > 20 files, visual > 5) prevents every assertion from passing vacuously on an empty resolution.
