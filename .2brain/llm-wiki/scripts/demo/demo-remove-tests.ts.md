---
source: scripts/demo/demo-remove-tests.ts
sha256: 69dfafe3088770cc946fbc89f7074e0199f09e1a31b2709ba36554424ddc7fb4
signature: fdc57f4c31923f7301a922247606a64e0b82efe23d22c5cd1dd1e2fe2140c52c
generated_at: 2026-11-10T02:28:37.821728+00:00
model: ollama:qwen3.8:27b
---

# scripts/demo/demo-remove-tests.ts

## Purpose

The frontend test-cleanup step of the demo-remove workflow (twin to the backend's `scripts/ops/demo-remove-tests.ts`). It deletes cross-module spec files under `tests/e2e/` that reference an already-removed module, and validates that every spec under `tests/e2e/specs/` carries a well-formed `// requires-module:` header. Module-owned specs (under `src/modules/<name>/tests/`) are out of scope—they go with their folder.

## Key elements

- **`RemovalNote`** (interface) — shape of one entry in the deletion report: `file` (repo-relative path) and `detail` (human-readable reason).
- **`requiredModules(source)`** — parses the `// requires-module: a, b` header out of a spec's text. Returns `string[]` (empty for `none`), or `undefined` when no header exists.
- **`removeResidueSpecs(repoRoot, names)`** — walks `tests/e2e/`, deletes any `.ts` spec whose header names a removed module *or* whose source imports `@/modules/<removed>/`. Returns `RemovalNote[]`.
- **`scannedSpecFiles(repoRoot)`** — returns every `.ts` file under `tests/e2e/specs/`. Exported so tests can cross-check a glob against the walker.
- **`headerProblems(repoRoot, knownModules)`** — audits `tests/e2e/specs/` for missing or stale headers. Flags journeys specs lacking a header and headers naming a module that doesn't exist. Returns an array of problem sentences (empty = all sound).

Internal helpers: `walkTypeScript` (recursive `.ts` file walker, returns `[]` for missing dirs) and `importsRemovedModule` (line-anchored regex for `import`/`export … from "@/modules/<name>/"`).

## Relationships

- **`scripts/demo/demo-remove.ts`** — the parent demo-remove script; it calls `removeResidueSpecs` (and likely `headerProblems`) as one step in the removal pipeline.
- **`tests/unit/scripts/demo/demo-remove-tests.spec.ts`** — unit tests exercising `requiredModules`, `removeResidueSpecs`, `scannedSpecFiles`, and `headerProblems` against fixtures.
- **`tests/cross-cutting/journey-headers.spec.ts`** — integration-level test that runs `headerProblems` across the real spec tree and asserts no problems (or validates expected problems).
- **`src/modules/shop-tasks/tests/notices.spec.ts`** — representative of module-owned specs; *not* scanned by this file (different ownership path), but serves as the counter-example in the design rationale.

## Notes

- Deletion is whole-file, not line-editing: a spec that references a removed module is assumed to have nothing left to assert.
- The `importsRemovedModule` regex is anchored to line-start (`^\s*`) specifically to avoid matching import strings that appear inside fixture data or string literals.
- `headerProblems` is fail-closed in both directions: a missing header on a `journeys/` spec would let `demo:remove` delete a spec that shouldn't go; a header naming a non-existent module would never match and orphan the spec.
- `scannedSpecFiles` is exported solely so the unit test can verify the walker found the expected number of files (guard against a silent empty scan).
