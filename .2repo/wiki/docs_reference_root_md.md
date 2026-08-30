# docs/reference/root.md

## Purpose

A reference index of every file that lives at the repository root (no parent directory). It groups them by concern—entry points, build/TypeScript, lint/format, test runners, mutation testing, and Git—and points to the deeper doc that explains each one. The file exists so that neither a human nor an AI assistant has to open or guess the role of a root-level dotfile or config.

## Key elements

- **`README.md`** – repo front door; links onward to Getting Started.
- **`index.html`** – Vite's single hand-written HTML entry; mounts the Vue app.
- **`.env-example`** – the only committed record of which env vars exist; `VITE_` prefix governs browser exposure.
- **`package.json` / `package-lock.json`** – script surface and locked dependency tree.
- **`vite.config.ts`** – plugins, `@` alias, dev-server proxy, exposed `VITE_` vars.
- **`tsconfig.json`** – solution file (project references only); delegates to `tsconfig.app.json`, `tsconfig.node.json`, `tsconfig.vitest.json`, `tsconfig.cypress.json`.
- **`eslint.config.ts` / `.prettierrc` / `.prettierignore` / `.commitlintrc.cjs`** – lint, format, and commit-message rules.
- **`vitest.config.ts` / `vitest.config.mutation.ts` / `cypress.config.ts`** – unit/component, mutation, and browser test runner configs.
- **`stryker.config.json` / `mutation-baseline.json` / `reports/stryker-incremental.json`** – mutation testing config, per-file score ratchet, and the committed Stryker cache.
- **`.gitignore`** – exclusion list; uses a `reports/*` + negation pattern to allow one committed file under `reports/`.

## Relationships

- **`package.json`** – This page documents `package.json` as the "script surface" for every `npm run` workflow in the repo, and links to `tools/package-dependencies.md` and `tools/package-scripts.md` for deeper coverage.
- **`docs/getting-started.md`** – Linked from the `README.md` row as the "Read next" target; it is the onboarding entry point that this reference page funnels readers toward.

## Notes

- The `tsconfig.json` file itself holds **no compiler settings**—it is purely a project-references aggregator. Each sub-config (`app`, `node`, `vitest`, `cypress`) carries the `lib`/`module` options its domain needs.
- `reports/stryker-incremental.json` is the **one** file under `reports/` that is committed. The `.gitignore` uses `reports/*` (not `reports/`) specifically because git will not descend into an excluded directory, which would make a `!reports/stryker-incremental.json` negation unreachable.
- `.prettierignore` excludes the generated `contracts/` directory because its bytes are asserted against a fresh Orval run; formatting them would break the assertion.
- The page explicitly notes that REST/realtime specs, Orval config, Spectral ruleset, and compose files are documented on sibling pages (`contracts.md`, `ops.md`) rather than here, even though they also sit at the root.
