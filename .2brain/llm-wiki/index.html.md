---
source: index.html
sha256: f5089d9e80cb32e4b3897dd87c14df82da5cd07c9d3f9252cc4911e2d1ee77c4
generated_at: 2026-10-02T11:23:55.081807+00:00
model: ollama:qwen3.8:27b
---

# index.html

## Purpose

The HTML shell and boot entry point for a Vue 3 storefront SPA. It defines the pre-JavaScript UI (a static splash spinner), wires up favicons and PWA metadata, and loads the runtime-config script followed by the application bundle (`/src/main.ts`).

## Key elements

- **`%APP_NAME%` placeholder** — appears in `<meta description>` and `<title>`; substituted at build/deploy time. The router overwrites the title on every navigation.
- **`#app-splash` + `#app-splash__spinner`** — a pure-CSS loading spinner (no framework dependency) rendered inside `#app` before Vue hydrates. Respects `prefers-color-scheme: dark` and `prefers-reduced-motion: reduce`.
- **Favicon / PWA links** — apple-touch-icon, manifest, mask-icon, browserconfig, theme-color; all served from `/favicon/`.
- **`<script src="./config.js">`** — written fresh by `docker/docker-entrypoint.d/` at container start; provides runtime configuration read by `src/infrastructure/runtime-config.ts`. Must load *before* the app bundle.
- **`<script type="module" src="/src/main.ts">`** — the Vue 3 application bootstrap.
- **`<noscript>`** — fallback message when JavaScript is disabled.

## Relationships

- **`docker-compose.production.yml`** — the production container defined there mounts the entrypoint scripts that generate `./config.js` at every container start. Without that script the `config.js` `<script>` tag 404s and the runtime-config reader falls back to `import.meta.env`.
- **`README.md`** — project-level documentation that describes the storefront boilerplate this file boots; the `%APP_NAME%` placeholder and the PWA meta description align with the branding described there.

## Notes

- `config.js` is **absent** in dev, unit-test, and `vite preview` contexts; the 404 is intentional and non-fatal because `src/infrastructure/runtime-config.ts` has a fallback path.
- The splash CSS is deliberately framework-free (no Vuetify, no Tailwind) because those stylesheets have not yet loaded when the browser paints the first frame.
- The `<title>` in this file is a **pre-boot default only**; the Vue router replaces it on the first navigation and on every subsequent route change.
