# Package Dependencies

This page is the short map of `package.json` dependencies.
Groups are organised by concern, with same-namespace tools together where that helps the mental map.

## Runtime dependencies

| Group             | Packages                                                                  | Why they exist here                                                                                                                          | Read more                                      |
| ----------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Vue framework     | `vue`, `pinia`, `vue-router`, `vue-i18n`                                  | UI, state, navigation, localisation                                                                                                          | [State & Routing](./state-and-routing.md)      |
| HTTP client       | `axios`                                                                   | single HTTP client used by the generated API client                                                                                          | [Runtime](./runtime.md)                        |
| Validation        | `zod`                                                                     | form and response validation; schemas generated from `openapi.yaml`                                                                          | [OpenAPI Workflow](../api/openapi-workflow.md) |
| Observability     | `@grafana/faro-web-sdk`, `@grafana/faro-web-tracing`                      | error monitoring + frontend tracing + web-vitals; Umami analytics loads via injected script                                                  | [Observability](./observability.md)            |
| Realtime          | — (clients in `src/infrastructure/`)                                      | SSE via native browser APIs                                                                                                                  | [Realtime](./realtime.md)                      |
| Guebbit shared    | `@guebbit/vue-toolkit`, `@guebbit/js-toolkit`                             | the REST/CRUD stores, form validation and notifications; plain-JS helpers (cookies, dates)                                                   | [Tools Explained](./tools-explained.md)        |
| UI                | `vuetify`, `tailwindcss`, `lucide-vue-next`, `@fontsource/roboto`         | component library and theme, utility classes, icons, the self-hosted font                                                                    | [UI Kit](../reference/src-ui.md)               |
| Permissions       | `@casl/ability`                                                           | the server's own packed rules, evaluated in the browser to decide what to render (`session.can`)                                             | [Security](./security.md)                      |
| Data              | `@tanstack/vue-query`, `lodash-es`, `qrcode`                              | the query client under every store; small collection helpers; the 2FA enrolment QR                                                           | [State & Routing](./state-and-routing.md)      |
| Human challenge   | `altcha`                                                                  | ALTCHA's web component — rung 3's self-hosted widget, `<HumanCheck>`'s `altcha` branch                                                       | [Security](./security.md)                      |
| Password strength | `@zxcvbn-ts/core`, `@zxcvbn-ts/language-common`, `@zxcvbn-ts/language-en` | local, advisory-only strength score on signup/reset/change forms (`PasswordStrengthMeter.vue`); dynamic `import()`, never in the boot bundle | [Account module](../modules/account.md)        |

## Dev dependencies

| Group                          | Packages                                                                               | Why they exist here                                                                                                                                                                                                        | Read more                                        |
| ------------------------------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Build toolchain                | `vite`, `@vitejs/plugin-vue`, `vue-tsc`                                                | SFC compilation, type-check                                                                                                                                                                                                | [Runtime](./runtime.md)                          |
| TypeScript                     | `typescript`                                                                           | source language                                                                                                                                                                                                            | [Runtime](./runtime.md)                          |
| API codegen                    | `orval`                                                                                | generate `contracts/rest/` from `openapi.yaml`                                                                                                                                                                             | [OpenAPI Workflow](../api/openapi-workflow.md)   |
| AsyncAPI codegen               | `@asyncapi/parser`, `@asyncapi/modelina`, `@stoplight/spectral-formatters`             | validate `asyncapi.yaml`; generate `contracts/asyncapi.generated.ts`                                                                                                                                                       | [AsyncAPI Workflow](../api/asyncapi-workflow.md) |
| OpenAPI linting                | `@stoplight/spectral-cli`                                                              | lint `openapi.yaml` against `spectral.yaml`                                                                                                                                                                                | [OpenAPI Workflow](../api/openapi-workflow.md)   |
| HTTP interception (unit tests) | `msw`                                                                                  | Node adapter standing in for a server in the transport-layer unit specs                                                                                                                                                    | [Unit testing](./unit-testing.md)                |
| Unit testing                   | `vitest`, `@vue/test-utils`, `jsdom`                                                   | unit test runner + Vue component mounting + DOM environment                                                                                                                                                                | [Testing](./testing-and-docs.md)                 |
| E2E testing                    | `cypress`, `@cypress/grep`, `start-server-and-test`, `otplib`                          | browser e2e tests, filtered by `@smoke` tag for the per-push live tier (Cypress's own plugin, v7); boots Vite before running Cypress; `otplib` (same major as the backend) computes the authenticator code a journey types | [Testing](./testing-and-docs.md)                 |
| Linting                        | `eslint`, `eslint-plugin-vue`, `typescript-eslint`, `eslint-plugin-unicorn`, `globals` | lint rules, Vue-aware + TS-aware parsing                                                                                                                                                                                   | [Testing](./testing-and-docs.md)                 |
| Formatting                     | `prettier`                                                                             | consistent code formatting                                                                                                                                                                                                 | [Testing](./testing-and-docs.md)                 |
| Git hooks                      | `husky`, `lint-staged`                                                                 | the pre-commit hook; `lint-staged` scopes lint + format to staged files only, so an unrelated dirty file in the checkout cannot fail (or, previously, get silently rewritten by) someone else's commit                     | [Testing](./testing-and-docs.md)                 |
| Docs                           | `vitepress`, `vitepress-plugin-mermaid`, `mermaid`                                     | docs site, diagrams, offline search                                                                                                                                                                                        | [Testing](./testing-and-docs.md)                 |

## Quick take

- Runtime dependencies are intentionally lean: Vue ecosystem + axios + Zod + observability.
- Heavy tooling — codegen, testing, docs, and the Vite plugins `vite.config.ts` loads at build
  time — is in `devDependencies`. Nothing installs this repo as a library, so the split is about
  stating the runtime surface honestly rather than about what ships.
- `@tanstack/vue-query` is the one client every store's resource shares (`src/infrastructure/query-client.ts`); it is also the required peer of `@guebbit/vue-toolkit`, whose composables cannot run without it.
- Grafana Faro and Umami are no-ops when their env vars are absent — safe to ship without configuring them.
- **`@asyncapi/cli` is deliberately not here.** It measured at ~446 MB transitive in this repo (and
  again in the paired backend), bundled a web app (Studio) nobody opened, and by default sent a
  telemetry event to a third party on every `npm run lint:asyncapi` — including inside the
  pre-commit gate. Validation is covered directly by `@asyncapi/parser`, a library
  `@asyncapi/modelina` already pulls in.
- **`altcha`** is the official widget for the backend's self-hosted `altcha` human-challenge
  provider — same project family as the backend's own `altcha-lib`, MIT-licensed, actively
  maintained, and the only npm package `HumanCheck.vue` depends on: its `turnstile` branch loads
  Cloudflare's vendor script directly rather than adding a wrapper for one `render()` call.

## Related pages

- [Package Scripts](./package-scripts.md)
- [API](../api/)
