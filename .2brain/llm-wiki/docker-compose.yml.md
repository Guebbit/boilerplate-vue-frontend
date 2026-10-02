---
source: docker-compose.yml
sha256: 9221008c9dbb9fe81c10ba08de1692bfc57eb9810763fe5a58aa87f074fda18e
generated_at: 2026-10-02T11:21:49.504594+00:00
model: ollama:qwen3.8:27b
---

# docker-compose.yml

## Purpose

Docker Compose file for the **development** frontend stack. It defines two services — a Vite dev server (`app`) and a VitePress docs site behind Nginx (`docs`) — so the entire frontend can run in containers with the same configuration a developer uses on the host.

## Key elements

- **`app` service** – Vue/Vite dev server built from `docker/Dockerfile`. Binds the project directory to `/app` (with `:Z` SELinux flag), exposes `${VITE_APP_PORT:-8080}`, and starts `npm run dev -- --host 0.0.0.0`. Only pairing-critical variables (`VITE_APP_PORT`, `VITE_API_URL`, `VITE_API_SSE`) are passed via `environment:`; all other Vite vars arrive through the bind-mounted `.env`.
- **`docs` service** – VitePress static site built from `docker/Dockerfile.docs`, served by Nginx on container port 80, mapped to `${VITE_DOCS_PORT:-8090}` on the host.
- **Anonymous volume `/app/node_modules`** – Preserves the image's `node_modules` so the bind mount above doesn't overwrite it with host-platform packages.

## Relationships

- **`README.md`** – The README points here as the entry point for running the frontend in Docker (`npm run compose:up` / `compose:rebuild`).
- **`docker-compose.production.yml`** – The production counterpart. This file is explicitly the *development* configuration (Vite dev server, debug-friendly ports, `.env` binding); the production file builds a static bundle instead.

## Notes

- **`environment:` is deliberately minimal.** Compose `environment:` entries become `process.env`, and Vite's `loadEnv` applies `process.env` *after* the `.env` files. Adding a var here locks it in and prevents `.env` from overriding it. Keep only pairing-critical vars in this block.
- **Anonymous `node_modules` volume is sticky.** It is populated from the image *once* and never refreshed. After adding a dependency and rebuilding the image, the container still runs the old install. Use `npm run compose:rebuild` (which includes `down -v`); a plain `compose:restart` will not clear the volume.
- **`--host 0.0.0.0` is mandatory.** Vite binds `127.0.0.1` by default, which inside a container means the published port forwards to nothing. It is set in the compose `command` rather than the `dev` script so host-side runs don't expose the server to the LAN.
- **Port-block convention:** this repo owns 8080–8099; the paired backend owns 3000–3099 (its docs live on 3090).
