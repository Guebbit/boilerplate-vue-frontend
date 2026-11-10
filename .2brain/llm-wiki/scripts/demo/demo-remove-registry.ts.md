---
source: scripts/demo/demo-remove-registry.ts
sha256: 5091209f1a4d3418f85a3e712b4ea5606b2c44ec5176bafefc1ee4bb31684ba3
signature: d79edb00c75ed8e84916700cb553bdd8c4e9029b25c098dee1a2e6c1361defab
generated_at: 2026-11-10T02:28:26.829207+00:00
model: ollama:qwen3.8:27b
---

# scripts/demo/demo-remove-registry.ts

## Purpose
Provides the filesystem and source-editing operations that remove demo modules from a checkout. It is called by `demo-remove.ts` to physically delete module folders and strip their registrations from `src/modules.ts`, so the removed modules no longer appear in the build or runtime.

## Key elements
- **`removeModuleFolders(root, names)`** (exported) — Recursively deletes each `src/modules/<name>/` directory and returns the relative paths that were removed.
- **`stripModuleRegistry(root, names)`** (exported) — Edits `src/modules.ts` in place: removes the `import` lines for the named modules and the corresponding `enabledModules` array entries.
- **`filterLines(file, keep)`** (internal) — Generic helper that rewrites a file by dropping every line the `keep` predicate rejects.

## Relationships
- **`scripts/demo/demo-remove.ts`** — The caller. The module docstring explicitly states these edits are "applied by `demo-remove.ts` to this checkout," making this file the registry-cleanup step within that demo's removal flow.
- **`tests/unit/scripts/demo/demo-remove-registry.spec.ts`** — Unit tests that exercise `removeModuleFolders` and `stripModuleRegistry` against fixture trees.

## Notes
- Every public function accepts the checkout `root` as its first argument; none read `process.cwd()` or reach outside the tree it is given.
- `stripModuleRegistry` derives the variable name for the `enabledModules` entry from the import line (capturing group 1) rather than re-casing the folder name, so hyphenated folders (e.g. `stock-alerts`) map correctly to their camelCased identifier (`stockAlerts`) without a separate transform.
- The import regex is built from the caller-supplied `names` array joined with `|`; if a name contains regex metacharacters it would break the pattern — names are expected to be simple folder identifiers.
- `filterLines` reads and writes the whole file in a single pass; it is not streaming and will hold the file contents in memory.
