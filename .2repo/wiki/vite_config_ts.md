# vite.config.ts

## Purpose

Vite configuration for a Vue 3 + Vuetify + Tailwind CSS application. Defines dev-server behavior, plugin stack, path aliases, SCSS options, and a manual-chunk rule for the build. Exported as a single default function so it can react to the current Vite `mode`.

## Key elements

- **`server.port`** — reads `VITE_APP_PORT` via `loadEnv` (falls back to 8080). Centralises the port so the compose publish mapping and the dev server always agree.
- **`server.strictPort`** — refuses to silently pick the next free port, which would break the container publish mapping.
- **`server.warmup.clientFiles`** — pre-compiles route entry points (main.ts, layouts, views) at server start to eliminate the first-visit build cost in the human dev loop.
- **`plugins`** — `vue()`, `vuetify({ autoImport: true })`, `tailwindcss()`, and conditionally `vueDevTools` (excluded when `mode === 'test'`).
- **`resolve.alias`** — maps `@` → `src/`, `@types` → `src/types/`, `@api/schemas` → `contracts/rest/schemas.zod`, `@api` → `contracts/rest/index`. Order matters: `@api/schemas` is declared before `@api` to prevent prefix-shadowing.
- **`css.preprocessorOptions.scss.silenceDeprecations`** — silences the `legacy-js-api` deprecation warning.
- **`build.rollupOptions.output.manualChunks`** — splits any module under `@guebbit/vue-toolkit/` into its own chunk.

## Relationships

- **`vitest.config.ts`** — When Vite runs in `test` mode (invoked by Vitest), the `vueDevTools` plugin is excluded. The dev-server `warmup` and `strictPort` settings are therefore inactive during test runs, but the alias and plugin resolutions above remain relevant to module resolution in tests.
- **`docs/tools/runtime.md`** — Documents the runtime environment and the `VITE_APP_PORT` environment variable that `server.port` consumes via `loadEnv`. The compose setup described there injects the variable into the container, which this config reads.

## Notes

- **Alias ordering is load-bearing.** Vite matches string aliases by exact key *and* `key + '/'` prefix, in declaration order. Moving `@api` above `@api/schemas` silently breaks every `@api/schemas` import. Do not reorder without updating imports.
- **`vueDevTools` is mode-gated.** It is excluded in `test` mode because (a) there is no dev server to host the inspector UI and (b) under Stryker's sandboxed project copy its path resolution breaks the run before any mutant is tested. If a new plugin is added, consider whether it needs the same `mode === 'test'` guard.
- **Port fallback is `|| 8080`, not a ternary on falsy.** `Number('')` is `0`, so an empty `VITE_APP_PORT` in the environment will fall through to 8080 rather than erroring.
- **`warmup` only benefits the human dev loop** (`npm run dev`, `test:e2e:dev`). Headless e2e scripts build once and serve via `vite preview`, so the warmup list has no effect there.
