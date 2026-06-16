# Package Scripts

This page groups the `package.json` scripts by job instead of raw list order.

## Development scripts

| Script | Job | Read more |
| ------ | --- | --------- |
| `dev` | Start Vite dev server on `:8080` with HMR | [Runtime](./runtime.md) |
| `preview` | Preview the production build locally | [Runtime](./runtime.md) |

## Build & validation scripts

| Script | Job | Read more |
| ------ | --- | --------- |
| `build` | `vue-tsc` type-check + Vite production build | [Runtime](./runtime.md) |
| `lint` / `lint:fix` | ESLint check or autofix | [Testing](./testing-and-docs.md) |
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
| `test` | `test:unit` then `test:e2e` | [Testing](./testing-and-docs.md) |

## Contract and codegen scripts

| Script | Job | Read more |
| ------ | --- | --------- |
| `genapi` | Regenerate `api/` from `openapi.yaml` via orval | [OpenAPI Workflow](../api/openapi-workflow.md) |
| `genasyncapi` | Regenerate `src/types/realtime.generated.ts` from `asyncapi.yaml` | [AsyncAPI Workflow](../api/asyncapi-workflow.md) |

## Docs scripts

| Script | Job | Read more |
| ------ | --- | --------- |
| `docs:dev` | Local VitePress authoring server | [Testing](./testing-and-docs.md) |
| `docs:build` | Build the docs site for production | [Testing](./testing-and-docs.md) |
| `docs:preview` | Preview the built docs site | [Testing](./testing-and-docs.md) |

## Related pages

- [Package Dependencies](./package-dependencies.md)
- [API](../api/)
