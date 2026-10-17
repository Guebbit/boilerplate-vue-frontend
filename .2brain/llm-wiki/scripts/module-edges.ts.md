---
source: scripts/module-edges.ts
sha256: 8fd1d2ca7ef17eb03766f4e3721f91f7a1a0863a221e98ba498c6cdaf690f5fe
generated_at: 2026-10-17T00:02:17.048243+00:00
model: ollama:qwen3.8:27b
---

# scripts/module-edges.ts

## Purpose

Hand-maintained whitelist of which frontend modules may reach which backend modules. A new cross-module coupling is a deliberate edit to this list rather than an unexamined import. The per-edge rationale (conformist / customer-supplier / published-language) is prose in the dependent module's `module.ts` docblock, not here.

## Key elements

- **`MODULE_EDGES: Record<string, string[]>`** — The coupling graph. Keys are FE module folder names; values are the backend module names that module is permitted to import from. Seven entries: `account`, `cart`, `inventory`, `observability`, `orders`, `products`, `wishlist`.
- **`assertAcyclicModuleEdges(edges, existingModules): void`** — Whole-graph validator. Throws on a key that doesn't match a real FE folder (stale entry) or on any cycle (DFS with `done` / `stack`). Called in CI or tests; eslint only checks per-module and cannot detect mutual dependencies.

## Relationships

- **`eslint.config.ts`** — Consumes `MODULE_EDGES` to restrict each FE module's own imports to its listed backend modules.
- **`tests/cross-cutting/module-coupling.spec.ts`** — Consumes `MODULE_EDGES` to verify backend contract-operation calls (a second coupling shape). Excludes a module calling its *own* backend counterpart, so e.g. `observability` needs no self-entry.
- **`tests/unit/scripts/module-edges.spec.ts`** — Unit-tests `assertAcyclicModuleEdges` with small fixture graphs.

## Notes

- A **value** names a backend module and need not have a corresponding FE folder (`addresses`, `audit-logs`). A **key** must be a real FE folder; `assertAcyclicModuleEdges` enforces this asymmetry.
- Because eslint checks only a module's *own* imports against *its own* list, a two-way dependency (`cart → orders` and `orders → cart`) passes lint silently. `assertAcyclicModuleEdges` is the only guard against that.
- The WHY for each edge is deliberately kept in the dependent module's `module.ts` docblock next to its imports, not in this file.
