# docs/tools/environment.md

## Purpose

Reference card for every `VITE_*` environment variable the frontend reads, grouped by concern (application, locale, API, logging, telemetry). It exists so a developer or assistant can look up *which* variable controls a setting, its default, and the build-time-vs-runtime distinction without grepping the source.

## Key elements

- **Build-time rule (diagram + prose)** — `import.meta.env.VITE_*` is inlined into `bundle.js` by Vite; runtime container env vars have no effect. `VITE_API_URL` must be a browser-reachable host, never a compose service name.
- **Application table** — `VITE_APP_BASE_URL`, `VITE_APP_PORT`, `VITE_APP_EMPTY_VALUE`.
- **Locales table** — `VITE_APP_DEFAULT_LOCALE`, `VITE_APP_FALLBACK_LOCALE`. Notes that the *set* of bundled locales comes from `src/locales/*.json` (glob at build time) plus a runtime `GET /locales` call; the fallback must name a bundled locale to work offline.
- **API & realtime table** — `VITE_API_URL`, `VITE_API_SSE`, `VITE_AXIOS_TIMEOUT`, `VITE_MAX_UPLOAD_BYTES` (UX-only ceiling), `VITE_VALIDATE_RESPONSES` (Zod envelope validation, off in prod).
- **Logging table** — `VITE_APP_LOG_LEVEL`, `VITE_APP_LOG_SCOPES` (comma-separated or `*`).
- **Telemetry table** — Faro (`VITE_FARO_URL`, `VITE_FARO_APP_NAME`, `VITE_FARO_APP_VERSION`, `VITE_FARO_ENVIRONMENT`) and Umami (`VITE_UMAMI_WEBSITE_ID`, `VITE_UMAMI_SRC`); empty value disables the integration.

## Relationships

- **docs/getting-started.md** — This page tells the reader to copy `.env-example` to `.env` before the first run and links to Getting Started for the step-by-step.
- **docs/index.md** — Parent index; this page is the "environment variables" leaf under the tools section.
- **docs/tools/docker-and-podman.md** — The build-time rule here explains why a production image is environment-specific (see `.docker/Dockerfile.production` build args); the Docker/Podman page covers the containerisation mechanics.
- **src/locales/** — The Locales section in this page depends on that directory: the glob of `*.json` files determines which locales are bundled, and `VITE_APP_FALLBACK_LOCALE` must reference one of them for offline fallback to work.

## Notes

- `VITE_APP_PORT` is read in `vite.config.ts` via `loadEnv` so the dev server and the compose publish value stay in sync — changing one without the other causes a mismatch.
- `VITE_VALIDATE_RESPONSES` adds per-request Zod parsing on the main thread; it is intended as a dev/E2E instrument and should remain off in production.
- Telemetry variables use "empty string = disabled" semantics, not "missing key = disabled."
- The source of truth for variable names is the repo's `.env-example` file, not this doc; if they diverge, trust `.env-example`.
