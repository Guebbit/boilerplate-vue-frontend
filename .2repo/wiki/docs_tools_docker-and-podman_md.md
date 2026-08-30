# docs/tools/docker-and-podman.md

## Purpose

Documents the repo's two-container `docker-compose.yml` (Vite dev server + VitePress docs) and its pairing contract with the separate backend stack. Exists so developers understand the browser-as-bridge architecture, the required `.env` setup, and the non-obvious Vite/compose interactions that cause silent failures.

## Key elements

- **`docker-compose.yml` (referenced, not defined here)** — two services: `app` (Vite dev server, `${VITE_APP_PORT}:${VITE_APP_PORT}`, default 8080) and `docs` (VitePress + Nginx, 8090). No backend services.
- **`CONTAINER_ENGINE`** — shell-level variable (not `.env`) that selects `podman` (default) vs `docker` for the `npm run compose --` wrapper.
- **Compose `environment:` block** — intentionally minimal: only `VITE_APP_PORT`, `VITE_API_URL`, `VITE_API_SSE`. All other config must flow through the bind-mounted `.env`.
- **`.env` (required for containers)** — bind-mounted at `/app`; Vite's `loadEnv` reads it inside the container. Without it, Faro, Umami, and locale config are absent.
- **`--host 0.0.0.0`** — set in the compose `command` (not the `dev` script) so the container's published port reaches a listening socket; host-side dev script keeps `127.0.0.1` to avoid LAN exposure.
- **Port via `vite.config.ts` + `strictPort`** — single source of truth; `strictPort` prevents silent port-hopping that would leave the published mapping dangling. CLI `--port` still overrides (used by e2e on 8085).
- **"Browser is the only bridge" rule** — all backend URLs (`VITE_API_URL`, `VITE_API_SSE`, `VITE_FARO_URL`, `VITE_UMAMI_SRC`) must be host-localhost ports; compose service names are invalid here.
- **Solo-container is deliberately unsupported** — no self-answering mode; the app is "loudly broken" without a backend.

## Relationships

- **`docker-compose.yml`** — this page is the primary human/AI documentation for that file; it explains the container map, env contract, and the two services it defines.
- **`docs/getting-started.md`** — cross-referenced for the canonical host port map (FE: 8080–8099, BE: 3000–3099) that keeps both stacks runnable simultaneously.
- **`docs/tools/environment.md`** — shares the `.env`-first workflow; this page adds the container-specific constraint that `.env` is bind-mounted and the compose `environment:` block must not be expanded.
- **`docs/tools/live-e2e.md`** — the e2e runner starts this app's container on port 8085 (via CLI `--port` override) and points it at the real backend; this page documents why that override works.
- **`docs/index.md`** — parent navigation node; this page is reachable from the tools section.

## Notes

- **Do not add variables to the compose `environment:` block.** Entries become `process.env`, which Vite's `loadEnv` applies *after* `.env` files, silently overriding them and making them uneditable via file edit (only via shell `export` before `compose up`).
- **`CONTAINER_ENGINE` is a shell profile variable.** Compose reads `.env`, but the npm wrapper script does not; the engine choice is a machine property, not a repo-shipped config.
- **Backend-first startup order.** The backend owns the API/Alloy/Umami endpoints this app targets. Also verify `NODE_CORS_ORIGIN` in the backend's `.env` includes `http://localhost:8080`.
- **No shared compose network exists** between the two stacks by design; there is nothing to join and no service-name resolution across the boundary.
