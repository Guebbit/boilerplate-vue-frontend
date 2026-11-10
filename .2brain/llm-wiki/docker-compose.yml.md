---
source: docker-compose.yml
sha256: 9221008c9dbb9fe81c10ba08de1692bfc57eb9810763fe5a58aa87f074fda18e
signature: 9221008c9dbb9fe81c10ba08de1692bfc57eb9810763fe5a58aa87f074fda18e
generated_at: 2026-11-10T02:14:16.934286+00:00
model: ollama:qwen3.8:27b
---

# docker-compose.yml

## Purpose

Development Docker Compose configuration for the frontend. It defines two services — the Vue/Vite dev server and the VitePress docs site — so the full frontend stack can be run in containers with a single `docker compose up`.

## Key elements

- **`app` service** — Builds from `docker/Dockerfile`, runs `npm run dev -- --host 0.0.0.0`. Exposes port `${VITE_APP_PORT:-8080}`. Injects only pairing-critical env vars (`VITE_APP_PORT`, `VITE_API_URL`, `VITE_API_SSE`); all other config flows through the bind-mounted `.env`.
- **`docs` service** — Builds from `docker/Dockerfile.docs`, serves the VitePress static site via Nginx on port `${VITE_DOCS_PORT:-8090}`.
- **Anonymous volume `/app/node_modules`** — Preserves the image's `node_modules` against the host bind mount (`.:/app:Z`).
- **`.env` bind mount** — The `Z` flag and the `.:/app` mount let Vite read environment variables from the host `.env` file, matching host-side development behavior.

## Relationships

- **`docker/Dockerfile`** — Build target for the `app` service.
- **`docker/Dockerfile.docs`** — Build target for the `docs` service.
- **`docker-compose.production.yml`** — Production counterpart of this file (this file is explicitly the dev configuration).
- **`vite.config.ts`** — Consumes `VITE_APP_PORT` from the environment at runtime to determine its listening port.

## Notes

- **Do not add non-pairing-critical vars to `environment:`.** Compose `environment:` entries become `process.env`, and Vite's `loadEnv` applies `process.env` *after* `.env` files. Listing a var here silently makes it un-overridable via `.env` edits.
- **Stale `node_modules` gotcha.** The anonymous volume is populated from the image only on first creation. After adding a dependency and rebuilding the image, the volume still holds the old tree, causing `Cannot find package 'x'` errors. Fix: `npm run compose:rebuild` (which passes `down -v`). A plain `compose:restart` will *not* clear the volume.
- **`--host 0.0.0.0` is mandatory.** Without it Vite binds to the loopback address, the published port forwards to a dead socket, and the app is unreachable. It is set in the compose `command` rather than the `dev` script so that host-side `npm run dev` does not expose the server to the LAN.
