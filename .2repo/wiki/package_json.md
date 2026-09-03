# package.json

## Purpose

Project manifest for **boilerplate-vue-frontend** (v2.0.0, AGPL-3.0, ES modules). Defines all runtime/dev dependencies, npm scripts (dev, build, test, lint, docs, codegen), and tooling configuration that drive the Vite + Vue 3 frontend and its surrounding quality gates.

## Key elements

- **`scripts`** – ~40 npm script entries covering:
  - **Dev/build**: `dev` (Vite HMR), `build` (type-check + Vite build), `preview`.
  - **Unit tests**: `test:unit`, `test:unit:coverage` (Vitest), `test:mutation` (Stryker).
  - **E2E tests**: `test:e2e`, `test:e2e:serial`, `test:e2e:visual`, `test:e2e:live`, `test:e2e:dev`, `test:e2e:spec` — all bootstrap a `vite preview` server on port 8085 (plus an optional demo backend on port 3000) via `start-server-and-test`, then run Cypress.
  - **Linting/formatting**: `lint`, `lint:fix`, `prettier:check`, `prettier:fix`, `lint:openapi` (Spectral), `lint:asyncapi` (AsyncAPI CLI).
  - **Codegen**: `gen:api` (Orval from OpenAPI), `gen:asyncapi` (custom TSX script), `regenerate` (both + Prettier).
  - **Docs**: `docs:dev/build/preview` (VitePress), `docs:asyncapi` (AsyncAPI Studio).
  - **Containers**: `compose*` scripts wrapping `podman compose` (overridable via `CONTAINER_ENGINE`).
  - **Quality gates**: `complete` (lint + format + spec checks + build + full test suite), `complete:manual` (visual + live E2E).
- **`dependencies`** – Vue 3, Vuetify 4, Pinia, Vue Router 5, TanStack Query, Zod, Axios, Tailwind CSS 4, vue-i18n, lucide-vue-next, @guebbit toolkits, Grafana Faro (tracing/monitoring).
- **`devDependencies`** – Vite 7, Vitest 4, Cypress 15, Stryker, ESLint 9 + Vue/unicorn/accessibility plugins, Prettier, Orval, AsyncAPI CLI + Modelina, VitePress, tsx, Husky, commitlint, jsdom, MSW, fast-check, axe-core, pixelmatch/pngjs (visual diff).
- **`prepare`** – hooks Husky for git pre-commit/prepare hooks.
- **`private: true`** – prevents accidental `npm publish`.

## Relationships

- **`index.html`** – The Vite dev server (`npm run dev`) and production build (`vite build`) use `index.html` as the HTML entry point; the built output in `dist/` (or `dist-e2e/`) is what `vite preview` serves for E2E tests and `test:e2e:spec`.

## Notes

- E2E scripts hard-code port **8085** (`--strictPort`) for the Vite preview server and **3000** for the demo backend; changing either requires updating multiple scripts.
- `test:e2e` (parallel) vs `test:e2e:serial` differ in that serial runs specs sequentially and starts the demo backend, while parallel does not start the backend.
- `build:e2e` sets `VITE_VALIDATE_RESPONSES=true` and outputs to `dist-e2e/` to keep it separate from the production `dist/`.
- `compose` defaults to **podman** but can be switched to docker via the `CONTAINER_ENGINE` env var.
- The `complete` gate chain is the recommended one-command check before merging; `complete:fix` auto-fixes lint/format before re-running gates.
- `test:mutation:baseline` / `test:mutation:check` manage a Stryker mutation-testing baseline file; run `baseline` after intentional code changes that affect mutation score.
