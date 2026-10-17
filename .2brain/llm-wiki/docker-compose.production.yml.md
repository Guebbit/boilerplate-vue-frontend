---
source: docker-compose.production.yml
sha256: 56b3ad2320110ba4e8e699081d3e6b960efa7111a4494974b9ead20713804147
generated_at: 2026-10-16T23:55:50.053103+00:00
model: ollama:qwen3.8:27b
---

# docker-compose.production.yml

## Purpose

Production deployment stack for the frontend. Unlike `docker-compose.yml` (which bind-mounts the working tree and runs the Vite dev server), this file builds the static bundle into a single nginx-based image and serves it. It exists so a deploy command is one `docker compose up` invocation rather than a hand-rolled build-and-serve pipeline.

## Key elements

- **`frontend` service** — the only service defined. Builds from `docker/Dockerfile.production` with the repo root as context.
- **`VITE_APP_BASE_URL` (build arg)** — the *only* value baked into asset URLs at build time. Changing it requires a rebuild.
- **Runtime `environment:` block** — every other setting is injected at container start via `docker/docker-entrypoint.d/` writing `/config.js`. Changing any of these is a restart, not a rebuild.
- **`VITE_API_URL` (required)** — uses the `:?` interpolation form; the container refuses to start if it is unset.
- **Optional runtime vars** — API SSE endpoint, locales, log level (defaults to `warn`), Axios timeout, max upload size, cart stock-poll interval, Faro/Umami telemetry (each disabled entirely when unset), and `security.txt` fields.
- **Port binding** — `127.0.0.1:8080:80` (loopback only). TLS termination is expected from a reverse proxy in front.
- **`restart: unless-stopped`** — standard production restart policy.

## Relationships

- **`docker-compose.yml`** — the development counterpart. Same project root, different image strategy (dev server vs. built bundle). The header comment explicitly contrasts the two.
- **`docker/Dockerfile.production`** — the Dockerfile consumed by the `build:` directive. The long note at its top documents the one-image/configured-at-start model this compose file relies on.
- **`index.html`** — the entry point of the static bundle this stack builds and serves through nginx.
- **`SECURITY.md`** — the `VITE_SECURITY_*` variables published here feed the `/.well-known/security.txt` page; the loopback-only port binding and TLS-at-proxy guidance align with the repository's security posture.
- **`README.md`** — documents the `docker compose -f docker-compose.production.yml up -d --build` workflow shown in this file's header.

## Notes

- **API is deliberately absent.** The API lives in a separate repo with its own compose file. Wiring it in here would make one repo "own" the other's deployment and hide version skew. The only link is `VITE_API_URL` plus the OpenAPI contract.
- **Rehearsal order matters.** To test locally, bring up the API's compose file *first*, then build this one with `VITE_API_URL=http://localhost:3000`. The two-command sequence mirrors a real deploy.
- **`.env` placement.** Compose interpolates a `.env` file found beside this compose file; alternatively export the variables in the shell. No `.env` is committed.
- **Telemetry vars default to empty, not a sentinel.** An unset Faro or Umami value disables that integration entirely rather than pointing it at a null endpoint.
