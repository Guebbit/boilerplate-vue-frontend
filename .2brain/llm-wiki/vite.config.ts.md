---
source: vite.config.ts
sha256: 7c8c7d6088fd6b2eaf656c11575a7f1e50f550f71bb45d8950e4d035824dd485
signature: 3764e89c9bf45c241aae630c03d69234d3aa423a78c7126bfe6120fdd066d26e
generated_at: 2026-11-10T08:33:45.318762+00:00
model: ollama:qwen3.8:27b
---

# vite.config.ts

## Purpose

Vite configuration for the application's dev server, build, and plugin stack. It wires together Vue 3, Vuetify, Tailwind CSS, and custom HTML transformation, defines path aliases, controls chunk splitting, and coordinates the dev-server port with the Docker Compose setup.

## Key elements

- **`defineConfig(({ mode }) => ({ … }))`** — single default export; a function form so every call reads the current mode and env.
- **`base`** — resolves `VITE_APP_BASE_URL` via `loadEnv`, falling back to `/`. All asset URLs are generated relative to this at build time.
- **`define.__APP_VERSION__`** — injects the package version at compile time. Read from `package.json` with `readFileSync` to avoid pulling the file into the type graph via `resolveJsonModule`.
- **`server.port` / `strictPort`** — reads `VITE_APP_PORT` (default 8080); `strictPort` prevents a silent port hop that would leave the Compose publish pointing at nothing.
- **`server.warmup.clientFiles`** — pre-transforms `main.ts`, all route layouts, and all view files so the first human click doesn't pay a compile. Only route-level entries, not every source file.
- **`brand-index-html` plugin** — replaces the `%APP_NAME%` token in `index.html` with `VITE_APP_NAME` (default `"Guebbit"`), HTML-escaping the value. Unlike Vite's native `%VITE_X%`, an unset variable yields the default rather than literal text.
- **`vue` plugin `isCustomElement`** — tells the template compiler that `<altcha-widget>` is a native custom element, suppressing the "failed to resolve component" warning.
- **`vuetify({ autoImport: true })`** — on-demand component/directive imports with tree-shaking.
- **`tailwindcss()`** — `@tailwindcss/vite` plugin.
- **`vueDevTools`** — conditionally excluded when `mode === 'test'` (no dev server, and Stryker's sandboxed copy breaks its path resolution). Respects `LAUNCH_EDITOR` for the editor target.
- **`resolve.alias`** — maps `@`, `@types`, and five `@api/*` sub-paths to `src/` and `contracts/`. Order matters: the specific `@api/*` keys are declared before the shorter `@api` key so Vite's prefix matching doesn't shadow them.
- **`build.sourcemap: 'hidden'`** — source maps are written alongside chunks but no `//# sourceMappingURL` comment is emitted, so browsers never fetch them; only a tracker fed the file directly can symbolicate.
- **`build.rollupOptions.output.manualChunks`** — splits `@guebbit/vue-toolkit` into its own chunk.

## Relationships

- **`docker-compose.yml`** — Compose publishes `${VITE_APP_PORT}:${VITE_APP_PORT}` and injects `VITE_APP_PORT` into the container env. This file reads the same variable via `loadEnv` so the published port and the listening server always agree. `VITE_APP_BASE_URL` and `VITE_APP_NAME` follow the same env-var contract.
- **`vitest.config.ts`** — Shares the `mode === 'test'` branch: when Vitest runs, `vueDevTools` is omitted from the plugin array to avoid its dev-server and sandbox path-resolution issues.

## Notes

- **Alias ordering is load-bearing.** Vite matches aliases in declaration order using both exact and `key + '/'` prefix matching. Moving `@api` above the `@api/*` entries will silently redirect all contract imports to `contracts/rest/index`.
- **`loadEnv` is called repeatedly** (once per key in the config function body). This is intentional—each call is cheap and keeps the config readable without a shared helper.
- **`strictPort` + Compose** means if the port is taken on the host, `vite dev` exits with an error instead of picking 8081. The `--port` CLI flag still overrides this (used by e2e scripts to pin 8085).
- **`packageVersion` is read at config-evaluation time**, not at module scope of any app file. It is a string literal baked into the bundle via `define`; changing `package.json` version requires a rebuild.
- The `warmup` glob patterns (`./src/app/layouts/*.vue`, `./src/modules/*/views/*.vue`) are relative to the project root and only cover route-level entry points; deep component trees are still compiled on first import.
