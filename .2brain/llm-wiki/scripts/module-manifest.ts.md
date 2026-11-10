---
source: scripts/module-manifest.ts
sha256: 789b7574c0c4a26ac7cd8c275d1dff15870e7919a384ba1301454a6e269f63e7
signature: 454695323dd5900df3b695b9908de8bd9d2861a6227b0a859dfa399ade688fd7
generated_at: 2026-11-10T02:44:48.550387+00:00
model: ollama:qwen3.8:27b
---

# scripts/module-manifest.ts

## Purpose

Reads every `src/modules/<name>/module.yaml` to build a single in-memory manifest of module groups (`foundation | shop | example`) and their `dependsOn` edges. It exists so that ESLint rules, demo scripts, and cross-cutting tests all agree on module topology from one place, without each duplicating the parsing logic.

## Key elements

- **`MODULE_GROUP_NAMES`** / **`ModuleGroup`** — the closed set of valid group values and the resulting union type.
- **`ModuleManifest`** — the shape returned by the loader: `folders`, `groups`, `edges`, `problems`.
- **`loadModuleManifest(modulesRoot)`** — walks a `src/modules` directory, parses each module's YAML metadata with the `yaml` package, and collects group + `dependsOn`. Never throws on a missing/invalid file; records a human-readable sentence in `problems` instead. Accepts an explicit root so tests can point at a fixture tree.
- **`moduleFolderNames`**, **`moduleGroups`**, **`moduleDependsOn`**, **`moduleManifestProblems`** — pre-computed exports for this checkout (the loader runs once at import time against the real `src/modules` path).
- **`demoModuleNames(groups?)`** — returns the names in the `shop` or `example` groups; consumed by `npm run demo:remove`.
- **`assertAcyclicModuleEdges(edges)`** — DFS cycle check on the `dependsOn` graph; throws on the first cycle found. Catches mutual edges that per-module ESLint rules would miss.

## Relationships

- **`eslint.config.ts`** — imports `moduleGroups` and `moduleDependsOn` to enforce coupling rules and the "foundation may not import shop" constraint.
- **`scripts/demo/demo-remove.ts`** — calls `demoModuleNames()` to learn which folders to delete.
- **`tests/cross-cutting/module-groups.spec.ts`** — asserts `moduleManifestProblems` is empty, failing the build if any module folder lacks valid group metadata.
- **`tests/cross-cutting/module-coupling.spec.ts`**, **`route-name-coupling.spec.ts`**, **`module-map.spec.ts`**, **`journey-headers.spec.ts`** — read the manifest exports to validate that actual imports and route declarations respect the declared topology.
- **`tests/unit/scripts/module-manifest.spec.ts`** — unit-tests `loadModuleManifest` and `assertAcyclicModuleEdges` against fixture trees.

## Notes

- The manifest is built **at import time** (top-level `const real = …`). Any file that imports this module triggers synchronous filesystem reads; there is no lazy-loading or cache-invalidation mechanism.
- `dependsOn` values are **backend** module names. A value like `addresses` is legal even though there is no `src/modules/addresses/` folder — the front-end module simply folds those screens into itself.
- `loadModuleManifest` is deliberately total (never throws on bad data); it defers reporting to `problems`. Callers that need hard failures (like the cross-cutting specs) must check `problems` themselves.
- Folders are read with `readdirSync` + `toSorted()`, so `moduleFolderNames` is lexicographically ordered regardless of filesystem ordering.
