# tsconfig.vitest.json

## Purpose

TypeScript project configuration for the Vitest test environment. It extends `tsconfig.app.json` to add test-specific file inclusions, type declarations (jsdom, node), and exclusions so that running `tsc` against this config type-checks all unit tests, their imports, and the source they exercise—while deliberately excluding Cypress e2e specs that would otherwise produce `cy.*` errors.

## Key elements

- **`extends: "./tsconfig.app.json"`** — Inherits the app's compiler options; this file only layers test-specific concerns on top.
- **`include`** — Adds `contracts/rest`, all of `src/**`, `tests/unit/**`, `tests/support/**`, `tests/cross-cutting/**`, module co-located specs, and `scripts/**/*.ts`. The `scripts/**` entry is load-bearing (not just tidy) because `tests/unit/scripts/spec-identity.spec.ts` imports from it; omitting it triggers TS6307.
- **`exclude`** — Removes `tests/support/e2e/**` and `src/modules/*/tests/e2e/**`. Without this, every `cy.*` call in co-located e2e specs would be an unresolved-symbol error in the Vitest type-check, since this project does not load Cypress ambient types.
- **`composite: true` + `tsBuildInfoFile`** — Enables incremental project-referenced builds; build info is cached under `node_modules/.tmp/`.
- **`lib`** — `ESNext` + `DOM` (jsdom provides a DOM at test runtime).
- **`types`** — `vite/client`, `node`, `jsdom`; notably does **not** include `cypress` or `vitest` global types (those arrive via imports or other configs).

## Relationships

- **Extends `./tsconfig.app.json`**, which itself is part of the project reference chain rooted at `tsconfig.json`. Changes to `tsconfig.json` compiler options therefore propagate here through `tsconfig.app.json`.
- **Coexists with `tsconfig.node.json`** for `scripts/**`: the node config checks `vite.config.ts` and CLI entry points; this config includes the same directory only because a unit test imports from it.
- **Coexists with `tsconfig.cypress.json`**, which is responsible for type-checking the e2e specs excluded here.

## Notes

- The two in-comment explanations (the `scripts/**` inclusion and the `exclude` block) document *why* those lines are load-bearing. Removing either silently breaks type-checking in non-obvious ways (TS6307 for the former, `cy.*` errors for the latter).
- `types` lists `jsdom` but not `vitest`; test globals (e.g. `describe`, `it`) are expected to be imported explicitly or provided by the Vitest runtime, not by this config's ambient type set.
- This is a **composite** project, so it participates in `tsc -b` builds; the `tsBuildInfoFile` path lives inside `node_modules` and is gitignored by convention.
