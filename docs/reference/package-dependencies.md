---
type: reference
audience: [developer]
---

# Package Dependencies

This page is the short map of `package.json` dependencies.
Groups are organised by concern, with same-namespace tools together where that helps the mental map.

## Runtime dependencies

| Group             | Packages                                                                  | Why they exist here                                                                                                                                                             | Read more                                                                                  |
| ----------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Vue framework     | `vue`, `pinia`, `@vue/devtools-api`, `vue-router`, `vue-i18n`             | UI, state, navigation, localisation                                                                                                                                             | [State & Routing](../understand/state-and-routing.md)                                      |
| HTTP client       | `axios`                                                                   | single HTTP client used by the generated API client                                                                                                                             | [Runtime](../understand/runtime.md)                                                        |
| Validation        | `zod`                                                                     | form and response validation; schemas generated from `openapi.yaml`                                                                                                             | [OpenAPI Workflow](../build/openapi-workflow.md)                                           |
| Observability     | `@grafana/faro-web-sdk`, `@grafana/faro-web-tracing`                      | error monitoring + frontend tracing + web-vitals; Umami analytics loads via injected script                                                                                     | [Observability](../operate/observability.md)                                               |
| Realtime          | — (clients in `src/infrastructure/`)                                      | SSE via native browser APIs                                                                                                                                                     | [Realtime](../understand/realtime.md)                                                      |
| Guebbit shared    | `@guebbit/vue-toolkit`, `@guebbit/js-toolkit`                             | the REST/CRUD stores, form validation and notifications; plain-JS helpers (cookies, dates)                                                                                      | [Tools Explained](../understand/tools-explained.md)                                        |
| UI                | `vuetify`, `tailwindcss`, `lucide-vue-next`, `@fontsource/roboto`         | component library and theme, utility classes, icons, the self-hosted font                                                                                                       | [UI Kit](./src-ui.md)                                                                      |
| Permissions       | `@casl/ability`                                                           | the server's own packed rules, evaluated in the browser to decide what to render (`session.can`)                                                                                | [Security](../understand/security.md)                                                      |
| Data              | `@tanstack/vue-query`, `lodash-es`, `qrcode`                              | the query client under every store; small collection helpers; the 2FA enrolment QR                                                                                              | [State & Routing](../understand/state-and-routing.md)                                      |
| Guided tours      | `driver.js`                                                               | the welcome and page tours' popovers (MIT, tiny, framework-free); wrapped in one composable and loaded on first use, never in the boot bundle                                   | [Guided tours](../understand/tours.md)                                                     |
| Human challenge   | `altcha`                                                                  | ALTCHA's web component — rung 3's self-hosted widget, `<HumanCheck>`'s `altcha` branch                                                                                          | [Security](../understand/security.md)                                                      |
| Password strength | `@zxcvbn-ts/core`, `@zxcvbn-ts/language-common`, `@zxcvbn-ts/language-en` | local, advisory-only strength score on signup/reset/change forms (`PasswordStrengthMeter.vue`); dynamic `import()`, never in the boot bundle                                    | [Account module](../modules/account.md)                                                    |
| Downloads         | `content-disposition`                                                     | parses the server's `Content-Disposition` (RFC 6266, `filename*` included) so a download is saved under the name the server chose; zero dependencies, browser-safe              | [Request Flow](../understand/request-flow-strategies.md#downloads-are-named-by-the-server) |
| Charts            | `mermaid`                                                                 | the stats module's charts (`xychart-beta`, `pie`) drawn from text; dynamic `import()` on the stats routes only, never in the boot bundle. No chart library: see the module page | [Stats module](../modules/stats.md)                                                        |

## Dev dependencies

| Group                          | Packages                                                                                                                                                                                                       | Why they exist here                                                                                                                                                                                                                                                              | Read more                                          |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Build toolchain                | `vite`, `@vitejs/plugin-vue`, `vue-tsc`                                                                                                                                                                        | SFC compilation, type-check                                                                                                                                                                                                                                                      | [Runtime](../understand/runtime.md)                |
| TypeScript                     | `typescript`                                                                                                                                                                                                   | source language                                                                                                                                                                                                                                                                  | [Runtime](../understand/runtime.md)                |
| API codegen                    | `orval`                                                                                                                                                                                                        | generate `contracts/rest.generated/` from `openapi.yaml`                                                                                                                                                                                                                         | [OpenAPI Workflow](../build/openapi-workflow.md)   |
| AsyncAPI codegen               | `@asyncapi/modelina`                                                                                                                                                                                           | generate `contracts/asyncapi.generated.ts`                                                                                                                                                                                                                                       | [AsyncAPI Workflow](../build/asyncapi-workflow.md) |
| HTTP interception (unit tests) | `msw`                                                                                                                                                                                                          | Node adapter running one shared server for every unit spec: it answers the specs that mock HTTP and refuses any request nobody mocked                                                                                                                                            | [Unit testing](../build/unit-testing.md)           |
| Unit testing                   | `vitest`, `@vue/test-utils`, `jsdom`                                                                                                                                                                           | unit test runner + Vue component mounting + DOM environment                                                                                                                                                                                                                      | [Testing](../build/testing-and-docs.md)            |
| E2E testing                    | `cypress`, `@cypress/grep`, `start-server-and-test`, `otplib`                                                                                                                                                  | browser e2e tests, filtered by `@smoke` tag for the per-push live tier and by `@visual-*` tag for a partial visual re-record (Cypress's own plugin, v7); boots Vite before running Cypress; `otplib` (same major as the backend) computes the authenticator code a journey types | [Testing](../build/testing-and-docs.md)            |
| Lab performance                | `lighthouse`, `chrome-launcher`, `puppeteer-core`                                                                                                                                                              | the Lighthouse Node API, pinned exactly; not `@lhci/cli` (frozen on Lighthouse 12, and its defaults upload reports) and not full `puppeteer` (downloads a browser)                                                                                                               | [Testing](../build/testing-and-docs.md)            |
| Linting                        | `eslint`, `eslint-plugin-vue`, `typescript-eslint`, `eslint-plugin-unicorn`, `eslint-plugin-regexp`, `@stylistic/eslint-plugin`, `eslint-plugin-better-tailwindcss`, `vue-eslint-parser`, `postcss`, `globals` | lint rules, Vue-aware + TS-aware parsing, regular-expression checks (ReDoS-prone and useless patterns), the blank line between declarations, Tailwind class checks against the theme, template comment rules, CSS parsing for the design specs                                   | [Testing](../build/testing-and-docs.md)            |
| Import graph                   | `dependency-cruiser`                                                                                                                                                                                           | the one graph rule, `no-circular` over the runtime graph (`.dependency-cruiser.cjs`), run by `npm run check`; the tier walls stay in ESLint                                                                                                                                      |
| Formatting                     | `prettier`                                                                                                                                                                                                     | consistent code formatting                                                                                                                                                                                                                                                       | [Testing](../build/testing-and-docs.md)            |
| Git hooks                      | `husky`, `lint-staged`                                                                                                                                                                                         | the pre-commit hook; `lint-staged` scopes lint + format to staged files only, so an unrelated dirty file in the checkout cannot fail or rewrite someone else's commit                                                                                                            | [Testing](../build/testing-and-docs.md)            |
| Docs                           | `vitepress`                                                                                                                                                                                                    | docs site, diagrams, offline search                                                                                                                                                                                                                                              | [Testing](../build/testing-and-docs.md)            |

## Quick take

- Runtime dependencies are intentionally lean: Vue ecosystem + axios + Zod + observability.
- Heavy tooling — codegen, testing, docs, and the Vite plugins `vite.config.ts` loads at build
  time — is in `devDependencies`. Nothing installs this repo as a library, so the split is about
  stating the runtime surface honestly rather than about what ships.
- `@vue/devtools-api` is `pinia` 4's required peer. Pinia lists it as a peer, and this repo sets `legacy-peer-deps` (see `.npmrc`), which does not install peers, so it is a direct dependency here.
- `@tanstack/vue-query` is the one client every store's resource shares (`src/infrastructure/query-client.ts`); it is also the required peer of `@guebbit/vue-toolkit`, whose composables cannot run without it.
- Grafana Faro and Umami are no-ops when their env vars are absent — safe to ship without configuring them.
- **`@asyncapi/cli` is deliberately not here.** It measured at ~446 MB transitive in this repo (and
  again in the paired backend), bundled a web app (Studio) nobody opened, and by default sent a
  telemetry event to a third party on every run, including inside the pre-commit gate. This repo
  does not lint the contract at all: the backend does, and only its identical copy lands here.
- **`altcha`** is the official widget for the backend's self-hosted `altcha` human-challenge
  provider — same project family as the backend's own `altcha-lib`, MIT-licensed, actively
  maintained, and the only npm package `HumanCheck.vue` depends on: its `turnstile` branch loads
  Cloudflare's vendor script directly rather than adding a wrapper for one `render()` call.

## Browser floor

`mermaid` 12 raises the floor to Safari 17.4+ for the staff stats charts and for the docs site: the
docs diagrams load the same `mermaid` in the reader's browser. A browser below it, or a chunk that
fails to load, shows the stats chart's failed state (the table view still holds the numbers); a docs
diagram stays undrawn and the cause is logged to the console.

## Install scripts

`.npmrc` sets `strict-allow-scripts`: a package's install script runs only if `package.json`
`allowScripts` names it. Entries are by **package name**, not `name@version`
(`allow-scripts-pin=false`).

- **Why not pinned:** dependabot's grouped bumps cannot re-approve a pin, so every bump failed
  `npm ci` with `ESTRICTALLOWSCRIPTS`.
- **What still guards a version change:** the lockfile integrity hash and the human merge. The
  7-day dependabot cooldown covers dependabot only; `.npmrc` `min-release-age=7` gives a local
  `npm install` the same cooldown (override once with `--min-release-age=0`).
- **What guards production:** all three images (`docker/Dockerfile`, `Dockerfile.docs`, `Dockerfile.production`) install with `--ignore-scripts`, then run `npm run regenerate` once after `COPY . .`: the one script they need.
- **Counter-view:** npm's own default and LavaMoat pin versions, so a hijacked release of an
  approved package cannot run its script. pnpm, Bun and Yarn Berry approve by name.
- **A new script is still reviewed once:** `npm view <pkg>@<version> scripts`, then
  `npm approve-scripts <pkg>`, never `--all`.
- **Deny a script that does nothing:** `@parcel/watcher` is `false` because its install step is a
  no-op without `npm_config_build_from_source`; the binaries arrive as optional dependencies.
- **`msw` and `vue-demi` are `false` too:** `msw`'s script returns early without
  `msw.workerDirectory`, and `vue-demi`'s default `lib/` is already the Vue 3 build. `msw` becomes
  needed if `msw.workerDirectory` is ever set, because the worker copy then silently stops.

The paired backend's dependency-vetting page holds the longer argument.

## Held versions

Measured 2026-11-16. Everything else is on its latest release; what is not is here, with the run
that says why. The paired backend's pending-major-upgrades page holds its own list.

| Package           | Now     | Latest | Why it waits                                                                                                                                                                                                    |
| ----------------- | ------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vuetify`         | ~4.1.5  | 4.3.2  | 4.3 fails 22 unit tests in 11 files (sortable header classes, the merge-report live region, inline alerts, stale-record dialogs); 4.1.5 passes them. Needs a look at the changed DOM, and the visual baselines. |
| `@vue/test-utils` | ~2.4.11 | 2.5.1  | 2.5's types make `findComponent(<SFC>)` an error type, so typed lint fails in three specs.                                                                                                                      |
| `cypress`         | 15.21   | 16.2   | `cypress-axe` peers 15; `cy.exec` is removed; every visual baseline moves.                                                                                                                                      |
| `pixelmatch`      | 7.2     | 8.0    | Changes every diff count, which is a visual-gate decision for a person.                                                                                                                                         |
| `typescript`      | 6.0.3   | 7.0.2  | `typescript-eslint`, `ts-jest` and `vue-tsc` do not accept 7 yet.                                                                                                                                               |
| `@types/node`     | 24      | 26     | Moves with the Node runtime.                                                                                                                                                                                    |

`eslint-plugin-unicorn` 80 and `jsdom` 31 were released less than seven days before they were taken
(the owner's explicit exception, once). Until 2026-11-22 a plain `npm install <pkg>` fails with
`ETARGET` on `eslint-plugin-unicorn@^80`, because `min-release-age` cannot resolve it; `npm ci`
reads the lockfile and is unaffected, and `--min-release-age=0` on that one command works.

## Related pages

- [Package Scripts](./package-scripts.md)
- [API](../build/api-contracts.md)
