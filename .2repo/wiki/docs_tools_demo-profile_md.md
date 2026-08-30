# docs/tools/demo-profile.md

## Purpose

Documents the **demo profile**: a self-contained, disposable backend (real API + in-memory MongoDB + seeded fixtures) that both the dev server and the fast e2e suite run against. It records the mechanism, the rationale for replacing MSW, and the operational contracts (reset, outbox, shard isolation) the e2e suite relies on.

## Key elements

- **`npm --prefix ../boilerplate-node-backend run demo`** — boots one process: the real application against `mongodb-memory-server`, seeded with every enabled module's fixtures, cache/queue disabled. Boots in seconds, holds nothing on disk.
- **`POST /__demo/reset`** — drops the in-memory database and reseeds in-process; called by `cy.resetState()` before every spec.
- **`GET /__demo/emails`** — in demo mode the mailer writes to an in-memory outbox instead of SMTP; read via `cy.demoEmailTo(address)`.
- **`orvalMutator`** — parses every e2e response through its OpenAPI-derived Zod schema (see `docs/tools/live-e2e.md`).
- **Shard isolation** — `npm run test:e2e` boots one demo backend per Cypress shard on ports `3101+`; each shard's `CYPRESS_apiUrl` is injected as `__E2E_API_URL`, read by the axios client in `src/infrastructure/http/client.ts` before falling back to `VITE_API_URL`.
- **`cy.skipUnlessLive()` / `cy.skipUnlessDemo()`** — spec-level guards: live-only specs (real Redis, real broker) vs. demo-only specs (outbox-dependent).
- **Multiple concurrent instances** — supported via `NODE_PORT=3101 npm run demo`; each owns its own in-memory database.

## Relationships

- **`docs/tools/live-e2e.md`** — the live profile (`npm run test:e2e:live`, the `test-e2e-live` CI job) is the full-stack complement; this page's `orvalMutator` contract conformance row points directly to that file.
- **`docs/getting-started.md`** — the prerequisite for the demo profile (Node + sibling backend checkout) is established there; this page assumes the reader already has the layout from getting-started.

## Notes

- The **`demo` module** (client-side showroom, no backend counterpart) is documented on its own module page (`docs/modules/demo.md`), not here. This page covers the backend profile and the e2e plumbing only.
- There is **deliberately no offline mock** of the app. The demo profile *is* the zero-infrastructure path; it needs Node and the sibling checkout and nothing else.
- The "mechanism vs. domain" split: this page owns the profile/commands/fixtures mechanism; the `demo` module page owns the client-side domain.
