---
source: docker/Dockerfile.production
sha256: 18c27c838b77e6278cf6e24139e910fc7ec7f90e797be04176dab19aec2fd96c
generated_at: 2026-10-02T11:22:11.289325+00:00
model: ollama:qwen3.8:27b
---

# docker/Dockerfile.production

## Purpose

Multi-stage Dockerfile that produces the production frontend image: a Vite-bundled static site served by nginx. It is the deployment counterpart to `docker/Dockerfile` (dev), which runs the Vite dev server. The key design goal is a single image that can be promoted across environments with configuration supplied at container start rather than at build time.

## Key elements

- **Stage 1 — `build` (node:24-alpine):** Installs dependencies, copies source, runs `npm run build` (which is `run-p type-check-only build-only`, so `vue-tsc` gates the image build). Only build-time value is `ARG VITE_APP_BASE_URL` (baked into asset URLs by Vite). After bundling, explicitly deletes `dist/**/*.map` files before the runtime stage.
- **Stage 2 — `runtime` (nginx:1-alpine):** Copies only `dist/` into `/usr/share/nginx/html`, plus `docker/nginx.conf` (SPA fallback, cache headers, security headers) and two entrypoint scripts. No Node, no source.
- **`40-generate-runtime-config.sh`** (copied to `/docker-entrypoint.d/`): Runs before nginx starts; writes `/config.js` from the container's own environment variables (API URL, telemetry, locale, log level, etc.).
- **`41-generate-security-txt.sh`**: Writes `/.well-known/security.txt` only if the operator opts in via environment.
- **`EXPOSE 80` / `CMD ["nginx", "-g", "daemon off;"]`**: nginx master binds port 80 as root, workers drop privileges. Foreground process keeps the container alive.
- **`HEALTHCHECK`**: `wget --spider http://127.0.0.1/` every 30 s.

## Relationships

- **`github/workflows/release.yml`** — The comments note the release workflow performs its own `npm run build` (independent of this image) to extract and publish source maps alongside a GitHub Release *before* this image is built. The `find … -delete` step here is a second safety net so no `.map` file survives into the shipped image.
- **`github/workflows/image-scan.yml`** — Consumes the image this Dockerfile produces for vulnerability scanning (image-scan workflow).

## Notes

- **Source maps:** `vite.config.ts` sets `build.sourcemap: 'hidden'` (FA97), meaning maps are emitted but not referenced by chunks. There is **no** nginx rule blocking `.map` requests; protection relies solely on the `find … -delete` step. Do not remove that step without adding a server-side deny rule.
- **`VITE_APP_BASE_URL` is the only build arg.** Every other `VITE_*` value is injected at runtime via `config.js` → `runtimeValue()` in `src/infrastructure/runtime-config.ts`. Changing it requires a rebuild; changing the others requires only a restart.
- **Type-check gate:** Vitest does not type-check. A green test suite does not prove the code compiles. The `vue-tsc` step inside `npm run build` is the only compilation gate in the image pipeline.
- **Port 80 / no `USER nginx`:** Deliberately omitted. Switching to the `nginx` user breaks the root-bind needed for port 80. Acceptable because these containers sit behind a proxy.
- **`.npmrc` copied alongside manifests:** Its `legacy-peer-deps` flag is part of how the lockfile was resolved; omitting it causes `npm ci` to fail on optional peer deps (e.g. search-insights).
