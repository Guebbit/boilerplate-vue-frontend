# docker-compose.production.yml

## Purpose

Defines the production Docker Compose stack for the frontend: it builds the Vite static bundle (baking all `VITE_*` values in at compile time) and serves it behind nginx. It exists as the deploy counterpart to `docker-compose.yml`, which runs the Vite dev server with bind-mounted sources.

## Key elements

- **`services.frontend`** – Single service. Build context is the repo root; Dockerfile is `.docker/Dockerfile.production`.
- **`build.args`** – All `VITE_*` variables are **build-time** arguments (Vite replaces `import.meta.env.VITE_*` with literals during bundling). Key ones:
  - `VITE_API_URL` – *Required* (Compose `:?` syntax aborts the build if unset).
  - `VITE_API_SSE`, `VITE_APP_BASE_URL`, `VITE_APP_DEFAULT_LOCALE`, `VITE_APP_FALLBACK_LOCALE` – Optional with sensible defaults.
  - `VITE_APP_LOG_LEVEL` – Defaults to `warn` in production (vs. dev default) to keep the browser console clean.
  - `VITE_VALIDATE_RESPONSES` – Defaults to `false`; Zod/OpenAPI response checking is a dev/E2E instrument.
  - `VITE_FARO_*`, `VITE_UMAMI_*` – Telemetry; unset values disable the integration entirely.
- **`ports`** – Binds to `127.0.0.1:${FRONTEND_PORT:-8080}:80`. Loopback-only; TLS termination is expected in a reverse proxy upstream.
- **`restart: unless-stopped`** – Standard container restart policy.

## Relationships

- **`README.md`** – Expected to document the `docker compose -f docker-compose.production.yml up -d --build` workflow and the required `.env` setup.
- **`docs/theory/request-flow.md`** – Likely describes how the built frontend calls the API at `VITE_API_URL`; this file is the deployment unit that produces that frontend.
- **`CHANGELOG.md`** – Records versioned changes; this file is the artifact those entries describe when build-arg defaults or the service shape change.

(No of these relationships are code-level imports; they are documentation/contextual links in the repo graph.)

## Notes

- **Build args ≠ runtime env.** Changing a `VITE_*` value requires `--build`; a plain `docker compose up -d` restarts the container with the *old* values compiled in. The long comment at the top of `.docker/Dockerfile.production` elaborates.
- **API is intentionally absent.** The API lives in its own repository and its own `docker-compose.production.yml`. To rehearse a full deploy, bring up the API compose file first, then build this one with `VITE_API_URL=http://localhost:3000`.
- **Port is loopback-only by design.** The API sets auth cookies that must not traverse a plain-HTTP hop; a reverse proxy in front handles TLS.
- **`.env` interpolation.** Compose reads a sibling `.env` file automatically; no `env_file:` directive is needed.
