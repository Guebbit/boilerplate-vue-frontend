# Repository Root

Files with no directory above them. Almost every one is a tool's entry point, sitting at the root
because the tool looks for it there by name.

::: tip Also at the root, explained elsewhere
The REST and realtime specs, the Orval config and the Spectral ruleset are on
[Contracts](./contracts.md). The compose files and `.dockerignore` are on [Ops & Assets](./ops.md).
:::

---

## The way in

| File | What it is | Read next |
|---|---|---|
| `README.md` | The repository's front door: what this boilerplate is, the commands that get it running, and where the docs live. | [Getting Started](../getting-started.md) |
| `index.html` | Vite's HTML entry point, and the only hand-written HTML in the app. Holds the favicon links and the `<div id="app">` the Vue app mounts into. | [Runtime](../tools/runtime.md) |
| `.env-example` | The template for `.env`, one commented line per variable. `.env` itself is git-ignored, so this file is the only record of which variables exist — and in a Vite app the `VITE_` prefix decides what reaches the browser bundle. | [Environment Variables](../tools/environment.md) |
| `LICENSE` | The licence this boilerplate is published under. | — |

## Build and TypeScript

| File | What it is | Read next |
|---|---|---|
| `package.json` | Dependencies and the script surface. Every workflow in this repo is an `npm run` here. | [Package Dependencies](../tools/package-dependencies.md) · [Package Scripts](../tools/package-scripts.md) |
| `package-lock.json` | The resolved dependency tree, exact versions and integrity hashes. Committed so every machine and CI runner installs the same bytes. Never hand-edited. | [Package Dependencies](../tools/package-dependencies.md) |
| `vite.config.ts` | The build: the Vue, Vuetify and Tailwind plugins, the `@` path alias, the dev-server proxy and which `VITE_` variables are exposed. | [Runtime](../tools/runtime.md) |
| `tsconfig.json` | The solution file — it holds no settings of its own, only project references to the four below. Splitting them is what lets browser code, Node tooling and two test runners each have the lib and module settings they need. | [Architecture](../theory/architecture.md) |
| `tsconfig.app.json` | The browser bundle: `src/`, DOM libs, the strict settings the app is written against. | [Architecture](../theory/architecture.md) |
| `tsconfig.node.json` | The tooling that runs in Node rather than the browser — the Vite and Vitest configs, `scripts/`. | [Package Scripts](../tools/package-scripts.md) |
| `tsconfig.vitest.json` | The unit and component suite: jsdom types on top of the app's settings. | [Unit Testing](../tools/unit-testing.md) |
| `tsconfig.cypress.json` | The browser suites, whose globals (`cy`, `Cypress`) exist in no other project. | [Component Testing](../tools/component-testing.md) · [Live E2E](../tools/live-e2e.md) |

## Lint and format

| File | What it is | Read next |
|---|---|---|
| `eslint.config.ts` | The flat config: the tier import boundaries, the Vue and TypeScript rule sets, and the `no-console` ban that makes `src/infrastructure/utils/logger.ts` the only file allowed to touch it. | [Architecture](../theory/architecture.md) |
| `.prettierrc` | Formatting: four-space tabs, single quotes, semicolons, 100 columns, no trailing commas. | [Package Scripts](../tools/package-scripts.md) |
| `.prettierignore` | What Prettier must not touch — chiefly the generated `contracts/`, whose bytes are asserted against a fresh Orval run. | [Contracts](./contracts.md) |
| `.commitlintrc.cjs` | Conventional commits, nothing custom. `.husky/commit-msg` runs it on every commit. | [Scripts & Hooks](./scripts.md) |

## Test runners

| File | What it is | Read next |
|---|---|---|
| `vitest.config.ts` | The unit and component suite — everything that can run in jsdom: pure functions, stores, composables, and single components mounted with `@vue/test-utils`. | [Unit Testing](../tools/unit-testing.md) · [Testing (overview)](../tools/testing-and-docs.md) |
| `vitest.config.mutation.ts` | The same run as Stryker drives it. Extends the base config with the parts that make no sense per-mutant removed. | [Mutation Testing](../tools/mutation-testing.md) |
| `cypress.config.ts` | Every suite that needs a real browser. Two profiles over one set of specs: the specs do not know which backend they are talking to, and `cy.resetState()` branches on a `liveProfile` flag. | [Component Testing](../tools/component-testing.md) · [Live E2E](../tools/live-e2e.md) |

## Mutation testing

| File | What it is | Read next |
|---|---|---|
| `stryker.config.json` | Which files are mutated, the concurrency, and the incremental settings. | [Mutation Testing](../tools/mutation-testing.md) |
| `mutation-baseline.json` | The per-file ratchet's record: what each file scored on a real run. A drop fails the check; an improvement is rewritten upward. | [Mutation Testing](../tools/mutation-testing.md) |
| `reports/stryker-incremental.json` | **Committed on purpose**, and the one thing under `reports/` that is — `.gitignore` excludes `reports/*` and negates this single file. It is Stryker's per-mutant cache, and committing it is what lets a pull request re-mutate only what changed instead of the whole repo. | [Incremental mode](../tools/mutation-testing.md#incremental-mode-—-what-it-is) |

## Git

| File | What it is | Read next |
|---|---|---|
| `.gitignore` | What never gets committed. Note the `reports/*` plus negation pattern: git does not descend into an excluded **directory**, so excluding `reports/` outright would make the negation unreachable. | [Mutation Testing](../tools/mutation-testing.md) |
