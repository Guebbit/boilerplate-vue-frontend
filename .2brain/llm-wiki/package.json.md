---
source: package.json
sha256: 93b6a9df94e1c8da310c7ffee355379b11992d89a9655c19f73cc0f668bfb0fe
signature: 47907b2a095da44cf8f9c56cff4a43274528c812e02ae17bc44685290eb99468
generated_at: 2026-11-10T02:18:12.954388+00:00
model: ollama:qwen3.8:27b
---

# package.json

## Purpose

Project manifest for **boilerplate-vue-frontend** (v3.0.0, private, AGPL-3.0-or-later). Declares the Vue 3 / Vite / Vuetify / Tailwind CSS frontend stack, defines every npm script (dev, build, test, lint, codegen, audit, docs, container), pins engine requirements (Node ^24, npm ≥ 11.16), and controls which transitive dependencies are permitted to run install-time scripts via `allowScripts`.

## Key elements

- **`scripts`** — the operational surface of the project. Notable groups:
  - *Build & dev*: `dev`, `build` (type-check + `build-only`), `build:e2e` (build with validation env flags into `dist-e2e`).
  - *Testing*: `test:unit` (Vitest), `test:e2e` (Cypress via `start-server-and-test`), `test:e2e:visual` / `:antibot` / `:serial` / `:live` / `:dev` variants, `test:mutation` (Stryker), `test:lighthouse` (perf).
  - *Codegen*: `gen:api` (Orval → Zod schemas, operation modules, error codes, route table), `gen:asyncapi`, `gen:permission-vocabulary`, `gen:shared-rules`, `regenerate` (all + Prettier).
  - *Contracts & checks*: `lint:openapi` (Spectral), `lint:asyncapi`, `check` (verifies generated artifacts are in sync with spec sources).
  - *Quality gates*: `complete` (lint + Prettier + gates), `complete:light` (subset skipping e2e/lighthouse), `complete:fix` (auto-fix then verify).
  - *Audit*: design-manual capture/plan/check, CSS invasiveness, unused locale keys, shallow candidates (Knip), duplicates (JScPD).
  - *Infra*: `compose` / `compose:restart` / `compose:rebuild` (Podman/Compose), `backend:demo`, `docs:*` (VitePress).
- **`dependencies`** — runtime packages: Vue 3, Pinia, Vue Router, Vuetify 4, Tailwind 4, TanStack Query, Zod, Axios, CASL, i18n, lucide icons, Mermaid, QRCode, zxcvbn-ts (password strength), Altcha (CAPTCHA), Grafana Faro (telemetry).
- **`devDependencies`** — tooling: Vite 7, Vitest 4, Cypress 15, Stryker 9, Lighthouse 13, ESLint 9 (+ Vue, boundaries, unicorn, a11y plugins), Prettier, TypeScript 5.9, Orval, AsyncAPI Modelina/Parser, Spectral, Knip, JScPD, MSW, jsdom, Husky, `start-server-and-test`, `cross-env`, `npm-run-all2`, VitePress.
- **`overrides`** — pins `katex` to `^0.18.2` for the entire tree.
- **`engines`** — Node `^24`, npm `>=11.16.0`.
- **`allowScripts`** — whitelists install scripts for a handful of packages (esbuild, fsevents, cypress, msw, etc.) and explicitly **denies** `@parcel/watcher` and `@scarf/scarf`.
- **`prepare`** — installs Husky git hooks on `npm install`.

## Relationships

No graph neighbors are recorded for this file. It is the root manifest; all other files in the repo are reachable through its scripts and dependency declarations.

## Notes

- **`type: "module"`** — all `.ts`/`.js` files in the repo are ESM. Scripts use `tsx` to execute TypeScript directly (no build step for tooling).
- **`build` runs type-check first** (`run-p type-check-only "build-only {@}" --`). A type error blocks the build even if Vite would succeed.
- **E2E builds are separate** (`build:e2e` → `dist-e2e`) and inject `VITE_VALIDATE_RESPONSES/REQUESTS`, `VITE_CONTRACT_THROW`, `VITE_TEST_CARDS` — do not mix these artifacts with the production `dist/`.
- **`complete` vs `complete:light`**: `complete:light` skips full e2e and lighthouse, swapping them for `type-check-only` + `test:unit`. Use `complete:light` for fast iteration, `complete` before merging.
- **`check` is a sync guard**: it runs each codegen script with `--check` and exits non-zero if generated files differ from the spec sources. Run `regenerate` to update, then `check` will pass.
- **`allowScripts`** is a non-standard (pnpm-corepack / custom) field controlling `lifecycle` scripts. `@parcel/watcher` and `@scarf/scarf` are explicitly blocked.
- **`lint` allocates 8 GB** (`--max-old-space-size=8192`) — running it in memory-constrained CI may require the same flag or a larger runner.
- **Husky + commitlint** are wired via `prepare` and `@commitlint/*` devDependencies; conventional-commit messages are enforced at git-hook time.
