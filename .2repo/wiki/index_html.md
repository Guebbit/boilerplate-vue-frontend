# index.html

## Purpose

HTML shell and Vite entry point for the Guebbit Vue 3 storefront. It provides the minimal document structure the SPA mounts into, sets browser/PWA metadata, and kicks off the JavaScript bundle.

## Key elements

- **`<div id="app">`** — Mount target where the Vue application (root component `App.vue`) is rendered.
- **`<script type="module" src="/src/main.ts">`** — Entry script; bootstraps the Vue app and attaches it to `#app`.
- **`<noscript>`** — Static fallback message shown when JavaScript is unavailable.
- **`<title>Guebbit</title>`** — Pre-boot default page title (replaced per-route by the router).
- **Favicon / PWA links** — Manifest, mask-icon, apple-touch-icon, and MS tile config under `/favicon/` for a full PWA browser-identity set.
- **`<meta name="description">`** — SEO description identifying the project as a Vue 3 storefront boilerplate (products, cart, orders, account).

## Relationships

- **`src/App.vue`** — The root component rendered inside `#app`; this file is its hosting document.
- **`package.json`** — Build scripts (Vite) use this file as the HTML entry; it is the top of the dependency graph.
- **`README.md`** — The project description in the meta tag mirrors the README's one-liner; keep them in sync when renaming the project.

## Notes

- The `<title>` is intentionally a **pre-boot default only**. The router overwrites it on every navigation using the pattern `<page> — <app name>`. Don't rely on it reflecting the current route.
- All favicon assets live under `/favicon/` in the public directory — not in `src/`. Missing files there will produce 404s for PWA install prompts.
- The script tag uses `type="module"` and a literal `/src/main.ts` path, meaning it is resolved by Vite at dev/build time; it is **not** a static file reference.
