---
source: tests/unit/scripts/e2e/cypress-spec-globs.spec.ts
sha256: 1a72e6d896851d678d4b0e960458b673e56f10fa5bcc64aba5579ae22bc7281d
generated_at: 2026-10-17T02:42:27.097634+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/cypress-spec-globs.spec.ts

## Purpose

Vitest unit test that verifies the `--spec` glob arguments hard-coded in `package.json` npm scripts resolve to the **same set of spec files** as the canonical constants exported by `scripts/e2e/cypress-spec-globs.ts`. It compares resolved file lists (via `globSync`) rather than raw strings, guarding against the subtle failure where a shallow `tests/e2e` glob and its recursive `**` form look nearly identical but schedule different suites. A second suite of tests also enforces that downstream config files reference the shared constant rather than re-spelling globs inline.

## Key elements

- **`resolve(globs)`** — runs `globSync` against the repo root and returns a sorted, normalised file list.
- **`scripts()`** — reads `package.json` at the repo root and returns its `scripts` record.
- **`specArgumentOf(scriptName)`** — regex-extracts the `--spec` value from a named npm script (handles the `${E2E_SPEC:-…}` default wrapper), splits it into individual glob strings.
- **`codeLinesOf(file)`** — reads a config/script file as text and strips comment lines, so only executable code is inspected.
- **`describe('every spelling…')`** — five `it` cases: four map specific `test:e2e:*` scripts to their expected suite constant; one verifies the three suites (functional, visual, antibot) form a disjoint partition equal to `ALL_SPEC_GLOBS`. A sixth case asserts antibot specs are excluded from the functional set and carry the `.antibot.cy.ts` suffix.
- **`it('is checking a real suite')`** — "guard on the guard": asserts the functional suite has > 20 files and visual > 5, so an empty glob can't silently pass.
- **`describe('nothing spells the spec set by hand')`** — scans `cypress.config.ts`, `eslint.config.ts`, and `scripts/e2e/run-shards.ts` for a glob pattern that reaches a `.cy.ts` extension; expects zero hits and at least one reference to `SPEC_GLOBS`.

## Relationships

- **`scripts/e2e/cypress-spec-globs.ts`** — the sole imported dependency. All four exported constants (`ALL_SPEC_GLOBS`, `FUNCTIONAL_SPEC_GLOBS`, `VISUAL_SPEC_GLOBS`, `ANTIBOT_SPEC_GLOBS`) are the "source of truth" this spec validates against.
- **`scripts/e2e/run-shards.ts`** — inspected as text in the "nothing spells the spec set by hand" block; the test asserts it references `SPEC_GLOBS` rather than inlining a glob.

## Notes

- Config files are read as **text** (`readFileSync`), not imported, to avoid pulling their plugin dependency graphs into the Vitest/jsdom environment. The same pattern is used by `mutate-scope.spec.ts` for `vitest.config.ts`.
- The comparison strategy is deliberate: resolving both sides to concrete file lists and comparing arrays avoids false passes from two differently-scoped globs that are textually similar (e.g. `tests/e2e/*.cy.ts` vs `tests/e2e/**/*.cy.ts`).
- `REPO_ROOT` is computed as four directory levels up from this file's location; the file must stay at exactly that depth for the path to resolve correctly.
- The `specArgumentOf` regex only captures the **default** value inside `${E2E_SPEC:-…}`; caller-supplied overrides are out of scope for this test.
