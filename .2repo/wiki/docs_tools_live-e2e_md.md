# docs/tools/live-e2e.md

## Purpose

Documents the **live E2E profile** — the full-stack Cypress test run that exercises the real composed backend (live MongoDB, Redis, session cookies over a real network) as opposed to the demo profile's in-memory/stubbed setup. Covers when it runs (PR gate, nightly, manual), the required boot sequence, environment-variable pitfalls, and the response-validation mechanism that turns live specs into contract tests.

## Key elements

- **Boot sequence** — Backend: `compose:restart` → `db:bootstrap` → `host -- dev` (with rate-limit and Umami env overrides). Frontend: `npm run test:e2e:live` (builds with `VITE_VALIDATE_RESPONSES=true`, serves on `:8085` via `vite preview`, runs Cypress with `CYPRESS_liveProfile=true` on Chromium).
- **`orvalMutator` + `response-schema-map.ts`** — When `VITE_VALIDATE_RESPONSES` is set, every HTTP response is parsed against a Zod schema mapped per-route. Mismatch throws immediately. Off in Vitest; on by default outside `test` mode.
- **`BACKEND_PATH`** — Env var (default `../boilerplate-node-backend`) telling `cy.resetState()` where the sibling backend checkout lives for `host -- db:seed:reset`.
- **Rate-limit overrides** — `NODE_RATE_LIMIT_MAX`, `NODE_AUTH_RATE_LIMIT_MAX`, `NODE_AUTH_RATE_LIMIT_ADDRESS_MAX` all set to 1000 for live runs; the backend's default of 100/min causes 429s mid-suite.
- **Umami env vars** — `NODE_UMAMI_INGEST_HOST`, `NODE_UMAMI_WEBSITE_ID`, `NODE_ANALYTICS_PROVIDER` must be set explicitly because `npm run host` bypasses the compose service that would inject them.
- **`check:spec-identity`** — Verifies the frontend's `demo-data.json` copy hasn't forked from the backend's published seed.
- **Live session-refresh spec** — `auth.cy.ts` has one live-only case: forces a `401` and asserts the refresh flow survives.
- **CI integration** — PR gate via `workflow_call` from `ci.yml` into `e2e-live.yml`; nightly `cron` at 03:15 UTC on `main` only.

## Relationships

- **demo-profile.md** — The sibling profile; same specs, no real infrastructure. Live profile complements it by covering cache/queue/session behavior.
- **package-scripts.md** — Defines `test:e2e:live`, `compose:restart`, `db:bootstrap`, `check:spec-identity`, and other scripts referenced here.
- **docker-and-podman.md** — `compose:restart` spins up the Mongo/Redis/Umami containers the live profile depends on.
- **unit-testing.md** — `orvalMutator` is explicitly disabled under Vitest (`MODE === 'test'`); partial fixtures there would trigger false validation failures.
- **openapi-workflow.md** — `response-schema-map.ts` is hand-mapped from `contracts/rest/index.ts`; the backend's `toSatisfyApiSpec()` is the server-side mirror of the same contract.
- **scripts.md** — Resolves the npm script definitions and `paired-backend-path.ts` used for `BACKEND_PATH`.
- **testing-quickstart.md** / **testing-and-docs.md** — Broader test-orchestration context; live profile is the heaviest tier in the test pyramid documented there.
- **ops.md** — Rate-limit and Umami env var concerns overlap with operational configuration guidance.

## Notes

- **Backend must be booted first.** Nothing in the frontend boot waits for it; a missing backend produces network errors that mask the real failure.
- **Chromium, not Electron.** The bundled Electron binary crashes on `uploads.cy.ts` (deterministic `SIGILL` on at least one Linux host). `--browser chromium` is scoped to `test:e2e:live` only.
- **All three rate-limit buckets are independent.** Raising only the global one just shifts the suite into the credential bucket. Only *failed* credential attempts consume credential budget, so a correctly-authenticating suite passes even at the default 100.
- **Umami `INGEST_HOST` is `localhost:3080`, not the compose hostname `umami:3000`.** `npm run host` runs outside the compose network.
- **A silent backend is the worst analytics failure mode.** The frontend still writes its own row, so the "one row" assertion passes for the wrong reason. Only setting `NODE_UMAMI_*` explicitly on the backend catches this.
- **Seed-drift check lives in the backend, not here.** A former Cypress spec that pinned seeded ids was removed; the backend's `migration-demo-data.test.ts` asserts seed/migration parity directly.
