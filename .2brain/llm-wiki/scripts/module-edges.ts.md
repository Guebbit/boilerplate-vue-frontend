---
source: scripts/module-edges.ts
sha256: 704512c7ae3e9e24284c2d050ec5653bef1dc1ce556bfe2f91f110a40f3aca7e
generated_at: 2026-10-02T11:38:26.644936+00:00
model: ollama:qwen3.8:27b
---

# scripts/module-edges.ts

## Purpose

Hand-maintained allowlist of which frontend modules may reach which backend modules, plus a graph-integrity check. It makes a new cross-module coupling a deliberate edit to this single file rather than an unreviewed one-line import, per the strategic-DDD policy in `docs/theory/strategic-ddd.md` §2.

## Key elements

- **`MODULE_EDGES`** (`Record<string, string[]>`) — maps each FE module name (key) to the list of backend module names it is permitted to reach (values). Seven entries covering `account`, `cart`, `inventory`, `observability`, `orders`, `products`, `wishlist`.
- **`assertAcyclicModuleEdges(edges, existingModules)`** — throws on (a) any key not matching a real FE folder on disk, or (b) any directed cycle in the graph. Uses a standard DFS with a `done` set and a per-path `stack` to report the cycle.

## Relationships

- **`eslint.config.ts`** — reads `MODULE_EDGES` to restrict each FE module's own imports to its listed siblings. This is the "FE module → own files" coupling shape.
- **`tests/cross-cutting/module-coupling.spec.ts`** — reads `MODULE_EDGES` to verify that a FE module's backend contract-operation calls (via `contracts/rest/operation-modules.ts`) stay within the allowed set. This is the "FE module → another backend module" coupling shape. Note: a module calling its *own* backend counterpart is exempt, so e.g. `observability` needs no self-entry.
- **`tests/unit/scripts/module-edges.spec.ts`** — unit-tests `assertAcyclicModuleEdges` with a small fixture graph (stale-key and cycle cases).

## Notes

- **Values are backend module names, not necessarily FE folders.** `addresses` and `audit-logs` appear as values but own no FE module; `account` folds address screens in, and `observability` reads audit-log data.
- **Keys must be real FE folders; values need not be.** `assertAcyclicModuleEdges` validates only keys against `existingModules`; a value naming a backend-only module is legal.
- **The *why* for each edge lives elsewhere.** The rationale (conformist / customer-supplier / published-language) is written in the dependent module's `module.ts` docblock next to the relevant imports, not in this file.
- **Per-module lint ≠ whole-graph check.** `eslint.config.ts` validates one module's imports in isolation; only `assertAcyclicModuleEdges` detects cycles (e.g. `cart → orders → cart`).
