---
source: vitest.config.ts
sha256: 45d17b7ce14cd2ac6e723c5cc09578e07d10467d3c1d990c5a2b86dc9d370e47
generated_at: 2026-10-17T02:49:10.204993+00:00
model: ollama:qwen3.8:27b
---

# vitest.config.ts

## Purpose

Vitest configuration for the unit and component test suite (pure functions, stores, composables, single Vue components mounted with `@vue/test-utils`). It defines the jsdom environment, discovery globs, and runner settings for everything that can execute outside a real browser. Anything requiring a live browser, service worker, or navigation belongs to Cypress; mutation testing layers its own overrides on top of this file.

## Key elements

- **`resolvedViteConfig`** — Calls `vite.config.ts`'s exported function with `{ command: 'serve', mode: 'test' }` to obtain a plain object (it reads `VITE_APP_PORT` via `loadEnv`, so it can't be used directly inside `mergeConfig`).
- **`export default`** — The merged config object: `mergeConfig(resolvedViteConfig, defineConfig({ test: { … } }))`. Exporting a plain object (not a function) is deliberate so `vitest.config.mutation.ts` can merge over it.
- **`environment`** — Points to a custom jsdom environment (`./tests/support/unit/jsdom-quiet-css.environment.ts`) that suppresses one class of CSS parser noise.
- **`setupFiles`** — `tests/support/unit/setup.ts`, run before every test file.
- **`testTimeout: 15_000`** — Raised from Vitest's 5 s default; CI 4-vCPU runners need the headroom for heavy page mounts.
- **`include`** — Three globs: `tests/unit/**`, `tests/cross-cutting/**`, and `src/modules/*/tests/**` (module-colocated specs). All must end in `.spec.ts`, which also excludes the `e2e/` subfolders owned by Cypress.
- **`server.deps.inline`** — Inlines `@guebbit/vue-toolkit` and `vuetify` so their raw `.css` ESM imports don't trip the transform pipeline.
- **`css: true`** — Enables CSS processing in the test runner.
- **`root`** — Pinned to the project root via `fileURLToPath(new URL('./', import.meta.url))`.

## Relationships

- **`vite.config.ts`** — Imported and resolved before the merge. Its function signature is the reason this file does the resolution inline rather than exporting a function itself.
- **`vitest.config.mutation.ts`** — Merges mutation-test overrides on top of this file's default export. This file's object (not function) export shape exists specifically to support that merge.
- **`tsconfig.node.json`** — This file is a Node-context configuration (uses `node:url`, `import.meta.url`) and falls under the `tsconfig.node.json` compilation scope for type-checking.

## Notes

- **Vitest does not type-check.** A spec that fails to compile can still report green. Use `npm run type-check-only` to verify compilation; a passing test run is not evidence the file compiles.
- **`vite.config.ts` is a function, not an object.** Passing it un-resolved to `mergeConfig` would silently produce an empty base config.
- **Test location convention.** A module's own specs live in `src/modules/<name>/tests/` so deleting the module deletes its tests. Cross-cutting, app, kernel, and UI specs stay central under `tests/unit/` and `tests/cross-cutting/`.
- **Cypress boundary.** `src/modules/*/tests/e2e/` is Cypress territory (claimed by `tsconfig.cypress.json`, excluded by `tsconfig.vitest.json`). The `.spec.ts` glob in `include` already draws the line; no explicit `exclude` entry is needed.
