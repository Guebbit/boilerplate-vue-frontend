---
source: tsconfig.node.json
sha256: cef794aeac39ab33e6d8869597be514e6c523804fea2cd116d89f6204afca1ce
generated_at: 2026-10-17T02:48:33.524188+00:00
model: ollama:qwen3.8:27b
---

# tsconfig.node.json

## Purpose

Project-level TypeScript configuration for all Node.js-side files (build tooling, test runners, scripts, and e2e task helpers). It exists so that editor and type-checker behavior for these files is distinct from the application source (which is typically handled by a separate `tsconfig.json` or `tsconfig.app.json`).

## Key elements

- **`extends: "@tsconfig/node24/tsconfig.json"`** — Inherits a baseline set of strict, Node-24-targeted compiler options from the shared `@tsconfig` package.
- **`include`** — Enumerates every file this config covers: `vite.config.*`, `vitest.config.*`, `orval.config.*`, `scripts/**/*.ts`, `cypress.config.*`, and three specific e2e task files under `tests/support/e2e/`.
- **`composite: true` + `noEmit: true`** — Marks the project as a composite (referenceable by other tsconfigs) while suppressing JS output; useful for project-references setups without emitting artifacts.
- **`tsBuildInfoFile`** — Points incremental build-info to `node_modules/.tmp/` so it is not committed and does not pollute the repo root.
- **`module: "ESNext"` / `moduleResolution: "Bundler"`** — Tells TS the module system is handled by a bundler (Vite/Vitest), avoiding Node's CJS/ESM resolution quirks.
- **`types: ["node"]`** — Restricts ambient `@types` to `node` only, preventing accidental global leakage from other `@types` packages into tooling files.

## Relationships

- **`vitest.config.ts`** and **`vitest.config.mutation.ts`** — Both match the `vitest.config.*` glob in `include`, so this tsconfig is the one the editor and `tsc` use when type-checking or resolving imports inside those files. Changes to `compilerOptions` here (e.g. `moduleResolution`) directly affect how Vitest config code is type-resolved.

## Notes

- The `include` list is **explicit**, not a blanket directory glob. New config files or scripts added at the repo root will silently fall outside this project unless listed here.
- `composite` + `noEmit` together means `tsc --build` will type-check and emit a `.tsbuildinfo` but no JS. If you add a new entry point, make sure it is reachable from the `include` globs or it will be unchecked.
- Because `types` is pinned to `["node"]`, any ambient globals from other packages (e.g. `@types/vitest`) will **not** be available in the included files unless explicitly imported.
