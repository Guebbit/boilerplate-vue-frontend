# docs/getting-started.md

## Purpose

Onboarding guide that takes a developer from a fresh clone to a running storefront in three commands. It exists to eliminate the most common "it does not work" scenario — the app pointing at the wrong backend — by front-loading the demo-vs-full-stack distinction before any setup steps.

## Key elements

- **Mode diagram (Mermaid flowchart)** — decision tree on `VITE_API_URL` value: demo (in-memory Mongo, seeded) vs. full stack (real Mongo, Redis, broker).
- **First-run sequence** — `npm ci` → `cp .env-example .env` → `npm --prefix ../boilerplate-node-backend run demo` → `npm run dev`. Requires Node 22+ and a sibling `boilerplate-node-backend` checkout.
- **Full-stack run** — `npm run compose:restart` in the backend repo; requires `NODE_CORS_ORIGIN` to include `http://localhost:8080`.
- **Port map table** — this repo owns `8080–8099`; backend owns `3000–3099`. Lists Vite (`8080`), e2e Vite (`8085`), and Docs (`8090`).
- **Pre-commit gate** — `npm run complete` (lint, spec-lint, contract-identity, format, build, unit, e2e). ~10 min, mostly Cypress. Mutating twin: `npm run complete:fix`.
- **Deliberately excluded checks** — `test:e2e:visual`, `test:e2e:live`, `test:mutation` are outside the gate.
- **"Where to go next" table** — links to theory, API, and tools docs for the next layer of understanding.

## Relationships

- **README.md** — top-level entry point; this page is the detailed onboarding it defers to.
- **docker-compose.yml** — this page documents the compose path's env-file requirement (bind-mounted repo) and the host-port publishing contract; `VITE_APP_PORT` in `vite.config.ts` must match the compose publish.
- **docs/index.md** — docs-site index; this page is the canonical starting node in the reading order.
- **docs/theory/layers.md** — linked from the "next read" table for folder-architecture questions.
- **docs/theory/modules.md** — linked from the "next read" table for module structure.
- **docs/theory/module-lifecycle.md** — linked from the "next read" table for adding/removing domains.
- **docs/theory/roadmap.md** — linked from the "next read" table for planned-but-unbuilt work.
- **docs/modules/demo.md** — the demo profile is the core runtime assumption of this page's first-run instructions.
- **docs/api/asyncapi-workflow.md** — shares the "change an endpoint" concern; this page points readers toward the OpenAPI workflow doc, which lives alongside it.

## Notes

- `cp .env-example .env` is **mandatory**, not optional: the compose file bind-mounts the repo, so the container reads the same `.env`. Without it, Faro, Umami, and locale settings are silently absent.
- `VITE_API_URL` / `VITE_API_SSE` must always be **host** ports (`localhost:3000`), never compose service names, because the browser on the host resolves them.
- `strictPort` is enabled in `vite.config.ts`: a busy port hard-fails rather than incrementing, which would leave a published compose port pointing at nothing.
- `check:spec-identity` (inside `npm run complete`) **skips** if the sibling backend checkout is absent locally, but is **fatal** under CI where a missing sibling signals a misconfigured workflow.
- The `8080–8099` / `3000–3099` port split is the invariant that allows both stacks to run concurrently without network collision.
