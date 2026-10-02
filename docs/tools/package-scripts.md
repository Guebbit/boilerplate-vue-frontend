# Package Scripts

This page groups the `package.json` scripts by job instead of raw list order.

## Development scripts

| Script               | Job                                                                                                                                                                             | Read more                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `dev`                | Start Vite dev server on `:8080` with HMR — the port comes from `VITE_APP_PORT` in `.env`, not from the script                                                                  | [Runtime](./runtime.md)           |
| `preview`            | Preview the production build locally                                                                                                                                            | [Runtime](./runtime.md)           |
| `backend:demo`       | Boot the paired backend's in-memory demo (`BACKEND_DEMO_COMMAND` in `.env`), the one the e2e shards start                                                                       | [Demo profile](./demo-profile.md) |
| `demo:remove`        | Delete every module `src/demo-modules.ts` names, and its line in `src/modules.ts` — the shop demo, gone (and the cross-module specs that name it in a `requires-module` header) | [Demo profile](./demo-profile.md) |
| `measure:demo-strip` | Report-only: copy the checkout to a scratch directory, strip the demo modules, and run type-check, lint and build on what is left                                               | [Demo profile](./demo-profile.md) |
| `prepare`            | Runs on `npm install`: installs the husky git hooks                                                                                                                             | [Testing](./testing-and-docs.md)  |
| `update:all`         | `npm-check-updates -u`: bump every dependency range in `package.json` (then review and install)                                                                                 | [Runtime](./runtime.md)           |

## Container scripts

Same three verbs per runtime. The container runs the same `dev` script, with `--host 0.0.0.0`
added by compose so the published port is actually reachable.

| Script            | Job                                                                 | Read more                                 |
| ----------------- | ------------------------------------------------------------------- | ----------------------------------------- |
| `compose:restart` | restart the compose stack                                           | [Docker & Podman](./docker-and-podman.md) |
| `compose:rebuild` | rebuild images and restart the stack                                | [Docker & Podman](./docker-and-podman.md) |
| `compose:kill`    | force-stop this project's compose containers                        | [Docker & Podman](./docker-and-podman.md) |
| `compose`         | any other compose subcommand, e.g. `npm run compose -- logs -f app` | [Docker & Podman](./docker-and-podman.md) |

All four expand to `${CONTAINER_ENGINE:-podman} compose`. Export `CONTAINER_ENGINE=docker` in your shell to use docker instead — a **shell** variable, not a `.env` entry, because npm does not read `.env` and never sees what is written there. Compose itself does read `.env`, which is why every other setting on this page can live in it and this one cannot. Keep the choice in step with the backend stack: the two are started side by side.

## Build & validation scripts

| Script                            | Job                                                                                                                                                                         | Read more                                        |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `build`                           | `vue-tsc` type-check + Vite production build                                                                                                                                | [Runtime](./runtime.md)                          |
| `build-only`                      | Vite production build alone, no type-check                                                                                                                                  | [Runtime](./runtime.md)                          |
| `build:e2e`                       | The build the e2e runs serve: request and response validation on, output in `dist-e2e/`                                                                                     | [Testing](./testing-and-docs.md)                 |
| `type-check-only`                 | `vue-tsc --build --force`, no bundling                                                                                                                                      | [Runtime](./runtime.md)                          |
| `lint` / `lint:fix`               | ESLint check or autofix                                                                                                                                                     | [Testing](./testing-and-docs.md)                 |
| `lint:openapi`                    | Lint `openapi.yaml` with Spectral                                                                                                                                           | [OpenAPI Workflow](../api/openapi-workflow.md)   |
| `lint:asyncapi`                   | Validate `asyncapi.yaml` with `@asyncapi/parser`'s default ruleset                                                                                                          | [Testing](./testing-and-docs.md)                 |
| `prettier:check` / `prettier:fix` | Prettier check or rewrite                                                                                                                                                   | [Testing](./testing-and-docs.md)                 |
| `check:asyncapi-types`            | Fail if `contracts/asyncapi.generated.ts` is not what `asyncapi.yaml` generates; writes nothing                                                                             | [AsyncAPI Workflow](../api/asyncapi-workflow.md) |
| `check:permission-actions`        | Fail if `contracts/permission-actions.ts` is not what `contracts/authorization-keys.yaml`'s `actions:` generates; writes nothing                                            | [Contracts](../reference/contracts.md)           |
| `check:route-table`               | Fail if `contracts/rest/routes.ts` is not what `openapi.yaml` generates; writes nothing                                                                                     | [OpenAPI Workflow](../api/openapi-workflow.md)   |
| `check:docs-references`           | Fail on a docs claim that does not hold: a dead path or anchor, an `npm run` that is not a script, an unlisted script or dependency, an import the contract does not export | [Testing](./testing-and-docs.md)                 |
| `check:spec-identity`             | Compare the shared contract files against the paired backend; skips when it is not on disk, fatal under CI                                                                  | [Testing](./testing-and-docs.md)                 |
| `complete`                        | the gate: `lint` + `prettier:check` + `complete:gates`                                                                                                                      | [Testing](./testing-and-docs.md)                 |
| `complete:gates`                  | everything `complete` runs after lint and prettier: both spec lints, generated-file freshness, spec identity, docs references, build, tests                                 | [Testing](./testing-and-docs.md)                 |
| `complete:light:gates`            | the static checks + `type-check-only` + unit tests that `complete:light` runs after lint and prettier                                                                       | [Testing](./testing-and-docs.md)                 |
| `complete:fix`                    | the same gate, with lint and formatting fixed rather than reported                                                                                                          | [Testing](./testing-and-docs.md)                 |
| `complete:light`                  | the fast subset pre-commit runs for now: every static check + `vue-tsc` + unit tests; no build, coverage or e2e                                                             | [Testing](./testing-and-docs.md)                 |
| `complete:manual`                 | what the gate cannot run for you: `test:e2e:live`                                                                                                                           | [Testing](./testing-and-docs.md)                 |

## Test scripts

| Script                   | Job                                                                                                                                                    | Read more                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| `test:unit:report`       | The unit run again, writing `reports/test-report.json` for the reader below                                                                            | [Quick Start](./testing-quickstart.md)        |
| `test:report`            | Per-module rollup, slowest suites, failures named by module, and per-module coverage when `coverage/lcov.info` exists                                  | [Quick Start](./testing-quickstart.md)        |
| `test:e2e:spec`          | One Cypress spec — `E2E_SPEC=<path> npm run test:e2e:spec`                                                                                             | [Quick Start](./testing-quickstart.md)        |
| `test:unit`              | Vitest unit suite (CI mode); pass a path after `--` to run one module — `npm run test:unit -- src/modules/<name>`                                      | [Testing](./testing-and-docs.md)              |
| `test:unit:coverage`     | The unit run with coverage; what the gate's `test` script runs                                                                                         | [Testing](./testing-and-docs.md)              |
| `test:unit:ci`           | Coverage plus a JSON report at `reports/test-report.json`, for CI's summary                                                                            | [Testing](./testing-and-docs.md)              |
| `test:e2e`               | Build, serve with `vite preview`, boot one demo backend per shard + run Cypress headlessly, sharded across `E2E_SHARDS` processes                      | [Testing](./testing-and-docs.md#test-timings) |
| `test:e2e:serial`        | The same run in one Cypress process — for when interleaved output is hard to read                                                                      | [Testing](./testing-and-docs.md#test-timings) |
| `test:e2e:antibot`       | The antibot specs (`*.antibot.cy.ts`) in one process, against a demo backend booted with the human-challenge provider on (`backend:demo -- --antibot`) | [Live E2E](./live-e2e.md#the-antibot-run)     |
| `test:e2e:dev`           | Open Cypress UI for interactive e2e development                                                                                                        | [Testing](./testing-and-docs.md)              |
| `test:e2e:live:spec`     | The live run of one slice: `E2E_SPEC=<specs> npm run test:e2e:live:spec` (the nightly matrix's per-job command); `E2E_GREP_TAGS=@smoke` filters by tag | [Live E2E](./live-e2e.md#tiers)               |
| `test:e2e:live`          | Start Vite (real API, response validation on) + run Cypress against the live backend, by hand                                                          | [Live E2E](./live-e2e.md)                     |
| `test:e2e:visual`        | The visual-regression specs against committed baselines; not in the gate                                                                               | [Visual regression](./visual-regression.md)   |
| `test:e2e:visual:update` | The same run, rewriting the baselines                                                                                                                  | [Visual regression](./visual-regression.md)   |
| `test:mutation:check`    | Compare the last mutation run with the committed baseline                                                                                              | [Testing](./testing-and-docs.md)              |
| `test:mutation:baseline` | The same, rewriting the baseline                                                                                                                       | [Testing](./testing-and-docs.md)              |
| `test:mutation`          | Stryker: break the source on purpose and report what the tests failed to notice. Slow — nightly or before a refactor, never in a PR                    | [Testing](./testing-and-docs.md)              |
| `test`                   | `test:unit` then `test:e2e`                                                                                                                            | [Testing](./testing-and-docs.md)              |

## Contract and codegen scripts

| Script                   | Job                                                                                                                                                                              | Read more                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `regenerate`             | **After every pull.** `gen:api`, `gen:asyncapi`, `gen:permission-actions`, then Prettier over `contracts/rest` — the whole client rebuilt from the specs the backend handed over | [OpenAPI Workflow](../api/openapi-workflow.md)   |
| `gen:api`                | Regenerate `contracts/rest/` from `openapi.yaml` via orval                                                                                                                       | [OpenAPI Workflow](../api/openapi-workflow.md)   |
| `gen:asyncapi`           | Regenerate `contracts/asyncapi.generated.ts` from `asyncapi.yaml`                                                                                                                | [AsyncAPI Workflow](../api/asyncapi-workflow.md) |
| `check:asyncapi-types`   | The same generation, compared instead of written — the freshness gate                                                                                                            | [AsyncAPI Workflow](../api/asyncapi-workflow.md) |
| `gen:permission-actions` | Regenerate `contracts/permission-actions.ts` (the `PermissionAction` type) from the backend's `actions:` list                                                                    | [Contracts](../reference/contracts.md)           |
| `check:route-table`      | The same for `contracts/rest/routes.ts`                                                                                                                                          | [OpenAPI Workflow](../api/openapi-workflow.md)   |
| `lint:openapi`           | Lint `openapi.yaml` with Spectral                                                                                                                                                | [OpenAPI Workflow](../api/openapi-workflow.md)   |
| `lint:asyncapi`          | Validate `asyncapi.yaml` with `@asyncapi/parser`'s default ruleset                                                                                                               | [AsyncAPI Workflow](../api/asyncapi-workflow.md) |

Generated output is committed. CI regenerates and fails if the result differs, so any codegen has to be followed by Prettier — orval emits 2-space indentation while this repo commits 4. `regenerate` already ends with it, which is the reason to reach for that rather than `gen:api` alone.

`openapi.yaml` and `asyncapi.yaml` are **owned by the backend** and arrive here through its `npm run sync:frontend`. Nothing in this repo produces them; `check:spec-identity` fails if they drift. So the sequence across the pair is: backend `npm run regenerate` → commit → pull here → `npm run regenerate` here.

Those two, the authorization keys and the demo webhook sink's three TLS files (`scripts/e2e/tls/`) are the whole list — `SHARED_FILES` in the backend's `scripts/pairing/spec-identity.ts` is what both the copy and the gate read. The demo dataset is **not** on it: this repo keeps no copy, and the e2e suites seed from the backend's own `scenarios/` instead.

## Docs scripts

| Script         | Job                                | Read more                        |
| -------------- | ---------------------------------- | -------------------------------- |
| `docs:dev`     | Local VitePress authoring server   | [Testing](./testing-and-docs.md) |
| `docs:build`   | Build the docs site for production | [Testing](./testing-and-docs.md) |
| `docs:preview` | Preview the built docs site        | [Testing](./testing-and-docs.md) |

## Related pages

- [Docker & Podman](./docker-and-podman.md)

- [Package Dependencies](./package-dependencies.md)
- [API](../api/)
