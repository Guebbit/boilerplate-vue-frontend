# docs/reference/ops.md

## Purpose

Reference index for every non-application-code file in the frontend repo: Docker images, Compose stacks, CI workflows, public assets, and the VitePress docs site. Exists so a reader (human or AI) can locate and understand each operational file without scanning the directory tree.

## Key elements

- **Images** — `.docker/Dockerfile` (dev, Vite + bind-mount), `.docker/Dockerfile.production` (multi-stage build → nginx), `nginx.conf` (SPA fallback to `index.html`), `Dockerfile.docs` + `nginx.docs.conf` (VitePress site serving).
- **Compose** — `docker-compose.yml` (dev stack), `docker-compose.production.yml` (production shape), `.dockerignore` (excludes `node_modules`, test/coverage output).
- **CI** — `.github/workflows/ci.yml` (lint, contract checks, build, tests; e2e job checks out the paired backend), `e2e-live.yml` (scheduled run against a live backend), `mutation.yml` (nightly mutation + ratchet), `codeql.yml` (SAST), `.github/copilot-instructions.md` (house rules for AI assistants).
- **Served assets** — `public/favicon/*` (icon set + manifests, referenced from `index.html`), `public/images/*` (static app imagery; user uploads live on the API side).
- **Docs site** — `docs/*.md` (home + Getting Started), `docs/*/*.md` (all section pages), `docs/.vitepress/**` (VitePress config/theme).

## Relationships

- **docs/reference/index.md** — Section index; this file is one of the pages it links to.
- **docs/reference/contracts.md** — The "contract checks" step in `ci.yml` enforces the agreements documented in that sibling page; `e2e-live.yml` verifies them against a live backend.
- **README.md** — Top-level entry point; readers arriving there are expected to follow links into the docs site (this page) for operational detail rather than finding it in the README itself.

## Notes

- The nginx SPA fallback (`try_files … /index.html`) is the single most important line in `nginx.conf`; without it, deep-linked routes 404 before the router runs.
- `ci.yml` e2e does **not** mock the API — it checks out the paired backend repo and boots a real demo instance. Expect a second `git checkout` in the job logs.
- `public/` files are copied verbatim into the bundle root; the filename **is** the URL. Renaming a file breaks any hardcoded reference.
- The docs sidebar (in `.vitepress/`) is the canonical page list. Adding a page without registering it in the sidebar config makes the file exist but be unreachable.
- Port choices in `docker-compose.yml` are deliberate to avoid collision with the paired backend's ports; changing them requires coordinating across repos.
