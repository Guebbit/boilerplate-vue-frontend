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
| `podman:restart` / `docker:restart` | restart the compose stack | [Docker & Podman](./docker-and-podman.md) |
| `podman:rebuild` / `docker:rebuild` | rebuild images and restart the stack | [Docker & Podman](./docker-and-podman.md) |
| `podman:kill` / `docker:kill` | force-stop this project's compose containers | [Docker & Podman](./docker-and-podman.md) |

## Build & validation scripts

| Script | Job | Read more |
| ------ | --- | --------- |
| `build` | `vue-tsc` type-check + Vite production build | [Runtime](./runtime.md) |
| `lint` / `lint:eslint` / `lint:fix` | Lint gate (`lint` runs eslint + architecture checks; `lint:eslint` runs eslint only; `lint:fix` autofixes eslint issues) | [Testing](./testing-and-docs.md) |
| `lint:architecture` | Feature coupling report + boundary gate (fails on deep feature imports) | [Theory](../theory/) |
| `lint:openapi` | Lint `openapi.yaml` with Spectral | [OpenAPI Workflow](../api/openapi-workflow.md) |
| `prettier` / `prettier:fix` | Prettier check or rewrite | [Testing](./testing-and-docs.md) |
| `complete` | build + lint:fix + lint:openapi + prettier:fix + tests (local hardening) | [Testing](./testing-and-docs.md) |
| `complete:check` | build + lint + lint:openapi + prettier:check + tests (CI gate) | [Testing](./testing-and-docs.md) |

## Test scripts

| Script | Job | Read more |
| ------ | --- | --------- |
| `test:unit` | Vitest unit suite (CI mode) | [Testing](./testing-and-docs.md) |
| `test:e2e` | Start Vite (with MSW) + run Cypress headlessly | [Testing](./testing-and-docs.md) |
| `test:e2e:dev` | Open Cypress UI for interactive e2e development | [Testing](./testing-and-docs.md) |
| `test:e2e:random` | Start Vite with the faker-seeded random mock profile + run only `resilience.cy.ts` | [Mocking](./mocking.md) |
| `pretest:e2e:live` | Preflight for the live profile — backend reachable, `db:seed:reset:host` present, specs in sync. Runs automatically before `test:e2e:live` | [Live E2E](./live-e2e.md) |
| `test:e2e:live` | Start Vite (real API, response validation on) + run Cypress against the live backend, by hand | [Live E2E](./live-e2e.md) |
| `test:mutation` | Stryker: break the source on purpose and report what the tests failed to notice. Slow — nightly or before a refactor, never in a PR | [Testing](./testing-and-docs.md) |
| `test` | `test:unit` then `test:e2e` | [Testing](./testing-and-docs.md) |

## Contract and codegen scripts

| Script | Job | Read more |
| ------ | --- | --------- |
| `genapi` | Regenerate `contracts/rest/` and `tests/mocks/generated.ts` from `openapi.yaml` via orval | [OpenAPI Workflow](../api/openapi-workflow.md) |
| `genasyncapi` | Regenerate `src/types/realtime.generated.ts` from `asyncapi.yaml` | [AsyncAPI Workflow](../api/asyncapi-workflow.md) |
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
