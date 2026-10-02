---
source: package.json
sha256: 45dc5240b97c38d964315f216458c3615f64d462ab935c04ea79e5ee223cc1e4
generated_at: 2026-10-02T14:33:30.778080+00:00
model: ollama:qwen3.8:27b
---

# package.json

## Purpose
Manifest for the `boilerplate-vue-frontend` project (v2.1.0, private, AGPL-3.0). Defines the dependency set, all npm scripts (dev, build, test, lint, contract generation, container orchestration, docs), and engine/tooling constraints. Serves as the single entry point for every task in the repo.

## Key elements
- **`scripts`** — ~60 named tasks grouped by concern:
  - *Dev/build:* `dev`, `build` (type-check + `vite build`), `preview`, `build:e2e` (sets validation env flags).
  - *Testing:* `test:unit` / `test:unit:coverage` (Vitest), `test:e2e*` variants (Cypress; serial, antibot, visual, live, dev), `test:mutation` (Stryker), `test:report`.
  - *Lint/format:* `lint`, `lint:fix`, `lint:openapi` (Spectral), `lint:asyncapi`, `prettier:check` / `prettier:fix`.
  - *Contract generation & checks:* `gen:api` (Orval → Zod schemas, operation modules, error codes, route table), `gen:asyncapi`, `gen:permission-actions`, `regenerate`, and corresponding `check:*` scripts.
  - *Quality gates:* `complete` (full), `complete:light` (skips e2e), `complete:fix`, `complete:gates`, `complete:manual`.
  - *Container/docs:* `compose*` (podman/docker), `docs:dev/build/preview` (VitePress).
- **`dependencies`** — Runtime: Vue 3, Vuetify 4, Pinia, Vue Router, TanStack Query, Zod, axios, Tailwind CSS 4, i18n, CASL, zxcvbn, altcha, Grafana Faro (observability).
- **`devDependencies`** — Build/test tooling: Vite 7, TypeScript 5.9, Vitest 4, Cypress 15, Stryker, Orval, AsyncAPI parser/modelina, ESLint 9 + Vue/TS/unicorn/boundaries plugins, Prettier, Husky, start-server-and-test, MSW, fast-check, pixelmatch/pngjs (visual diffs), VitePress.
- **`type: "module"`** — ESM throughout.
- **`engines`** — Requires Node `^24`.
- **`allowScripts`** — Whitelist of packages permitted to run postinstall/lifecycle scripts (cypress, esbuild, msw, vue-demi, etc.); `@scarf/scarf` explicitly denied.

## Relationships
No graph neighbors were provided.

## Notes
- `build` runs `vue-tsc --build --force` in parallel with `vite build` via `npm-run-all2`; a type error fails the build.
- `build:e2e` builds into `dist-e2e` with `VITE_VALIDATE_RESPONSES=true` and `VITE_VALIDATE_REQUESTS=true`, enabling runtime contract validation only in e2e.
- The `complete` / `complete:light` scripts are the canonical CI gates; `complete:light` swaps full tests for `type-check-only` + `test:unit` and omits the full `build` step.
- E2E specs are split by glob: `*.antibot.cy.ts`, `*.visual.cy.ts`, and everything else. The `test:e2e:dev` script opens the interactive Cypress runner against a live dev server.
- `gen:api` is a multi-step pipeline (Orval → strip descriptions → operation modules → error codes → route table); run `regenerate` to redo all three contract sources in one shot.
- `allowScripts` is a pnpm-style field; if the project is installed with plain npm, these entries are inert.
- `compose` defaults to `podman` but honours the `CONTAINER_ENGINE` env var.
