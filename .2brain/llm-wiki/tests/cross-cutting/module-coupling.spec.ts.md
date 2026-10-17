---
source: tests/cross-cutting/module-coupling.spec.ts
sha256: ed7c04143e7266244be26e6425dd0e9fbdec39b89bbe553a37d504fa4f2cf798
generated_at: 2026-10-17T02:00:57.661637+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/module-coupling.spec.ts

## Purpose

Enforces that a module's `@api` (generated REST client) calls target only backend modules declared in its coupling (`MODULE_EDGES`). This closes a gap ESLint boundary rules leave open: a module importing another module's backend operation through the `@api` barrel without declaring the edge.

## Key elements

- **`listFiles`** – recursively collects `.ts`/`.vue` files under a directory, skipping any path containing `/tests/`.
- **`clauseNames`** – parses a `{ … }` import clause into bare names, stripping `type` prefixes and `as` aliases.
- **`moduleNames`** – returns the folder names of every module under `src/modules`.
- **`apiImportsOf`** – regex-extracts every name a single file imports from the `@api` barrel.
- **`backendModulesCalledBy`** – for one module, resolves each `@api` import through `OPERATION_MODULES` and returns the set of *other* backend modules it reaches.
- **Test "finds modules to check"** – canary: asserts at least one module exists so an empty sweep is not silently green.
- **Test "actually finds cross-module calls…"** – canary: asserts at least one cross-module `@api` call is detected, guarding against a broken regex or path producing a vacuous pass.
- **Test "flags a call to an undeclared backend module"** – the real assertion: every backend module reached via `@api` must appear in `MODULE_EDGES[caller]`.

## Relationships

- **`contracts/rest/operation-modules.ts`** – provides `OPERATION_MODULES`, a generated map (from `openapi.yaml` `x-module` stamps) from operation function name → owning backend module. Only generated *functions* appear here; types and models do not.
- **`scripts/module-edges.ts`** – provides `MODULE_EDGES`, the declared coupling matrix that this test validates against.

## Notes

- Analysis is regex-based static scanning, not AST parsing — it matches only the exact `import { … } from '@api'` pattern. Dynamic imports or re-exports through an intermediate barrel are not detected.
- A module's own spec files are excluded from the sweep (same exemption as `published-language.spec.ts`'s barrel check): a spec importing `@api` directly is exercising the contract, not a runtime cross-domain call.
- The two canary tests exist specifically so the violation test cannot pass vacuously if the regex, file paths, or module-name matching silently break.
