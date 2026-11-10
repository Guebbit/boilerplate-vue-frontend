---
source: scripts/demo/demo-remove.ts
sha256: 7b00b5f04c8f42d682faecd691e53511ecd1a6d9062c5267af0f768068071f2d
signature: d617ea136eb089c2cdd2e97e5d6fac9bf18464ee1701fe4e48a22332dce7f979
generated_at: 2026-11-10T02:29:05.311423+00:00
model: ollama:qwen3.8:27b
---

# scripts/demo/demo-remove.ts

## Purpose

A one-shot demo script (`npm run demo:remove`) that deletes every module belonging to the `shop` or `example` group, removes their folders, strips their registry entries, and deletes cross-module e2e specs that reference them. It runs against the current checkout and leaves a grep-based residue report for anything it couldn't safely remove.

## Key elements

- **`REPO_ROOT`** — Resolves the repository root from `import.meta.url` (ESM context); not `__dirname`.
- **`findResidueTests(names)`** — Runs `git grep -l -I -E` over `tests/` and `src/modules/` for any file still importing a deleted module's path. Treats exit code 1 as "no matches" (not an error).
- **`demoNames`** — Obtained from `demoModuleNames()`; the list of module names to delete.
- **Main flow (top-level)** — Sequentially: log names → `removeModuleFolders` → `stripModuleRegistry` → `removeResidueSpecs` → `findResidueTests` (safety-net grep) → print next steps (`type-check-only`, `lint`).

## Relationships

- **`scripts/module-manifest.ts`** — Imports `demoModuleNames()`, which returns the names of modules in the `shop` or `example` groups.
- **`scripts/demo/demo-remove-registry.ts`** — Imports `removeModuleFolders()` (deletes each module's directory tree) and `stripModuleRegistry()` (removes the module entries from the central registry file).
- **`scripts/demo/demo-remove-tests.ts`** — Imports `removeResidueSpecs()`, which deletes cross-module specs under `tests/e2e/` that carry a `// requires-module:` line naming a deleted module.

## Notes

- Runs destructively against **this checkout**; there is no dry-run flag.
- Because a module's `group` and `dependsOn` fields live inside its own folder, folder deletion is sufficient — no separate manifest cleanup is needed for those.
- The final `findResidueTests` grep is a **human-review safety net**, not an automatic fix. The script explicitly prints "fixing it is a human's call."
- `git grep` exit code 1 means "no matches found" and is handled as a normal empty result, not thrown.
- After running, the script prints two follow-up commands: `npm run type-check-only` and `npm run lint` (the latter catches imports that `eslint-plugin-boundaries` would refuse).
