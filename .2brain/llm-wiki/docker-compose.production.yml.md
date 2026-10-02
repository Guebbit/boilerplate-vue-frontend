---
source: docker-compose.production.yml
sha256: cc0da6b74d65713ab522c67b6180645b98efbf791ed28ab44fffa45d9f32434c
generated_at: 2026-10-02T14:32:16.182447+00:00
model: ollama:qwen3.8:27b
---

# docker-compose.production.yml

## Purpose

Defines the production deployment stack for the frontend: a single nginx container that serves the static Vite bundle. It is the counterpart to `docker-compose.yml` (development), replacing the bind-mounted dev server with a built image. It is intentionally the *only* frontend-side deployment artifact—no API service lives here.

## Key elements

- **`services.frontend`** — the sole service. Builds `docker/Dockerfile.production`, maps `127.0.0.1:${FRONTEND_PORT:-8080}:80`, and restarts unless stopped.
- **Build arg `VITE_APP_BASE_URL`** — the *only* value baked into assets at build time. Changing it requires a rebuild.
- **Runtime environment vars** — all other `VITE_*` settings are written to `/config.js` at container start by `docker/docker-entrypoint.d/`, so changing them only needs `up -d`.
- **`VITE_API_URL`** — required (Compose `:?` syntax); the container refuses to start without it.
- **Optional integrations** — Faro telemetry (`VITE_FARO_*`), Umami analytics (`VITE_UMAMI_*`), and `security.txt` (`VITE_SECURITY_*`). An unset value disables the integration entirely.
- **`VITE_APP_LOG_LEVEL`** — defaults to `warn` in production (vs. the dev default) to keep the browser console quiet.

## Relationships

- **`docker-compose.yml`** — the development counterpart. Same frontend, but bind-mounts the working tree and runs the Vite dev server instead of building an image.
- **`docker/Dockerfile.production`** — the Dockerfile this file builds against. Contains the long-form rationale for the one-build-arg / many-runtime-args split.
- **`index.html`** — the entry point of the static bundle that nginx ultimately serves; the `VITE_APP_BASE_URL` build arg determines the base path under which it (and its assets) are reachable.
- **`SECURITY.md`** — the `VITE_SECURITY_CONTACT` / `VITE_SECURITY_EXPIRES` / `VITE_SECURITY_POLICY_URL` variables gate publication of `/.well-known/security.txt` per the policy described there.
- **`README.md`** — documents the two-command workflow (`up -d --build`, `logs -f frontend`) and points to this file as the production entry point.

## Notes

- **Loopback port binding is deliberate.** TLS termination belongs to a reverse proxy in front of this container because the API sets authentication cookies that must not traverse plain HTTP.
- **No API service by design.** Frontend and API deploy independently from separate repositories. Declaring the API here would create hidden version coupling. For a local rehearsal, bring up the API's own compose file first, then build this one with `VITE_API_URL=http://localhost:3000`.
- **`.env` file** beside this compose file is picked up automatically by Compose interpolation; no `env_file:` directive is needed.
- **`VITE_API_SSE` defaults to empty string**, not `undefined`—verify the frontend treats `""` as "SSE disabled" if you rely on that.
