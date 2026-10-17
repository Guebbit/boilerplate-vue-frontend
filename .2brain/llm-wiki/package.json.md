---
source: package.json
sha256: ed35363edef275c0b1f0b149d9e3de139caf73b72131964ca4e892dc988615d6
generated_at: 2026-10-16T23:57:10.874570+00:00
model: ollama:qwen3.8:27b
---

# package.json

## Purpose
Project manifest for **boilerplate-vue-frontend** (v3.0.0, private, ESM). It declares the runtime and development dependency sets, pins the Node/npm engine requirements, defines the full task surface (dev, build, test, lint, codegen, docs, container orchestration), and whitelists which packages may execute install scripts.

## Key elements
- **`type: "module"`** – All source and config files are treated as ES modules by Node and bundlers.
- **`scripts`** – The operational surface:
  - *Dev/build*: `dev` (Vite dev server), `build` (type-check + `vite build`), `preview`, `build:e2e` (build with validation flags into `dist-e2e`).
  - *Testing*: `test:unit` (Vitest), `test:e2e` (build → preview → Cypress shard runner), `test:e2e:serial` / `:antibot` / `:visual` / `:live` (targeted Cypress variants), `test:mutation` (Stryker), `test:unit:ci` (JSON reporter).
  - *Quality gates*: `lint` (ESLint, zero-warn), `prettier:check`, `lint:openapi` (Spectral), `lint:asyncapi`, `check:spec-identity`, `check:docs-references`, `check:asyncapi-types`, `check:route-table`, `check:permission-actions`.
  - *Codegen*: `gen:api` (Orval → Zod schemas, operation modules, error codes, route table), `gen:asyncapi` (Modelina → `asyncapi.generated.ts`), `gen:permission-actions` (YAML → TS), `regenerate` (all three + Prettier).
  - *Aggregates*: `complete` (full gate pipeline), `complete:light` (skips E2E), `complete:gates`, `complete:fix`.
  - *Docs*: `docs:dev` / `:build` / `:preview` (VitePress in `docs/`).
  - *Containers*: `compose*` scripts wrap `podman compose` (overridable via `CONTAINER_ENGINE`).
  - *Misc*: `prepare` (Husky), `update:all` (npm-check-updates).
- **`dependencies`** – Vue 3, Vuetify 4, Pinia, Vue Router, TanStack Query, Zod v4, Axios, CASL, Altcha (bot-proofing), Grafana Faro (observability), Tailwind CSS 4, Vue-i18n, Mermaid, Lucide icons, `@guebbit/vue-toolkit`.
- **`devDependencies`** – Vite 7, Vitest 4, Cypress 15, Stryker Mutator, ESLint 9 (+ Vue/unicorn/boundaries/a11y plugins), Prettier, Orval, AsyncAPI (parser + Modelina), VitePress, TypeScript 5.9, `start-server-and-test`, `msw`, `fast-check`, `axe-core`.
- **`engines`** – Requires Node `^24` and npm `>=11.16.0`.
- **`allowScripts`** – Explicit opt-in list of packages permitted to run postinstall/preinstall scripts (supply-chain hardening); `@scarf/scarf` is explicitly denied.

## Relationships
No graph neighbors were provided; this file is the root manifest and is referenced by tooling (Husky, CI, IDEs) rather than imported by source modules.

## Notes
- `private: true` prevents accidental `npm publish`; the package is consumed as a local project only.
- The `build` script runs `type-check-only` and `build-only` in parallel via `npm-run-all2` (`run-p`), so a type error blocks the build.
- E2E scripts follow a fixed pipeline: `build:e2e` → `vite preview` on port **8085** (strictPort) → Cypress. The `:live` variants add `CYPRESS_liveProfile=true` and target Chromium.
- `gen:api` is a chained pipeline (Orval → strip descriptions → generate operation modules → error codes → route table); running a single step out of order will produce inconsistent `contracts/rest/` artifacts. Always use `regenerate` or the individual `check:*` scripts to verify.
- The `compose` scripts default to **Podman**; set `CONTAINER_ENGINE` (e.g. `docker`) to override.
- `allowScripts` is an npm ≥ 11 feature; older npm versions ignore it, so supply-chain protection depends on the pinned npm version.
- The `prepare` script installs Husky hooks; in CI or restricted environments this may fail silently if `.git/` is absent.
