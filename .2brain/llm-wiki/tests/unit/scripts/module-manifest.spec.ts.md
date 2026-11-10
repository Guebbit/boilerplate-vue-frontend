---
source: tests/unit/scripts/module-manifest.spec.ts
sha256: 61f959de737ca5f130850792a3f5796f4c898e3799e8af16480ccd541eeba436
signature: 6f290fb09bd83c3a96277272cac5b7746de78b3ff1eb694dc9aeee2a07cfba97
generated_at: 2026-11-10T08:21:52.529427+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/module-manifest.spec.ts

## Purpose

Unit tests for `scripts/module-manifest.ts`. Validates that `loadModuleManifest` correctly reads `group` and `dependsOn` from each module's `module.yaml` and surfaces problems (missing file, invalid group); that `demoModuleNames` selects only `shop`/`example` groups; and that `assertAcyclicModuleEdges` rejects dependency cycles while tolerating legitimate shapes like diamonds and backend-only references.

## Key elements

- **`addModule(name, yaml?)`** – local helper that creates a scratch module folder under a per-test temp root and optionally writes a `module.yaml`.
- **`beforeEach` / `afterEach`** – create a unique `os.tmpdir()` subdirectory and tear it down, so every test case starts from a clean `src/modules` root.
- **`describe('loadModuleManifest')`** – asserts correct parsing of `group` + `dependsOn`, that modules without `dependsOn` are omitted from `edges`, and that `problems` is populated for a missing `module.yaml` or an invalid/absent `group`.
- **`describe('demoModuleNames')`** – asserts the filter keeps `shop` and `example` groups and drops `foundation`.
- **`describe('assertAcyclicModuleEdges')`** – five cases: the real `moduleDependsOn` graph passes; a 2-node cycle throws; a 3-node cycle throws; a dependency on a name with no local module folder (backend-only) is allowed; a diamond (two modules sharing a dependency) is not a cycle.

## Relationships

- **`scripts/module-manifest.ts`** – the module under test. The spec imports `assertAcyclicModuleEdges`, `demoModuleNames`, `loadModuleManifest`, and `moduleDependsOn` from it. `moduleDependsOn` is used directly as the production dependency graph in the acyclicity test.

## Notes

- Tests exercise a **scratch** `src/modules` tree (built in a temp dir), not the real source tree. The real tree's correctness is covered separately in `tests/cross-cutting/module-groups.spec.ts`, and the real graph is walked at lint time by `eslint.config.ts`.
- A dependency edge may point to a module name that has **no** `src/modules/<name>/` folder (e.g. a backend-only service). This is valid and must not be treated as an error or a cycle.
- Diamond topologies (A→C, B→C) are explicitly **not** cycles; only back-edges along a single path constitute a cycle.
