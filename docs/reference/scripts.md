# Scripts & Hooks

`scripts/` is the repo's own tooling: every file here is the implementation behind an `npm run`
entry, and none of it ships in the bundle. `.husky/` holds the git hooks.

Every script's user-facing name and when to run it is on
[Package Scripts](../tools/package-scripts.md). This page says what each *file* is.

Several of these are **mirrors of the backend's**, byte-identical or near enough that a plain
`diff` is the right way to compare them. Where that is true it is called out, because changing one
copy and not the other is how the two repos drift.

---

## Cross-repo pairing

| File | What it is | Read next |
|---|---|---|
| `scripts/spec-globs.ts` | Where the Cypress specs live, as the one definition `cypress.config.ts`, `eslint.config.ts` and the shard runner all read. `package.json` cannot import it, so a spec asserts its five `--spec` arguments resolve to the same files. | [Package Scripts](../tools/package-scripts.md) |
| `scripts/backend-path.ts` | Where the paired backend is expected to be — a sibling checkout by default, overridable by environment. The mirror of the backend's `frontend-path.ts`, pointed the other way. | [Package Scripts](../tools/package-scripts.md) |
| `scripts/spec-identity.ts` | The cross-repo check itself: which files must be identical in both repos, which side owns each, and the comparison. Mirrors the backend's copy; only the "which repo am I" constant differs. | [Contracts](./contracts.md) |
| `scripts/check-spec-identity.ts` | Its CLI — `npm run check:spec-identity`. Degrades to a warning when the sibling is not on disk, because a half-cloned pair should still be able to commit, and is fatal under `CI` where a missing sibling means a misconfigured workflow. | [Contracts](./contracts.md) |
| `scripts/gen-asyncapi-types.ts` | Generates `src/types/asyncapi.generated.ts` from `asyncapi.yaml`. **Byte-identical with the backend's copy** — change it in one repo and copy it to the other, or the outputs drift. What differs is the input, not the script. | [AsyncAPI Workflow](../api/asyncapi-workflow.md) |

## Module documentation

| File | What it is | Read next |
|---|---|---|
| `scripts/gen-module-documentation.ts` | The CLI — `npm run docs:modules`, or `--check` in the gate. Boots a Vite dev server so the manifests load the way the app loads them, and resolves `pinia` through node so the stores it instantiates share one active instance. | [Modules](../modules/) |
| `scripts/module-docs/facts.ts` | Reads every manifest, route record, store and response-schema row into the facts a page states. Nothing here is transcribed by hand. | [Modules](../modules/) |
| `scripts/module-docs/blocks.ts` | Renders the eight generated blocks of one module page. Mirrors the backend's copy on the idea: **State** is a store instead of a collection, **Screens** are routes instead of endpoints. | [Modules](../modules/) |
| `scripts/module-docs/overview.ts` | Renders the whole-map blocks — the context map, the legend, the matrix, the pairing table — plus the route table on [Sitemap](../theory/sitemap.md). | [Modules](../modules/) |
| `scripts/module-docs/shapes.ts` | The catalogue of file shapes a module folder may contain. A file matching none of them fails `check:module-docs` by name, which is what stops a new shape being invisible. | [File Glossary — Modules](./src-modules.md) |
| `scripts/module-docs/pairing.ts` | Which **backend** module each domain here answers, or a sentence saying why none does. The only file in this repo that names a domain on the other side. | [Modules](../modules/index.md#the-two-repositories) |
| `scripts/module-docs/subpages.ts` | The sub-pages a module has earned. Declared rather than discovered, so a declared page that was never written is a failure rather than a gap. | [Modules](../modules/) |
| `scripts/module-docs/index.ts` | Assembles the pages, runs them through prettier so the generator is the file's only writer, and holds the result to five coverage rules. | [Adding & removing a module](../theory/module-lifecycle.md) |

## Running the real backend

| File | What it is | Read next |
|---|---|---|
| `scripts/run-backend-demo.ts` | Boots the paired backend's demo profile from this repo, resolving the sibling checkout the same way the identity check does. What makes `npm run dev` and the e2e suite talk to a real API instead of a hand-written mock. | [Demo profile](../tools/demo-profile.md) |
| `scripts/e2e-shard.ts` | Runs the Cypress specs in parallel shards against one preview server, each shard with its own backend. The reason a full e2e pass is minutes rather than tens of them. | [Live E2E](../tools/live-e2e.md) |

## Mutation testing

All three mirror the backend's.

| File | What it is | Read next |
|---|---|---|
| `scripts/mutation.ts` | Runs Stryker — `npm run test:mutation`. A wrapper rather than a bare invocation, so machine-specific settings come from `.env` and an explicit CLI flag still wins. | [Mutation Testing](../tools/mutation-testing.md) |
| `scripts/mutation-baseline.ts` | The per-file ratchet: the recorded score for each file, and the comparison that fails when one drops. Nothing here ever lowers a baseline on its own. | [Mutation Testing](../tools/mutation-testing.md) |
| `scripts/check-mutation-baseline.ts` | Its CLI — compare, or record a new floor with `--update`. | [Mutation Testing](../tools/mutation-testing.md) |

## Diagnostics

| File | What it is | Read next |
|---|---|---|
| `scripts/test-report.ts` | Turns a runner's JSON report into which **module** a failure belongs to and where the time went. | [Testing (overview)](../tools/testing-and-docs.md) |

## Git hooks

| File | What it is | Read next |
|---|---|---|
| `.husky/pre-commit` | Runs the local gate before a commit is written. | [Package Scripts](../tools/package-scripts.md) |
| `.husky/commit-msg` | Runs commitlint, so every message is a conventional commit. | [Repository Root](./root.md) |
| `.husky/.gitignore` | Husky's own — keeps the wrappers it generates out of the repository. | — |
