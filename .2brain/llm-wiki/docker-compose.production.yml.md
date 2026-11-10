---
source: docker-compose.production.yml
sha256: 4d5e3179dac7f8d6b51b4ffeed0adac0c525087da0812b34c9b94d6a9671cce4
signature: 4d5e3179dac7f8d6b51b4ffeed0adac0c525087da0812b34c9b94d6a9671cce4
generated_at: 2026-11-10T02:13:56.152144+00:00
model: ollama:qwen3.8:27b
---

# docker-compose.production.yml

## Purpose

Defines the production deployment stack for the frontend: it builds a static bundle via `docker/Dockerfile.production` and serves it with nginx. It is the counterpart to `docker-compose.yml` (development, Vite dev server + bind mounts) and is intended to be run with `docker compose -f docker-compose.production.yml up -d --build`.

## Key elements

- **`services.frontend`** — the single service in the file. Builds from `docker/Dockerfile.production` with one build arg (`VITE_APP_BASE_URL`) and exposes port `80` on loopback only.
- **Build args vs. environment** — `VITE_APP_BASE_URL` is the *only* build-time arg (baked into asset URLs by Vite). Every other `VITE_*` value is passed as a runtime `environment:` entry, consumed at container start by scripts in `docker/docker-entrypoint.d/` which write them into a config file. Changing them requires only `up -d`, not a rebuild.
- **`VITE_API_URL`** — marked required via the `${VITE_API_URL:?set VITE_API_URL}` syntax; container start fails if it is absent.
- **Optional runtime knobs** — log level, Axios timeout, max upload bytes, cart stock polling, Faro/Umami telemetry, `security.txt` fields, and `VITE_ROBOTS_INDEX`. All default to empty or off, disabling the feature entirely.
- **`restart: unless-stopped`** — keeps the container alive across host restarts without forcing it.
- **Port binding** — `127.0.0.1:${FRONTEND_PORT:-8080}:80`. Loopback only; TLS termination is expected at an external reverse proxy (auth cookies must not cross a plain-HTTP hop).

## Relationships

- **`docker-compose.yml`** — the development stack. Same repository, same `frontend` service name, but bind-mounts the source tree and runs the Vite dev server instead of nginx. They are never run simultaneously in the same compose project.
- **`docker/Dockerfile.production`** — the Dockerfile this file builds against. Contains the long-form note explaining the "one image, configured at start" strategy.
- **`docker/docker-entrypoint.d/`** — shell scripts executed by the nginx entrypoint at every container start. They read the `environment:` values and write them into the runtime config, which is the mechanism that makes reconfiguration possible without a rebuild.
- **`README.md`** — top-level project documentation; this file is the entry point for production build/deploy instructions referenced there.

## Notes

- **API is intentionally absent.** The API lives in a separate repository with its own compose file. Do *not* add an `api` service here; it would couple two independent deployments and hide version skew. The only link is `VITE_API_URL` + the OpenAPI contract.
- **Deployment rehearsal.** To simulate a real deploy locally, start the API's own `docker-compose.production.yml` first, *then* build this file with `VITE_API_URL=http://localhost:3000`. The order matters.
- **`.env` file.** Compose auto-interpolates a `.env` file placed beside this one. No `env_file:` directive is used; all variables are injected via `environment:` with `${VAR:-default}` or `${VAR:?error}` syntax.
- **`VITE_APP_LOG_LEVEL`** defaults to `warn` here (vs. the development default), because browser console output is user-facing in production.
