# docker-compose.yml

## Purpose

Defines the local development environment for the frontend (Vue/Vite) as a Docker Compose stack. It gives contributors a reproducible, platform-isolated dev server and a VitePress docs site without requiring a host-side Node install, while keeping hot-reload and `.env` editing workflow intact.

## Key elements

- **`app` service** — Builds from `.docker/Dockerfile`; runs the Vite dev server with `--host 0.0.0.0`. Exposes `${VITE_APP_PORT:-8080}`. Bind-mounts the repo root to `/app` so Vite sees host edits and reads the local `.env`. An anonymous volume shields the image's `node_modules` from the host bind mount.
- **`docs` service** — Builds from `.docker/Dockerfile.docs`; serves the VitePress static site via Nginx on `${VITE_DOCS_PORT:-8090}:80`.
- **`environment` block (app)** — Deliberately limited to the four variables the pairing flow needs (`NODE_ENV`, `VITE_APP_PORT`, `VITE_API_URL`, `VITE_API_SSE`). All other Vite/Faro/Umami flags are expected to come from the bind-mounted `.env`, not from compose.

## Relationships

- **`README.md` / `docs/getting-started.md`** — Point readers to this file (or to the `npm run compose:*` scripts that wrap it) as the entry point for starting the frontend locally.
- **`docs/tools/docker-and-podman.md`** — Documents the Docker/Podman toolchain assumptions (build context, volume driver, port-allocation conventions) that this compose file relies on.

## Notes

- **Do not add variables to `environment`.** Compose injects them as `process.env`, which Vite's `loadEnv` reads *after* `.env` files — so a variable listed here silently overrides the file and can no longer be tweaked by editing `.env`.
- **Stale `node_modules` trap.** The anonymous volume is populated once from the image and never refreshed. After adding/upgrading a dependency, a plain `docker compose up` will still run against the old tree (`Cannot find package …`). Use `npm run compose:rebuild` (which passes `down -v`) instead of `compose:restart`.
- **`--host 0.0.0.0` is set in the compose `command`, not in the `dev` npm script.** This keeps the server bound to loopback when run on the host (no LAN exposure) while still being reachable through the published port inside a container.
- **Port blocks:** 8080–8099 is reserved for this (frontend) repo; 3000–3099 belongs to the paired backend. The docs port (8090) must not collide with the backend's docs port (3090).
