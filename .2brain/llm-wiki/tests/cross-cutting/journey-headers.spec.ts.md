---
source: tests/cross-cutting/journey-headers.spec.ts
sha256: d0b8955c98ba778f5b116842a87a0ed5aefee04e269823ea981759cc1911f75b
generated_at: 2026-10-17T02:00:47.002459+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/journey-headers.spec.ts

## Purpose

Cross-cutting integration test that verifies every journey spec under `tests/e2e/specs/journeys/` declares a valid `// requires-module:` header (or `none`). Without this header, `npm run demo:remove` would strip the referenced module but leave the journey spec orphaned, causing a later failure. This spec runs the header-checker against the real repo tree (the checker's own unit tests live in `tests/unit/scripts/demo/demo-remove-tests.spec.ts`).

## Key elements

- **`REPO_ROOT`** — Resolves the repository root as two directory levels above this file, using `path.resolve` + `fileURLToPath(import.meta.url)` (ESM-compatible path resolution).
- **`describe('the requires-module headers of the e2e specs')`** — Single test suite containing one assertion.
- **`it('name only real modules, and every journey carries one')`** — Calls `headerProblems(REPO_ROOT, Object.keys(MODULE_GROUPS))` and asserts the result is an empty array, i.e. no journey spec is missing a header and no header references a non-existent module name.

## Relationships

- **`scripts/demo/demo-remove-tests.ts`** — Source of the `headerProblems` function, which walks the tree and reports any journey spec lacking a valid `// requires-module:` line. This spec is its only caller in the integration layer.
- **`scripts/module-groups.ts`** — Source of `MODULE_GROUPS`; its top-level keys define the set of module names that a header may reference. `Object.keys(MODULE_GROUPS)` is passed as the whitelist.

## Notes

- Lives in `tests/cross-cutting/` (not under a module folder) because it asserts a convention that spans all modules simultaneously — no single module "owns" it.
- The assertion is deliberately a single `toEqual([])` rather than individual per-spec checks: any violation surfaces as a diff in the returned problem list.
- Uses ESM `import.meta.url` rather than `__dirname`, consistent with the repo's `"type": "module"` setup.
