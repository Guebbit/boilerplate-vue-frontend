---
source: scripts/demo/demo-remove-registry.ts
sha256: b0f222d3c95663122f1223bf997053f2ffba40e6acca8a643e0dcae83ddf5484
generated_at: 2026-10-16T23:58:43.309292+00:00
model: ollama:qwen3.8:27b
---

# scripts/demo/demo-remove-registry.ts

## Purpose

Shared implementation of the registry-level edits a demo-module removal makes. It is consumed by both `demo-remove.ts` (which applies the edits to the live checkout) and `measure-demo-strip.ts` (which applies the same edits to a scratch copy and then checks whether the remainder still builds). Keeping the logic in one place ensures the measurement exercises the *same* coupling the real removal hits, rather than merely re-reporting what `demo:remove` already does.

## Key elements

- **`removeModuleFolders(root, names)`** – Recursively deletes each module's folder under `src/modules/<name>`; returns the relative paths that were removed.
- **`stripModuleRegistry(root, names)`** – Rewrites `src/modules.ts`, dropping both the `import … from '@/modules/<name>/module'` lines and the bare-name entries in the `enabledModules` array. Works because every demo-module name is a single word, so one regex pair catches both shapes.
- **`pruneModuleEdges(root, names)`** – Rewrites `scripts/module-edges.ts`, removing only the 4-space-indented `name: [ … ],` *keys* for the removed modules. Values in other modules' lists are left alone (they are backend names that may have no local folder).
- **`removeManifest(root)`** – Deletes `src/demo-modules.ts` and `tests/unit/demo-modules.spec.ts`; returns the relative paths removed.
- **`filterLines(file, keep)`** – (internal) Reads a file, drops lines the `keep` predicate rejects, writes it back.

## Relationships

- **`scripts/demo/demo-remove.ts`** – Imports and calls the four exported functions to perform the actual removal in the developer's working tree.
- **`scripts/demo/measure-demo-strip.ts`** – Imports the same four functions, runs them against a temporary copy, then attempts a build to measure whether the remaining code is self-consistent.
- **`tests/unit/scripts/demo/demo-remove-registry.spec.ts`** – Unit-tests the exported functions (folder deletion, registry stripping, edge pruning, manifest removal) in isolation.

## Notes

- Every public function takes `root: string` as its first parameter so neither caller can accidentally mutate the other's tree.
- The regex patterns in `stripModuleRegistry` and `pruneModuleEdges` depend on demo-module names being **single words** with no spaces or special regex characters. Adding a multi-word name would silently break the match.
- `pruneModuleEdges` deliberately leaves a removed module's name in another module's value array; `assertAcyclicModuleEdges` only rejects *keys* that name a missing module.
- `removeManifest` intentionally keeps `scripts/demo/demo-module-names.ts` because `measure-demo-strip.ts` still references it to discover the next build's module set.
