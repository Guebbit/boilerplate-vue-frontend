---
source: vite.config.ts
sha256: 04d13b9c3ce51f8135e7cb66c00438758335c851e4afd43b36ea88b75deb281c
generated_at: 2026-10-17T02:48:44.654745+00:00
model: ollama:qwen3.8:27b
---

# vite.config.ts

## Purpose

Vite build and dev-server configuration for a Vue 3 + Vuetify + Tailwind SPA. It wires up plugins, path aliases, environment-driven base URL/port, and build-time chunking so the app can be developed locally, containerised, and shipped to production from a single source of truth.

## Key elements

- **Default export** — a `defineConfig` callback that receives `{ mode }` and returns the full config object.
- **`base`** — reads `VITE_APP_BASE_URL` from env; defaults to `'/'`.
- **`define.__APP_VERSION__`** — injects the package version (read from `package.json` at config time) as a compile-time constant.
- **`server.port` / `strictPort`** — reads `VITE_APP_PORT` (default 8080); `strictPort: true` prevents silent port-hopping that would desync container port publishing.
- **`server.warmup.clientFiles`** — pre-compiles route views at dev-server start so the first navigation doesn't pay the compile cost.
- **`brand-index-html` plugin (inline)** — replaces `%APP_NAME%` in `index.html` with `VITE_APP_NAME` (default `"Guebbit"`), HTML-escaping the result.
- **`vue` plugin** — configures `isCustomElement` to whitelist `<altcha-widget>`.
- **`vuetify` plugin** — enables auto-import of Vuetify components/directives.
- **`tailwindcss` plugin** — `@tailwindcss/vite` integration.
- **`vueDevTools` plugin** — conditionally excluded when `mode === 'test'`; respects `LAUNCH_EDITOR` env var.
- **`resolve.alias`** — maps `@`, `@types`, `@api/schemas`, `@api/error-codes`, `@api/routes`, `@api/permission-actions`, and `@api` to their filesystem paths.
- **`build.sourcemap: 'hidden'`** — emits `.map` files alongside chunks but never references them via `//# sourceMappingURL`.
- **`build.rollupOptions.output.manualChunks`** — splits `@guebbit/vue-toolkit` into its own chunk.

## Relationships

- **`vitest.config.ts`** — runs with `mode === 'test'`, which causes this config's `plugins` array to omit `vueDevTools`. The two files are paired: Vitest inherits (or mirrors) the server/resolve/plugin setup from here while stripping dev-only tooling.

## Notes

- **Alias ordering is load-bearing.** `@api/schemas`, `@api/error-codes`, `@api/routes`, and `@api/permission-actions` must be declared *before* `@api` in the `resolve.alias` object. Vite matches aliases in declaration order and treats a key as a prefix (`key + '/'`), so the shorter `@api` would shadow all four longer entries if reordered.
- **`%APP_NAME%` is not a Vite env substitution.** Vite's built-in `%VITE_X%` mechanism leaves unset variables as literal text; this inline plugin exists specifically to provide a fallback (`"Guebbit"`) and HTML-escape the value.
- **Hidden source maps.** Production builds never expose `.map` files to the browser (no source-map comment). Only a server-side error tracker or a developer with build access can symbolicate.
- **Package version is read via `readFileSync`**, not a JSON import, to avoid pulling the entire `package.json` into the type/bundle graph for a single field.
- **`vueDevTools` is excluded in test mode** for two reasons: no dev server to serve the inspector UI, and Stryker's sandboxed project copy breaks its path resolution.
