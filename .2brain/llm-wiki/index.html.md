---
source: index.html
sha256: a25c3d3f4ff9e830a0dc572018406a3d7dc45aff2df96ffb8cf0e69e0f715087
signature: a25c3d3f4ff9e830a0dc572018406a3d7dc45aff2df96ffb8cf0e69e0f715087
generated_at: 2026-11-10T02:16:54.086174+00:00
model: ollama:qwen3.8:27b
---

# index.html

## Purpose

The static HTML entry point for the Vue 3 storefront. It provides the minimal DOM shell (`#app`), a framework-free loading splash, browser metadata, and the script-loading order (runtime config → app bundle) before any JavaScript executes.

## Key elements

- **`#app` div** — mount point that Vue replaces on bootstrap; initially contains a static `.app-splash` spinner visible until the first render.
- **Splash CSS** — plain CSS (no Vuetify/Tailwind) with light/dark colors matching the theme's `background`/`on-background` tokens; respects `prefers-reduced-motion`.
- **`<meta name="theme-color">`** — two media-scoped tags for the address-bar color; rewritten at runtime by `useThemeColorMeta`.
- **`%APP_NAME%` / `%BASE_URL%` placeholders** — template tokens substituted at build or deploy time (title, meta description, script `src`).
- **`<script src="%BASE_URL%config.js">`** — loads the runtime config file *before* the app bundle; path is anchored to the app base (not relative) so deep-link cold loads resolve correctly.
- **`<script type="module" src="/src/main.ts">`** — the Vite-built app entry point.
- **`<noscript>`** — static fallback message when JavaScript is disabled.

## Relationships

- **`docker/docker-entrypoint.d/`** — at every container start, writes a runtime-config script into the serving root so the `<script src="%BASE_URL%config.js">` tag above resolves. In dev, unit tests, and `vite preview` that file is absent; the browser logs one harmless 404 and the app proceeds.
- **`src/infrastructure/runtime-config.ts`** — reads the values injected by the config script (or, when that script is missing, falls back to Vite's environment variables). The ordering guarantee in this file (config script before `main.ts`) is the contract it relies on.
- **`src/main.ts`** — the module script loaded immediately after the config script; its bootstrap (locale merge, first navigation) is what eventually replaces the splash inside `#app`.
- **`src/ui/vuetify/theme.ts`** — defines the `background` and `on-background` color tokens; the splash CSS hardcodes the same literal values so the pre-JS paint matches the theme.

## Notes

- The splash colors are **duplicated** as literals in this file. If `theme.ts` changes its `background`/`on-background` tokens, the inline styles here must be updated manually — there is no build-time injection.
- `%BASE_URL%config.js` (not `./config.js`) is intentional: a relative path would resolve against the current URL on a deep link (e.g. `/en/products/` → `/en/products/config.js`), which 404s.
- The config script tag must appear **before** the `main.ts` script tag; reordering breaks the runtime-config contract.
