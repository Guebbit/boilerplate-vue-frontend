---
source: tsconfig.json
sha256: c7b91fb93f8a68d09c11f7850ebfd78b09c1b422af3915d897fd1ef61ed5e6d2
signature: 981b5a3d2bb9d1f1041e6e8b5969adcbc7f664f62852a906b8e2948b838b8489
generated_at: 2026-11-10T08:32:58.830430+00:00
model: ollama:qwen3.8:27b
---

# tsconfig.json

## Purpose

Root TypeScript **project-references** (solution-style) config for the workspace. It does not compile any source files itself; it exists as a single entry point that lets tooling and editors discover the four per-environment configs via `tsc --build` or IDE integration.

## Key elements

- **`"files": []`** — Explicitly compiles nothing at this level. This is what makes the file a pure solution/aggregator rather than a compiler config.
- **`"references"`** — Array of four project references, each pointing to a dedicated `tsconfig.*.json`:
  - `./tsconfig.node.json` — Node-side tooling (Vite, PostCSS, etc.)
  - `./tsconfig.app.json` — Application source (React/Vue components, app logic)
  - `./tsconfig.vitest.json` — Vitest test files
  - `./tsconfig.cypress.json` — Cypress E2E specs
- **`compilerOptions.module: "NodeNext"`** — Sets the module resolution strategy for this file's own parsing (e.g., when the editor reads it as the workspace root). It does **not** propagate into the referenced projects unless they inherit it.

## Relationships

No graph-neighbor files are recorded. The four referenced `tsconfig.*.json` files are the direct downstream consumers; all other source files are reached transitively through those sub-configs.

## Notes

- Because `"files"` is an empty array, running a plain `tsc` against this file will emit nothing. Build with `tsc --build` (or the project's `npm run build`) to compile the referenced projects in dependency order.
- The `"module": "NodeNext"` here only affects how this top-level JSON is resolved by the editor; the real module setting for app code lives in `tsconfig.app.json`. Do not add options here expecting them to cascade.
- Adding a new environment (e.g., `tsconfig.storybook.json`) requires appending a new `{ "path": … }` entry to `references` **and** setting `"composite": true` in that sub-config so `tsc --build` can track it.
