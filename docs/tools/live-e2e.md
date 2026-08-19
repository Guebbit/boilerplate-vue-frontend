# Live E2E (FE ↔ real backend)

The demo profile ([The demo profile](./demo-profile.md)) runs the same API this one does, minus the infrastructure: in-memory Mongo, cache and queue disabled. What it cannot prove is full-stack behaviour — a real Redis, a real broker, a session cookie crossing a real network — and that gap is closed by running the same Cypress specs against the fully-composed backend instead.

**This is the full-stack profile.** Both profiles run the real application; this one runs it with everything attached. This page documents it: when CI runs it, how to run it by hand, and what guards it.

## Where it runs, and where it does not

Three places:

- **On every PR**, as the required `test-e2e-live` job in `.github/workflows/ci.yml`. That job delegates to `e2e-live.yml` through `workflow_call` rather than duplicating its setup — one definition of the datastores, the sibling checkout and the seeding, so the gate and the nightly cannot drift apart.
- **Nightly**, via `e2e-live.yml`'s own `cron` (03:15 UTC, plus `workflow_dispatch`). This answers a question no PR run can: does `main` still agree with the *backend's* default branch? The backend moves on its own, so a frontend that was green yesterday can be wrong today without anyone touching it.
- **By hand**, with the boot sequence below.

**Scheduled workflows only ever run on the default branch.** A `cron` trigger fires against `main` and nothing else — but that no longer leaves a branch uncovered, because the PR gate runs the same job against the branch.

## Why it gates rather than merely reports

Because cache- and queue-enabled behaviour is real behaviour: an invalidation bug or a queue-path regression is invisible to a profile that runs both `disabled`. The demo suite fails fast on ordinary regressions; this one is where the full stack answers.

It costs what it costs: this profile needs both repos, a Mongo, a Redis and a seeded database, so it is minutes where the demo profile is seconds-per-boot. The demo suite still runs first and still fails fast on ordinary regressions; this is the one that also exercises the infrastructure.

What carries the weight in between:

- **response validation** (`VITE_VALIDATE_RESPONSES`), which turns any live contract violation into a hard failure instead of something that only surfaces if an unrelated assertion happens to trip on it
- the **specs themselves**, which run unchanged against the real API: a handler that has drifted from the service it mirrors fails here, on the PR that introduced it

## Architecture

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 50, 'rankSpacing': 65}}}%%
flowchart TB
    Boot["npm run compose:restart\nnpm run host -- db:bootstrap\nNODE_RATE_LIMIT_MAX=1000 npm run host -- dev\n(backend repo)"] --> Vite["vite build --outDir dist-e2e\nVITE_VALIDATE_RESPONSES=true\nvite preview :8085"]
    Vite --> Cypress["cypress run --e2e\nCYPRESS_liveProfile=true"]
    Cypress --> Real["real HTTP\n:8085 → :3000"]
    Real --> Backend[("live backend\nreal seeded MongoDB")]
    Real --> Mutator["orvalMutator\nparses every response\nvs @api/schemas"]
    Mutator -->|mismatch| Fail["throws — live contract\nviolation caught"]
    Cypress --> Refresh["auth.cy.ts live case\nforced 401 → refresh cookie\n:8085 → :3000"]

    classDef step fill:#dbeafe,stroke:#2563eb,color:#111827;
    classDef check fill:#dcfce7,stroke:#16a34a,color:#111827;
    classDef fail fill:#fee2e2,stroke:#dc2626,color:#111827;
    classDef data fill:#fef3c7,stroke:#d97706,color:#111827;
    class Boot,Vite,Cypress,Real step;
    class Mutator,Parity,Refresh check;
    class Fail fail;
    class Backend data;
```

## Boot sequence

```sh
# terminal 1 — backend
cd boilerplate-node-backend
npm run compose:restart
npm run host -- db:bootstrap

# terminal 2 — frontend
cd boilerplate-vue-frontend
npm run test:e2e:live
```

### Raise the backend's rate limits, or the suite fails halfway through

The backend ships `NODE_RATE_LIMIT_MAX=100` per minute per IP — sized for a person browsing. This suite is not a person: 85 specs drive real page loads, real logins and real uploads from one address, and `uploads.cy.ts` alone clears 100 requests a minute on its own. Past the budget the API answers **429**, the app bounces to `/login`, and the failure reads as "login is broken" rather than "we ran out of allowance". That is a genuinely expensive hour of debugging, because every assertion downstream fails for a reason unrelated to what it was testing.

Boot the backend with the same allowance its own test suites use (`tests/support/setup.ts` sets `1000`):

```sh
# terminal 1 — backend, for a live E2E run
NODE_RATE_LIMIT_MAX=1000 NODE_AUTH_RATE_LIMIT_MAX=1000 npm run host -- dev
```

Both are needed and they are separate buckets: the global one covers browsing, the auth one covers `POST /account/login` and its neighbours. Do not raise them in a deployed environment — the small credential budget is what makes password guessing expensive, and the two are deliberately decoupled so that widening one never widens the other (see `src/infrastructure/http/middlewares/security.ts` in the backend).

`host -- db:bootstrap` runs migrations and seeds against the containerized Mongo/Redis exposed on the host (`27017`/`6379`), matching the ports `host -- db:seed:reset` uses to reset state between specs. `test:e2e:live` itself builds the bundle with `VITE_VALIDATE_RESPONSES=true`, serves it on `:8085` with `vite preview`, then runs Cypress against it with `CYPRESS_liveProfile=true`.

Boot the backend first. Nothing here waits for it: with no backend listening on `VITE_API_URL` (default `http://localhost:3000`), every spec fails on a network error rather than on anything it was written to check.

Run `npm run check:spec-identity` alongside it when the pair has moved — a forked `demo-data.json` makes a live run fail on *data* rather than on behaviour, and that is a confusing hour if you are not expecting it.

## `BACKEND_PATH`

`cy.resetState()` shells out to the backend checkout for `host -- db:seed:reset` (under the demo profile it POSTs the backend's in-process `/__demo/reset` instead — see `tests/support/e2e/commands.ts`). Which checkout that is comes from `scripts/backend-path.ts`, which `cypress.config.ts` reads:

```sh
# default: a sibling checkout
../boilerplate-node-backend

# override for a different layout
BACKEND_PATH=/path/to/boilerplate-node-backend npm run test:e2e:live
```

The resolved value is always an absolute path, so `npm --prefix` errors name a real location instead of something relative to whatever `cwd` Cypress happened to have.

## Response validation

`orvalMutator` (`src/infrastructure/http/index.ts`) normally just unwraps `response.data`. Behind `VITE_VALIDATE_RESPONSES`, it additionally parses every response through the Zod schema matching its route (`src/infrastructure/http/response-schema-map.ts`, hand-mapped from `contracts/rest/index.ts`) and throws on a mismatch — the client-side mirror of the backend's own `toSatisfyApiSpec()` contract tests.

- `build:e2e` bakes it to `true`, so every e2e profile carries it.
- Otherwise it defaults to on (`MODE !== 'test'`) — so it also fires during ordinary local development against a live API — but off inside Vitest, where plenty of unit tests exercise `orvalMutator` against deliberately partial fixtures.
- A route with no entry in `response-schema-map.ts` logs a dev-only warning rather than throwing: a missing map entry means the map is stale, not that the response is wrong.

This is the single highest-value piece of this profile: it converts all five pre-existing specs into live contract tests for free, closing the exact bug class that has previously shipped (an `_id`/`id` mismatch, a leaked password field) unnoticed by a green suite.

## Where seed drift is caught

Not here. The demo dataset is published by the backend's `npm run seed:export` and copied to this repo by `npm run sync:frontend`, so both sides read one file and `npm run check:spec-identity` fails the build if the copies fork. Whether the *database a deployment actually builds* still matches that file is a property of the backend's migrations, and the backend asserts it directly in `tests/unit/db/migration-demo-data.test.ts` — seeding and migrating one database in both orders and comparing the result to the published artefact.

That check used to live here, as a Cypress spec pinning seeded ids by hand. It ran in the slowest harness available, in the repo that cannot fix a migration, and it went stale the first time the backend added a product.

## Live session refresh

`src/modules/account/tests/e2e/auth.cy.ts` has one live-only case: it forces a single `401` on an otherwise-valid authenticated request and asserts the session survives. It runs here rather than in the demo suite for history's sake more than necessity — both profiles now cross `:8085 → :3000` over a real network — and stays live-only so the case also covers the fully-composed stack.

## File map

| Path | Contents |
| --- | --- |
| `scripts/backend-path.ts` | `resolveBackendPath()`, read by `cypress.config.ts` |
| `src/infrastructure/http/index.ts` | `orvalMutator`, `VITE_VALIDATE_RESPONSES` gate |
| `src/infrastructure/http/response-schema-map.ts` | Route → Zod schema table `orvalMutator` validates against |
| `src/modules/account/tests/e2e/auth.cy.ts` | Live session-refresh case (alongside the demo-profile auth specs) |
| `tests/support/e2e/commands.ts` | `cy.resetState()`'s live branch, `cy.skipUnlessLive()` |
| `cypress.config.ts` | `env.backendPath`, `env.liveProfile`, `env.apiUrl` |

## Related pages

- [Testing](./testing-and-docs.md) — suite overview
- [Unit Testing](./unit-testing.md) — `httpValidateResponses.spec.ts` unit-tests the gate this page's response validation relies on
- [The demo profile](./demo-profile.md) — the fast profile this one complements
- [OpenAPI Workflow](../api/openapi-workflow.md)
