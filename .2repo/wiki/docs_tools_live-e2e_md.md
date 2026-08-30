# docs/tools/live-e2e.md

## Purpose

Documents the **live E2E** test profile: the same Cypress specs from the demo profile run against the fully-composed backend (real MongoDB, Redis, broker, Umami) instead of in-memory stubs. It covers where the profile runs (PR gate, nightly cron, local), how to boot it, and which guards make a green run meaningful.

## Key elements

- **Boot sequence** – two terminals: `compose:restart` + `db:bootstrap` for the backend, then `npm run test:e2e:live` (builds with `VITE_VALIDATE_RESPONSES=true`, serves on `:8085`, runs Cypress with `CYPRESS_liveProfile=true`).
- **Rate-limit override** – `NODE_RATE_LIMIT_MAX=1000` (plus the two auth-bucket vars) is mandatory; without it the suite 429s mid-run and failures masquerade as auth bugs.
- **Umami backend config** – `NODE_UMAMI_INGEST_HOST` / `NODE_UMAMI_WEBSITE_ID` must be set on a `host`-launched backend; otherwise `analytics.cy.ts` passes for the wrong reason (one row from the frontend only).
- **`BACKEND_PATH`** – resolved by `scripts/paired-backend-path.ts` (default `../boilerplate-node-backend`); feeds `cypress.config.ts` → `cy.resetState()` which shells out to `host -- db:seed:reset`.
- **Response validation** – `orvalMutator` in `src/infrastructure/http/index.ts`, gated by `VITE_VALIDATE_RESPONSES`, parses every response through the Zod table in `response-schema-map.ts` and throws on mismatch.
- **Live session-refresh spec** – one case in `auth.cy.ts` forces a `401` and asserts the session survives; runs only in this profile.
- **CI integration** – `test-e2e-live` job in `ci.yml` delegates to `e2e-live.yml` via `workflow_call`; `e2e-live.yml` also carries a nightly `cron` (03:15 UTC) on the default branch.

## Relationships

| Neighbor | Interaction |
|---|---|
| `github/workflows/ci.yml` | Defines the `test-e2e-live` job; calls `e2e-live.yml` as a reusable workflow (`workflow_call`). |
| `github/workflows/e2e-live.yml` | Single source of truth for datastore setup, sibling checkout, and seeding; also provides the nightly cron. |
| `docs/tools/demo-profile.md` | The sibling profile (in-memory Mongo, cache/queue off). This page explicitly contrasts itself against it. |
| `docs/tools/docker-and-podman.md` | `compose:restart` (Mongo, Redis, Umami containers) depends on a container runtime documented there. |
| `docs/getting-started.md` | Onboarding entry point that links to both E2E profiles. |
| `docs/tools/unit-testing.md` | Complementary layer; `orvalMutator` validation is disabled inside Vitest to allow partial fixtures. |
| `scripts/paired-backend-path.ts` | `resolveBackendPath()` is imported by `cypress.config.ts`; produces the absolute path `cy.resetState()` uses. |
| `src/infrastructure/http/index.ts` | Houses `orvalMutator` and the `VITE_VALIDATE_RESPONSES` check. |
| `src/infrastructure/http/response-schema-map.ts` | Route → Zod schema table that `orvalMutator` validates against. |
| `src/modules/account/tests/e2e/auth.cy.ts` | Contains the live-only 401 → refresh-session spec. |
| `tests/support/e2e/commands.ts` | `cy.resetState()` live branch (shells to backend) and `cy.skipUnlessLive()` guard. |

## Notes

- **Boot order matters.** Nothing in the frontend waits for the backend; if `:3000` is not listening, every spec fails with a network error.
- **`response-schema-map.ts` is hand-maintained.** A missing route entry logs a dev-only warning (stale map), it does **not** throw—so a new route silently skips validation until the map is updated.
- **`VITE_VALIDATE_RESPONSES` default logic:** on in dev and e2e builds, off in Vitest. `build:e2e` bakes it to `true` unconditionally.
- **`check:spec-identity`** (`npm run check:spec-identity`) should be run whenever the paired repos have moved; a forked `demo-data.json` makes live failures look like behaviour bugs.
- **Nightly runs only target the default branch.** The PR gate covers feature branches; together they ensure no branch is untested, but the nightly specifically catches drift caused by backend-side changes.
