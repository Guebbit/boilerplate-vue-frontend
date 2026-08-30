# package.json

## Purpose

Project manifest for **boilerplate-vue-frontend** (v2.0.0, private, AGPLv3.0). Defines all npm scripts (dev server, builds, testing, linting, code generation, docs, container management), runtime dependencies (Vue 3 ecosystem + Vuetify + Tailwind CSS + TanStack Query), and dev dependencies (Vite, Vitest, Cypress, Stryker, ESLint, Prettier, VitePress, code-gen tooling). The `"type": "module"` field makes the project an ES module package.

## Key elements

- **`scripts`** — ~40 npm scripts organized into groups:
  - *Dev/build*: `dev`, `build` (parallel type-check + Vite build), `preview`, `build:e2e` (builds with `VITE_VALIDATE_RESPONSES=true`).
  - *Unit tests*: `test:unit`, `test:unit:coverage` (Vitest), `test:unit:report` (JSON report to `reports/test-report.json`).
  - *E2E tests*: `test:e2e` (sharded via `run-e2e-shards.ts`), `test:e2e:serial`, `test:e2e:visual` / `:visual:update` (Cypress + pixelmatch), `test:e2e:live` (`CYPRESS_liveProfile=true`), `test:e2e:dev` (Cypress open against dev server), `test:e2e:spec` (env-var driven spec path).
  - *Mutation testing*: `test:mutation` (Stryker), `test:mutation:check` / `:baseline`.
  - *Lint / format*: `lint` (ESLint, zero warnings), `lint:openapi` (Spectral), `lint:asyncapi` (AsyncAPI CLI), `prettier:check` / `:fix`.
  - *Code generation*: `gen:api` (orval → REST client), `gen:asyncapi` (modelina → `src/types/asyncapi.generated.ts`), `regenerate` (both + Prettier), `check:asyncapi-types`.
  - *Docs*: `docs:dev` / `:build` / `:preview` (VitePress on `docs/`), `docs:asyncapi` (AsyncAPI Studio).
  - *Containers*: `compose`, `compose:restart`, `compose:rebuild`, `compose:kill` (uses `${CONTAINER_ENGINE:-podman}`).
  - *Quality gates*: `complete` (lint + Prettier + all gates), `complete:gates` (spec lints + type check + build + full test suite), `complete:fix`, `complete:manual` (visual + live E2E).
  - *Misc*: `prepare` (Husky install), `update:all` (npm-check-updates), `check:spec-identity`.
- **`dependencies`** — Vue 3, Vuetify 4, Pinia, vue-router, vue-i18n, Tailwind CSS 4, TanStack Query, axios, zod, lodash-es, lucide icons, Grafana Faro (observability), `@guebbit/*` internal toolkits.
- **`devDependencies`** — Vite 7, Vitest 4, Cypress 15, Stryker 9, ESLint 9 (+ Vue/unicorn/vitest plugins), Prettier, VitePress, orval, AsyncAPI CLI/Modelina, Spectral, Stryker, `start-server-and-test`, `npm-run-all2`, Husky, commitlint, msw, fast-check, axe-core/cypress-axe, pixelmatch/pngjs, `@tsconfig/node22`.

## Relationships

- **`eslint.config.ts`** — loaded by every `lint` / `lint:fix` script (`eslint --max-warnings 0`).
- **`contracts/rest/index.ts`** — source of truth for the OpenAPI spec consumed by `gen:api` (orval) and `lint:openapi` (Spectral).
- **`docs/` (all VitePress pages)** — built and served by the `docs:*` scripts; the docs reference the npm scripts described in this file (e.g., `docs/getting-started.md`, `docs/tools/*.md`, `docs/api/openapi-workflow.md`, `docs/api/asyncapi-workflow.md`).
- **`README.md` / `CHANGELOG.md`** — project-level documentation that assumes the scripts defined here exist; version bump to 2.0.0 is tracked in the changelog.

## Notes

- **`build` runs type-check and Vite build in parallel** via `run-p` (`npm-run-all2`); a type error fails the build even if Vite succeeds.
- **E2E scripts always build first** (`build:e2e` → `dist-e2e/`) and then launch a `vite preview` server on **port 8085** with `--strictPort`. The serial/visual/live variants additionally start a demo backend on **port 3000** via `npm run backend:demo`.
- **Visual regression** uses `pixelmatch` + `pngjs` with snapshot comparison; `test:e2e:visual:update` regenerates baselines.
- **Container engine is swappable**: the `compose` scripts default to `podman` but respect `$CONTAINER_ENGINE` (e.g., set to `docker`).
- **`"private": true`** — this package is never published to a registry.
- **Husky** is wired via the `prepare` script, so git hooks activate automatically on `npm install`.
- The `complete` / `complete:gates` scripts are the canonical CI gate pipeline; prefer them over running individual scripts in CI.
