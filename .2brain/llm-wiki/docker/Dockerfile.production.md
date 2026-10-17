---
source: docker/Dockerfile.production
sha256: 5ee620eb19138ba31109c933314e4af4058589fb6dcd0200ac5e5f4be068e9fa
generated_at: 2026-10-16T23:56:04.683735+00:00
model: ollama:qwen3.8:27b
---

# docker/Dockerfile.production

## Purpose

Production Dockerfile for the frontend. Builds a static asset bundle with Vite (Stage 1, Node) and ships a minimal nginx image (Stage 2) that serves those files. The counterpart `docker/Dockerfile` is a development image that runs the Vite dev server with hot reload; this file is the deployable half. The design goal is a single image promoted across staging → production, where a config change requires only a restart, not a rebuild.

## Key elements

- **Stage 1 (`build`, `node:24-alpine`)** — Installs dependencies with `npm ci` (`.npmrc` included for `legacy-peer-deps`), then runs `npm run build` which invokes `vue-tsc` type-check *and* the Vite bundle in parallel; a type error aborts the build. `VITE_APP_BASE_URL` is the sole `ARG`, baked into asset URLs at bundle time. Source maps (Vite `sourcemap: 'hidden'`) are explicitly deleted from `dist/` after the build.
- **Stage 2 (`runtime`, `nginx:1-alpine`)** — Copies only `dist/` into nginx's web root. No Node, no source, no build tooling.
- **`docker/nginx.conf`** — SPA fallback, cache policy, security headers. Kept in-repo (not a heredoc) so it is diffable and lintable.
- **`docker/docker-entrypoint.d/40-generate-runtime-config.sh`** — Sourced by the nginx base image before startup; writes `/config.js` from the container's own environment variables (API origin, telemetry, locale, log level, upload/timeout limits). The app reads it via `src/infrastructure/runtime-config.ts` (`runtimeValue('API_URL') ?? import.meta.env.VITE_API_URL ?? ''`).
- **`docker/docker-entrypoint.d/41-generate-security-txt.sh`** — Writes `/.well-known/security.txt` only when the operator opts in.
- **`HEALTHCHECK`** — `wget --spider http://127.0.0.1/` every 30 s; verifies nginx is answering and `index.html` is present.
- **`CMD ["nginx", "-g", "daemon off;"]`** — Foreground nginx so the container tracks the server's lifetime.

## Relationships

- **`github/workflows/image-scan.yml`** — Scans the image produced by this Dockerfile (or the dev image) for vulnerabilities as part of CI.
- **`github/workflows/release.yml`** — Builds this image for release publication. Notably, it pulls its own copy of the `.map` files from a separate `npm run build` run *before* the image is built, to attach them to the GitHub Release asset; the image itself ships without maps.

## Notes

- **One build-time variable, everything else at runtime.** `VITE_APP_BASE_URL` is the only `ARG` because Vite rewrites every emitted asset URL with it. All other deployment values (API origin, telemetry, locale, log level, upload/timeout limits) are injected via the entrypoint scripts at container start, making a single image reusable across environments.
- **Source maps are deleted, not blocked.** The build stage runs `find dist -name '*.map' -type f -delete` before copying into the runtime stage. There is no nginx rule to deny `.map` requests; the deletion is the only guard. The release workflow extracts its own maps beforehand.
- **No `USER nginx`.** The alpine nginx base image runs workers as the unprivileged `nginx` user, but the master process must bind port 80 as root. Switching to `USER nginx` would fail the bind. This is acceptable because the containers are not externally reachable without a proxy.
- **Type-checking is the build gate.** Vitest does not type-check (see `vitest.config.ts`), so a green test suite is not evidence the code compiles. The `npm run build` step (`run-p type-check-only build-only`) is the only place a type error can stop a production image from being produced.
- **`.npmrc` must accompany the manifests.** Without its `legacy-peer-deps` setting, `npm ci` treats optional peer deps (e.g. `search-insights`) as missing from the lockfile.
