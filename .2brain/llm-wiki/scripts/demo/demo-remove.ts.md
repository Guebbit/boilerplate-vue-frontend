---
source: scripts/demo/demo-remove.ts
sha256: d8e99d1426dbc2e645d0a617d45c68cfb1b7eb1c06ffed34214c4ae0b07f3b8b
generated_at: 2026-10-16T23:58:52.741392+00:00
model: ollama:qwen3.8:27b
---

# scripts/demo/demo-remove.ts

## Purpose
Destructive demo script (`npm run demo:remove`) that removes every module listed in `src/demo-modules.ts` from the current checkout: its folder, its registry entries in `src/modules.ts`, its entries in `scripts/module-edges.ts`, the manifest files, and any cross-module specs that reference it. It exists so a new-project template can be "stripped" of its sample modules in one command.

## Key elements
- **`REPO_ROOT`** — computed from `import.meta.url` (ESM); used as the `cwd` for all file-system and `git` operations.
- **`findResidueTests(names)`** — runs `git grep -l -I -E` over `tests/` and `src/modules/` to surface files that still import a deleted module. Treats exit code 1 (no matches) as success.
- **Top-level orchestration (no exported function)** — runs sequentially:
  1. `readDemoModuleNames` → get the module list.
  2. `removeModuleFolders` → delete each `src/modules/<name>/` directory.
  3. `stripModuleRegistry` + `pruneModuleEdges` + `removeManifest` → clean `src/modules.ts`, `scripts/module-edges.ts`, and manifest files.
  4. `removeResidueSpecs` → delete cross-module specs whose `// requires-module:` header names a removed module.
  5. `findResidueTests` → report any remaining importers for a human to judge.

## Relationships
- **`scripts/demo/demo-module-names.ts`** — imported for `readDemoModuleNames(REPO_ROOT)`, which parses `src/demo-modules.ts` and returns the array of module names.
- **`scripts/demo/demo-remove-registry.ts`** — imported for `removeModuleFolders`, `stripModuleRegistry`, `pruneModuleEdges`, and `removeManifest`; all four perform the file-system / source-editing work that the top-level script orchestrates.
- **`scripts/demo/demo-remove-tests.ts`** — imported for `removeResidueSpecs`, which locates and deletes cross-module e2e specs that walk a deleted module (matched via `// requires-module:` headers).

## Notes
- **Runs against the live checkout**, not a scratch copy. The header comment distinguishes this from the backend's report-only `measure:demo-strip` script.
- **ESM**: `REPO_ROOT` uses `import.meta.url` / `fileURLToPath`, not `__dirname`. The shebang is `#!/usr/bin/env tsx`.
- **Residue is advisory, not fatal**: the final `git grep` list is printed so a human can decide whether to fix those imports; the script does not auto-delete them.
- **Suggested follow-up** (printed to console): run `npm run type-check-only` then `npm run lint` to catch any imports that `eslint-plugin-boundaries` would flag.
- **`git grep` exit code 1** means "no matches" and is treated as a clean result, not an error.
