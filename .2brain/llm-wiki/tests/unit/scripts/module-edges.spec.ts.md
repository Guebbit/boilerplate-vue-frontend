---
source: tests/unit/scripts/module-edges.spec.ts
sha256: dde92a656cce634dcb91d09fe954f801351132cc35e2f2458d8ea2922dda5a9c
generated_at: 2026-10-17T02:44:27.010828+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/module-edges.spec.ts

## Purpose

Unit tests for the `assertAcyclicModuleEdges` cycle-detection walker. It exists because the per-module lint rule in `eslint.config.ts` only checks each module against its *own* entry, so a two-way dependency (e.g. `cart → orders` and `orders → cart`) would pass lint undetected. This suite exercises the whole-graph walk with both the real `MODULE_EDGES` map and synthetic fixture graphs, since the actual lint-time invocation (via `eslint.config.ts`) is not loadable in a unit test.

## Key elements

- **`moduleFolderNames()`** – reads directory names from `src/modules/` on disk, producing the same list `eslint.config.ts` uses at lint time. Used as the "real" module set for the happy-path test.
- **`describe('assertAcyclicModuleEdges')`** – six `it` blocks covering:
  - Real `MODULE_EDGES` is acyclic (smoke test against production data).
  - Direct 2-module cycle (`cart ↔ orders`) throws `'MODULE_EDGES has a cycle'`.
  - 3-module cycle (`a → b → c → a`) throws the same.
  - A key referencing a module folder that doesn't exist throws `'MODULE_EDGES names "…"'`.
  - A value referencing a name with no `src/modules/` folder (backend-only module) is **allowed**.
  - A diamond shape (two modules sharing a common dependency) is **allowed** — shared dependency ≠ cycle.

## Relationships

- **`scripts/module-edges.ts`** — the sole production dependency. The test imports `assertAcyclicModuleEdges` (the function under test) and `MODULE_EDGES` (the production dependency map) from it. No other project files are touched.

## Notes

- The "real `MODULE_EDGES`" test depends on the actual `src/modules/` directory contents on disk, so it will fail if modules are added/removed without updating the edges map. This is intentional (mirrors the lint-time check) but makes the test environment-sensitive.
- The test does **not** load `eslint.config.ts`; it replicates the assertion in-process. If `assertAcyclicModuleEdges` changes signature or error messages, update both the lint config and these `toThrow` strings together.
- Backend-only modules (values that have no matching `src/modules/<name>` folder) are explicitly permitted; don't "fix" them in the edges map.
