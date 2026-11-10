---
source: tsconfig.cypress.json
sha256: 94a2a62de240e30dcb00b6aef9c50287570ecbd63c7697a9ae8cb978a298293c
signature: 94a2a62de240e30dcb00b6aef9c50287570ecbd63c7697a9ae8cb978a298293c
generated_at: 2026-11-10T08:32:49.687756+00:00
model: ollama:qwen3.8:27b
---

# tsconfig.cypress.json

## Purpose

TypeScript project-reference config that compiles the Cypress e2e test suite (specs, support files, and their transitive app/contract/script dependencies) as an isolated TS project. It exists so that e2e files—excluded from `tsconfig.app.json`—are still type-checked, get Cypress ambient types, and satisfy the project-references graph without polluting the app build.

## Key elements

- **`extends: "./tsconfig.app.json"`** – Inherit all compiler options (module, target, strictness, ESNext + DOM libs) from the app config; only override `types` and add `composite`.
- **`include`** – Explicitly lists every file this project claims: e2e specs (`tests/e2e/**`, `src/modules/*/tests/e2e/**`), support helpers (`tests/support/e2e/**`), shared stubs (`stub.ts`, `problem-stub.ts`, `scenario-description.ts`), Lighthouse helpers, `cypress.config.ts`, contract schemas (`contracts/rest/error-codes.ts`, `contracts/rest/schemas.zod.ts`), scripts (`scripts/**`), and a few `src/` files (`theme.ts`, `breakpoints.ts`, `contract-mismatch-text.ts`) that are imported but live outside the app's include.
- **`exclude: []`** – Nothing is re-excluded; the parent's exclusions (notably `src/modules/*/tests/**`) are what *enable* this project to claim those files.
- **`compilerOptions.composite: true`** – Marks this as a project that can be referenced by other TS projects in the solution.
- **`compilerOptions.tsBuildInfoFile`** – Points the incremental build cache to `node_modules/.tmp/` to avoid polluting the source tree.
- **`compilerOptions.types: ["cypress", "node", "jsdom"]`** – Restricts ambient type packages for this project: Cypress globals, Node APIs, and jsdom (used by support code).

## Relationships

- **`cypress.config.ts`** – Included in this project (required to avoid TS6307). Its `specPattern` is what places domain e2e specs under `src/modules/*/tests/e2e/`, which is why this project explicitly lists that glob. This project's existence is what gives those spec files their type context.

## Notes

- Every non-obvious entry in `include` carries an inline comment explaining *why* the file is here (TS6307, shared cast seam, cross-project import). If you add an import from a file outside `tests/`, it almost certainly needs a new `include` line here.
- `tests/support/stub.ts` is described as "the repo's one sanctioned cast seam" and is intentionally shared with the Vitest project the same way `scripts/**` is—do not move or rename it without checking `tsconfig.vitest.json`.
- The parent's `exclude` of `src/modules/*/tests/**` is load-bearing: without it, both `tsconfig.app.json` and this file would claim the same e2e specs, causing a project-reference conflict.
- `types` is a *replacement*, not an addition—anything in the app's `types` that isn't listed here is unavailable to e2e code.
