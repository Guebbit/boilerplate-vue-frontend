# Package Dependencies

This page is the short map of `package.json` dependencies.
Groups are organised by concern, with same-namespace tools together where that helps the mental map.

## Runtime dependencies

| Group | Packages | Why they exist here | Read more |
| ----- | -------- | ------------------- | --------- |
| Vue framework | `vue`, `pinia`, `vue-router`, `vue-i18n` | UI, state, navigation, localisation | [State & Routing](./state-and-routing.md) |
| HTTP client | `axios` | single HTTP client used by the generated API client | [Runtime](./runtime.md) |
| Validation | `zod` | form and response validation; schemas generated from `openapi.yaml` | [OpenAPI Workflow](../api/openapi-workflow.md) |
| Observability | `@grafana/faro-web-sdk`, `@grafana/faro-web-tracing` | error monitoring + frontend tracing + web-vitals; Umami analytics loads via injected script | [Observability](./observability.md) |
| Realtime | — (clients in `src/utils/`) | SSE + WebSocket via native browser APIs | [Realtime](./websockets.md) |
| Guebbit shared | `@guebbit/css-toolkit`, `@guebbit/vue-toolkit` | shared SCSS tokens and Vue components | [Tools Explained](./tools-explained.md) |

## Dev dependencies

| Group | Packages | Why they exist here | Read more |
| ----- | -------- | ------------------- | --------- |
| Build toolchain | `vite`, `@vitejs/plugin-vue`, `vue-tsc`, `sass`, `sass-embedded` | SFC compilation, type-check, styles | [Runtime](./runtime.md) |
| TypeScript | `typescript` | source language | [Runtime](./runtime.md) |
| API codegen | `orval`, `@faker-js/faker` | generate `contracts/rest/` from `openapi.yaml`; faker for MSW stubs | [OpenAPI Workflow](../api/openapi-workflow.md) |
| AsyncAPI codegen | `@asyncapi/cli`, `@asyncapi/modelina` | validate `asyncapi.yaml`; generate `src/types/realtime.generated.ts` | [AsyncAPI Workflow](../api/asyncapi-workflow.md) |
| OpenAPI linting | `@stoplight/spectral-cli`, `@stoplight/spectral-rulesets` | lint `openapi.yaml` against `spectral.yaml` | [OpenAPI Workflow](../api/openapi-workflow.md) |
| Mocking | `msw` | MSW service worker + Node adapter for dev and tests | [Mocking (MSW)](./mocking.md) |
| Unit testing | `vitest`, `@vue/test-utils`, `jsdom` | unit test runner + Vue component mounting + DOM environment | [Testing](./testing-and-docs.md) |
| E2E testing | `cypress`, `start-server-and-test` | browser e2e tests; boots Vite before running Cypress | [Testing](./testing-and-docs.md) |
| Linting | `eslint`, `eslint-plugin-vue`, `typescript-eslint`, `eslint-plugin-unicorn`, `eslint-plugin-prettier`, `eslint-config-prettier`, `globals` | lint rules, Vue-aware + TS-aware parsing | [Testing](./testing-and-docs.md) |
| Formatting | `prettier` | consistent code formatting | [Testing](./testing-and-docs.md) |
| Docs | `vitepress`, `vitepress-plugin-mermaid`, `mermaid` | docs site, diagrams, offline search | [Testing](./testing-and-docs.md) |

## Quick take

- Runtime dependencies are intentionally lean: Vue ecosystem + axios + Zod + observability.
- Most heavy tooling (codegen, testing, docs) is in `devDependencies`.
- Grafana Faro and Umami are no-ops when their env vars are absent — safe to ship without configuring them.

## Related pages

- [Package Scripts](./package-scripts.md)
- [API](../api/)
