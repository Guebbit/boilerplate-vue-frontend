---
source: scripts/demo/demo-remove.ts
sha256: 150ade6c6629b7333adb2fbcc87377ca3d2d01b903e087b18376e5c7a51b2b4a
generated_at: 2026-10-02T11:30:50.282798+00:00
model: ollama:qwen3.8:27b
---

# scripts/demo/demo-remove.ts

## Purpose

Demo script (`npm run demo:remove`) that surgically removes every module listed in `src/demo-modules.ts` from the checkout: their folders, their registry entries, their manifest, and any cross-module test specs that reference them. It runs in-place (not on a scratch copy) and is the frontend counterpart to the backend's `G-D2` removal step.

## Key elements

- **`removeModuleFolders(names)`** — recursively deletes `src/modules/<name>/` for each demo module.
- **`stripModuleRegistry(names)`** — rewrites `src/modules.ts` by filtering out the import lines and `enabledModules` array entries for each name. Relies on the convention that every demo module name is a single word.
- **`removeManifest()`** — deletes `src/demo-modules.ts` and `tests/unit/demo-modules.spec.ts`. Keeps `scripts/demo/demo-module-names.ts` intact for future use by the measure script.
- **`findResidueTests(names)`** — shells out to `git grep -l -I -E` scoped to `tests/` and `src/modules/` to surface any file still importing a deleted module. Exit code 1 (no match) is treated as success.
- **`REPO_ROOT`** — resolved via `import.meta.url` (ESM context) rather than `__dirname`.
- **Top-level flow** — reads names via `readDemoModuleNames`, then sequentially runs folder removal → registry strip → manifest removal → `removeResidueSpecs` → residue grep, logging a progress line per step.

## Relationships

- **`scripts/demo/demo-module-names.ts`** — imported for `readDemoModuleNames(REPO_ROOT)`, which parses `src/demo-modules.ts` and returns the array of module names this script operates on. This file is deliberately *not* deleted by `removeManifest()` because the measure script still needs it.
- **`scripts/demo/demo-remove-tests.ts`** — imported for `removeResidueSpecs(REPO_ROOT, demoModuleNames)`, which deletes cross-module specs under `tests/e2e/` that carry a `// requires-module:` header matching a removed module name.

## Notes

- The script mutates the working tree directly; there is no dry-run mode. A `git status` / `git diff` before running is the safety net.
- `stripModuleRegistry` uses a single-word assumption: if a future demo module name contains a hyphen or is a multi-word identifier, both the import regex and the array-entry regex will silently fail to match.
- `findResidueTests` only reports; it does not delete. The output is meant for a human to judge whether the remaining import is legitimate.
- The script assumes `src/modules.ts` is the *only* place a module name is written explicitly outside the module's own folder; `router/index.ts` and `response-schema-map.ts` read `enabledModules` generically and need no edits.
