# tsconfig.app.json

## Purpose

TypeScript project configuration for the application source and the generated REST client. It scopes type-checking to `src/` and `contracts/rest` while explicitly excluding per-module test directories, which belong to their own composite projects (Cypress / Vitest). It is a `composite` project, meaning it participates in the solution-level project-references build orchestrated by `tsconfig.json`.

## Key elements

- **`extends: "@vue/tsconfig/tsconfig.dom.json"`** — inherits Vue-recommended compiler defaults (module resolution, DOM lib, etc.).
- **`include` / `exclude`** — limits the project to `contracts/rest`, `src/**/*`, and `src/**/*.vue`; removes `src/modules/*/tests/**` so test-specific ambient types (Cypress, Vitest) don't leak in.
- **`composite: true` + `tsBuildInfoFile`** — makes this a project-reference node with incremental build info stored at `node_modules/.tmp/tsconfig.app.tsbuildinfo`.
- **`noEmit: true`** — type-check only; the actual bundling is done by Vite.
- **`paths` aliases**
  - `@/*` → `./src/*`
  - `@types` → `./src/types`
  - `@api` → `./contracts/rest/index` (generated client entry)
  - `@api/schemas` → `./contracts/rest/schemas.zod` (Zod schemas)
  The `@api` aliases decouple the client's physical location from every module's import depth, so regenerating it elsewhere is a one-line path change.
- **`types: ["vite/client"]`** — makes Vite's client types (e.g. `import.meta.env`) available without explicit imports.

## Relationships

- **`tsconfig.json`** — the solution/root config that references this file as a project. It defines the overall workspace structure; this file is one of its referenced composite projects (alongside the test-specific configs). Changes to `baseUrl`, `paths`, or `include` here are scoped to this project only and do not affect the other referenced projects.

## Notes

- Because `noEmit` is set, `tsc` (or `vue-tsc`) is used purely for type-checking; it will not produce JS output.
- The `@api` and `@api/schemas` aliases point into `contracts/rest/`, which is a *generated* artifact. Regenerating the client may replace those files; the aliases are the single indirection point.
- Test directories are excluded by glob (`src/modules/*/tests/**`), not by listing individual modules — new modules with a `tests/` subfolder are automatically kept out of this project.
