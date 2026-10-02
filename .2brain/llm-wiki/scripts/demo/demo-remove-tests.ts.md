---
source: scripts/demo/demo-remove-tests.ts
sha256: 3167e3b63ae1c74bceb61aeea2639702b65bf33682c6936fc00f08e1c857129c
generated_at: 2026-10-02T11:30:31.820572+00:00
model: ollama:qwen3.8:27b
---

# scripts/demo/demo-remove-tests.ts

## Purpose

Removes cross-module E2E specs (under `tests/e2e/`) that reference a module being deleted, and validates the `// requires-module:` headers on remaining specs. It is the frontend test-cleanup step in the `demo:remove` workflow, paired with the backend's `scripts/ops/demo-remove-tests.ts`.

## Key elements

- **`RemovalNote`** — interface for one deleted file (`file` path + `detail` reason) used in the removal report.
- **`requiredModules(source)`** — parses the `// requires-module: a, b` header from a spec's source. Returns `undefined` (no header), `[]` (header says `none`), or the listed module names.
- **`removeResidueSpecs(repoRoot, names)`** — walks `tests/e2e/`, deletes any `.ts` spec whose header names a removed module **or** whose source contains a `import`/`export … from` statement targeting `@/modules/<name>/`. Returns a `RemovalNote[]`.
- **`headerProblems(repoRoot, knownModules)`** — walks `tests/e2e/specs/` and reports two failure modes: specs under `journeys/` missing a header entirely, and specs whose header names a module not in `knownModules`.
- **`walkTypeScript(directory)`** *(internal)* — recursively collects `.ts` file paths; returns `[]` for a missing directory.
- **`importsRemovedModule(source, names)`** *(internal)* — regex test for a statement-leading import/export whose specifier matches one of the removed module names under `@/modules/`.

## Relationships

- **`scripts/demo/demo-remove.ts`** — the orchestration script that invokes `removeResidueSpecs` (and likely `headerProblems`) as part of its demo-removal pipeline.
- **`tests/unit/scripts/demo/demo-remove-tests.spec.ts`** — unit tests exercising `requiredModules`, `removeResidueSpecs`, and `headerProblems`.
- **`tests/cross-cutting/journey-headers.spec.ts`** — a cross-cutting spec that validates the `requires-module` header convention on journey specs; `headerProblems` is the programmatic counterpart to this check.

## Notes

- Deletion is **whole-file**, never in-place edit: a spec that lost its target module has nothing left to assert.
- `importsRemovedModule` is anchored to line-start (`^\s*`) to avoid false positives from strings that merely *quote* an import path (e.g., fixtures).
- `requiredModules` treats `none` as a valid header value that yields an empty list — distinct from `undefined` (no header). This distinction is what lets `headerProblems` flag a *missing* header versus a *forgotten* one.
- The script only touches `tests/e2e/`. Module-owned specs under `src/modules/<name>/tests/` are removed by the folder deletion itself, not by this script.
