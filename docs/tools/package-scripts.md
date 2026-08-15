# Package Scripts

This page groups the `package.json` scripts by job instead of raw list order.

## Development scripts

| Script | Job | Read more |
| ------ | --- | --------- |
| `dev` | Start Vite dev server on `:8080` with HMR — the port comes from `VITE_APP_PORT` in `.env`, not from the script | [Runtime](./runtime.md) |
| `preview` | Preview the production build locally | [Runtime](./runtime.md) |

## Container scripts

Same three verbs per runtime. The container runs the same `dev` script, with `--host 0.0.0.0`
added by compose so the published port is actually reachable.

| Script | Job | Read more |
| ------ | --- | --------- |
| `compose:restart` | restart the compose stack | [Docker & Podman](./docker-and-podman.md) |
| `compose:rebuild` | rebuild images and restart the stack | [Docker & Podman](./docker-and-podman.md) |
| `compose:kill` | force-stop this project's compose containers | [Docker & Podman](./docker-and-podman.md) |
| `compose` | any other compose subcommand, e.g. `npm run compose -- logs -f app` | [Docker & Podman](./docker-and-podman.md) |

All four expand to `${CONTAINER_ENGINE:-podman} compose`. Export `CONTAINER_ENGINE=docker` in your shell to use docker instead — a **shell** variable, not a `.env` entry, because npm does not read `.env` and never sees what is written there. Compose itself does read `.env`, which is why every other setting on this page can live in it and this one cannot. Keep the choice in step with the backend stack: the two are started side by side.

## Build & validation scripts

| Script | Job | Read more |
| ------ | --- | --------- |
| `build` | `vue-tsc` type-check + Vite production build | [Runtime](./runtime.md) |
| `lint` / `lint:fix` | ESLint check or autofix | [Testing](./testing-and-docs.md) |
| `lint:openapi` | Lint `openapi.yaml` with Spectral | [OpenAPI Workflow](../api/openapi-workflow.md) |
| `lint:asyncapi` | Validate `asyncapi.yaml` with the AsyncAPI CLI | [Testing](./testing-and-docs.md) |
| `prettier` / `prettier:fix` | Prettier check or rewrite | [Testing](./testing-and-docs.md) |
| `check:spec-identity` | Compare the shared contract files against the paired backend; skips when it is not on disk, fatal under CI | [Testing](./testing-and-docs.md) |
| `complete` | the gate: lint + both spec lints + prettier:check + spec identity + build + tests | [Testing](./testing-and-docs.md) |
| `complete:fix` | the same gate, with lint and formatting fixed rather than reported | [Testing](./testing-and-docs.md) |
| `complete:manual` | what the gate cannot run for you: `test:e2e:visual` + `test:e2e:live` | [Testing](./testing-and-docs.md) |

## Test scripts

| Script | Job | Read more |
| ------ | --- | --------- |
| `test:unit` | Vitest unit suite (CI mode) | [Testing](./testing-and-docs.md) |
| `test:e2e` | Start Vite (with MSW) + run Cypress headlessly, sharded across `E2E_SHARDS` processes | [Testing](./testing-and-docs.md#test-timings) |
| `test:e2e:serial` | The same run in one Cypress process — for when interleaved output is hard to read | [Testing](./testing-and-docs.md#test-timings) |
| `test:e2e:dev` | Open Cypress UI for interactive e2e development | [Testing](./testing-and-docs.md) |
| `test:e2e:random` | Start Vite with the faker-seeded random mock profile + run only `resilience.cy.ts` | [Mocking](./mocking.md) |
| `test:e2e:live` | Start Vite (real API, response validation on) + run Cypress against the live backend, by hand | [Live E2E](./live-e2e.md) |
| `test:mutation` | Stryker: break the source on purpose and report what the tests failed to notice. Slow — nightly or before a refactor, never in a PR | [Testing](./testing-and-docs.md) |
| `test` | `test:unit` then `test:e2e` | [Testing](./testing-and-docs.md) |

## Contract and codegen scripts

| Script | Job | Read more |
| ------ | --- | --------- |
| `gen:api` | Regenerate `contracts/rest/` and `tests/support/mocks/generated.ts` from `openapi.yaml` via orval | [OpenAPI Workflow](../api/openapi-workflow.md) |
| `gen:asyncapi` | Regenerate `src/types/realtime.generated.ts` from `asyncapi.yaml` | [AsyncAPI Workflow](../api/asyncapi-workflow.md) |
| `lint:openapi` | Lint `openapi.yaml` with Spectral | [OpenAPI Workflow](../api/openapi-workflow.md) |
| `lint:asyncapi` | Validate `asyncapi.yaml` with the AsyncAPI CLI | [AsyncAPI Workflow](../api/asyncapi-workflow.md) |

Generated output is committed. CI regenerates and fails if the result differs, so always run `prettier:fix` after any codegen: orval emits 2-space indentation while this repo commits 4.

## Docs scripts

| Script | Job | Read more |
| ------ | --- | --------- |
| `docs:dev` | Local VitePress authoring server | [Testing](./testing-and-docs.md) |
| `docs:build` | Build the docs site for production | [Testing](./testing-and-docs.md) |
| `docs:preview` | Preview the built docs site | [Testing](./testing-and-docs.md) |

## Related pages

- [Docker & Podman](./docker-and-podman.md)

- [Package Dependencies](./package-dependencies.md)
- [API](../api/)
