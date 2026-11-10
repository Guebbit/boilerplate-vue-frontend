---
source: docker/Dockerfile.production
sha256: 7d3d51a868fcfdfb3813ea212bcf389c14047b223c8590a9fe5fa0f6c35849c9
signature: 7d3d51a868fcfdfb3813ea212bcf389c14047b223c8590a9fe5fa0f6c35849c9
generated_at: 2026-11-10T02:15:01.955205+00:00
model: ollama:qwen3.8:27b
---

# docker/Dockerfile.production

## Purpose

Multi-stage Dockerfile that produces the deployable frontend image: Vite builds static assets in a Node-based build stage, then nginx serves them in a minimal runtime stage with no Node, no npm, and no source. It is the production counterpart to `docker/Dockerfile` (which runs the Vite dev server). One image is promoted across environments; configuration changes are applied at container start via entrypoint scripts rather than at build time.

## Key elements

- **Stage 1 (`build`)** — `node:24-alpine`. Runs `npm ci`, then `npm run build` (which type-checks via `vue-tsc` and bundles via Vite). Accepts a single build arg, `VITE_APP_BASE_URL`, because Vite bakes it into every emitted asset URL. Deletes `dist/**/*.map` after build (Vite writes them as `hidden` source maps; they are never meant to be served).
- **Stage 2 (`runtime`)** — `nginx:1-alpine`. Copies only `/app/dist` into `/usr/share/nginx/html`. Installs `docker/nginx.conf` (SPA fallback, cache policy, security headers). Exposes port 80; does **not** switch to `USER nginx` because the master process must bind below 1024 as root.
- **Entrypoint hooks** (`docker/docker-entrypoint.d/`) — sourced by the nginx base image before startup:
  - `40-generate-runtime-config.sh` — writes `/config.js` from the container's own environment variables (API URL, telemetry, locale, log level, limits).
  - `41-generate-security-txt.sh` — optionally writes `/.well-known/security.txt`.
  - `42-generate-robots.sh` — writes `robots.txt` and an `X-Robots-Tag` switch; the site stays out of search until `VITE_ROBOTS_INDEX=true`.
- **HEALTHCHECK** — `wget --spider http://127.0.0.1/` every 30 s, 5 s timeout, 3 retries.
- **CMD** — `nginx -g "daemon off;"` (foreground; restates the base image default for safety).

## Relationships

- **`docker-compose.production.yml`** — the compose file that orchestrates this image (sets the environment variables read by the entrypoint hooks, maps ports).
- **`github/workflows/ci.yml`** — builds the image in CI to verify the build passes (type-check + bundle) before merge.
- **`github/workflows/image-scan.yml`** — scans the produced image for vulnerabilities.
- **`github/workflows/release.yml`** — builds the image for the GitHub Release; also pulls source maps out of a separate `npm run build` to publish alongside the release asset (the Dockerfile deletes them from `dist/` before the runtime stage).
- **`README.md`** — documents the build/run commands and the one-image-many-envs model.

## Notes

- **One build-time variable, not many.** Only `VITE_APP_BASE_URL` is a build arg. Every other deployment value (API origin, telemetry, locale, log level, upload/timeout limits) is injected at container start via `config.js`, so a config change is a restart, not a rebuild.
- **Type-checking happens here, not in Vitest.** `npm run build` runs `run-p type-check-only build-only`; a green test suite does not guarantee the code compiles. This Dockerfile build is the gate.
- **Source maps are deleted in the build stage, not blocked by nginx.** This is defense-in-depth: the release workflow has already pulled its own maps, and nginx has no explicit deny rule for `.map` paths.
- **`.npmrc` is copied alongside manifests.** It contains `legacy-peer-deps`; without it `npm ci` fails on optional peers (search-insights) not in the lockfile.
- **`USER nginx` is intentionally omitted.** The alpine nginx image drops privileges internally; switching the container user to `nginx` would prevent the master process from binding port 80.
