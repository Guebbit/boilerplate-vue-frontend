# tsconfig.node.json

## Purpose

A Node.js-scoped TypeScript configuration that type-checks the project's infrastructure and tooling files (Vite, Vitest, Orval, Cypress configs, build scripts, and E2E helper tasks) against the Node 22 type environment. It exists to isolate "server-side" file compilation from the browser-targeted app source, using TS project references.

## Key elements

- **`extends: @tsconfig/node22/tsconfig.json`** — inherits a battle-tested Node 22 preset (target, lib, strictness, etc.).
- **`include`** — glob list limiting the project to `vite.config.*`, `vitest.config.*`, `orval.config.*`, `scripts/**/*.ts`, `cypress.config.*`, and three specific E2E support tasks. Application source code is intentionally excluded.
- **`composite: true`** — marks this as a project-references entry point so the root `tsconfig.json` can reference it for incremental builds.
- **`noEmit: true`** — type-checking only; no `.js` output is produced for these config files (they are consumed by their respective tools at runtime).
- **`tsBuildInfoFile`** — points the incremental-build cache to `node_modules/.tmp/`, keeping it out of source control.
- **`module: ESNext` / `moduleResolution: Bundler`** — allows `import`/`export` syntax without `require`/`exports` interop, matching how Vite/Vitest load these files.
- **`types: ["node"]`** — restricts global type augmentation to Node builtins; no DOM or browser types leak in.

## Relationships

- **`tsconfig.json`** — the root config references this file (project-references pattern), so building or type-checking the app triggers this project as a separate unit.
- **`vitest.config.ts`** — matched by the `vitest.config.*` glob; type-checked under this project's compiler options.
- **`vitest.config.mutation.ts`** — also matched by the same glob; treated identically.

## Notes

- Adding a new config file (e.g., a new `*.config.ts` at the repo root) requires explicitly listing it in `include`—the globs are narrow and will not silently pick it up.
- Because `types` is pinned to `["node"]`, any type-check error about missing DOM globals in these files is expected; do not add `"dom"` here—use the app's tsconfig for browser code.
- The `tsBuildInfoFile` lives inside `node_modules/.tmp/`; clearing `node_modules` resets incremental state for this project only.
