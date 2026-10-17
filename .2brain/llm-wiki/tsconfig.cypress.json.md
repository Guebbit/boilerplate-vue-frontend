---
source: tsconfig.cypress.json
sha256: 3eb0c9cd90f0e32e9649148e79b487a54c12ea31e912ce4a4120ff8ec4349928
generated_at: 2026-10-17T02:48:24.786542+00:00
model: ollama:qwen3.8:27b
---

# tsconfig.cypress.json

## Purpose

TypeScript project-reference configuration for the Cypress e2e test suite. It extends `tsconfig.app.json` to inherit compiler settings while claiming the e2e test files that `tsconfig.app.json` explicitly excludes, giving them Cypress ambient types (`cypress`, `node`, `jsdom`) instead of the app's types.

## Key elements

- **`extends: "./tsconfig.app.json"`** — Inherits base compiler options (ESNext target, DOM lib) from the app config.
- **`include`** — Enumerates every file this project owns:
  - `tests/e2e/**/*.ts` and `tests/support/e2e/**/*.ts` — top-level e2e specs and support commands.
  - `tests/support/stub.ts` — the repo's single sanctioned cast seam; must be *included* here (not just imported) or TypeScript raises TS6307.
  - `src/modules/*/tests/e2e/**/*.ts` — per-domain e2e specs (excluded by `tsconfig.app.json`).
  - `cypress.config.ts` — the Cypress config file, imported by the project.
  - `scripts/**/*.ts` — utility scripts that `cypress.config.ts` imports for `specPattern` / backend-pairing setup; same TS6307 reasoning as the Vitest project's `scripts` entry.
- **`exclude: []`** — No further exclusions; everything in `include` is compiled.
- **`compilerOptions.composite`** — Marks this as a project reference so it participates in `tsc --build`.
- **`compilerOptions.tsBuildInfoFile`** — Incremental-build cache under `node_modules/.tmp/`.
- **`compilerOptions.types`** — Restricts ambient type packages to `cypress`, `node`, and `jsdom` (DOM lib is inherited from the base config).

## Relationships

- **`cypress.config.ts`** — This tsconfig is the TS project that compiles `cypress.config.ts` and the specs it references. The config file's `specPattern` (driven by scripts in `scripts/`) determines *which* test files exist at runtime; this tsconfig determines *which* of those files the compiler sees.

## Notes

- Any new file that is **imported** by a file in this project but **not listed** in `include` will trigger TS6307. When adding a new support script or helper, add its path here (and in the Vitest project if shared) to avoid the error.
- The `src/modules/*/tests/e2e/**/*.ts` glob is the *only* project that compiles those files — the app's tsconfig deliberately excludes them. Don't re-add them to `tsconfig.app.json`.
- `types` is a **replacement**, not an addition: it overrides whatever `types` the base config may set, so only `cypress`, `node`, and `jsdom` ambient declarations are loaded here.
