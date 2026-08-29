# Scripts & Hooks

`scripts/` is the repo's own tooling: every file here is the implementation behind an `npm run`
entry, and none of it ships in the bundle. `.husky/` holds the git hooks.

Every script's user-facing name and when to run it is on
[Package Scripts](../tools/package-scripts.md). This page says what each _file_ is.

Several of these are **mirrors of the backend's**, byte-identical or near enough that a plain
`diff` is the right way to compare them. Where that is true it is called out, because changing one
copy and not the other is how the two repos drift.

## How these are named

The filename says what the file does to what, in the same words its `npm run` entry uses. A file
that executes leads with a verb; a file that is only ever imported is a noun phrase, so the two are
distinguishable in a directory listing without opening either.

| Prefix      | The file                                                        |
| ----------- | --------------------------------------------------------------- |
| `check-`    | verifies and writes nothing — the exit code is the whole answer |
| `build-`    | produces a **committed** artifact                               |
| `generate-` | produces a **gitignored** artifact                              |
| `run-`      | starts a process or drives a tool                               |
| `report-`   | turns machine output into a human summary, and never fails      |
| `export-`   | writes a data file                                              |
| `sync-`     | writes into the paired repo                                     |
| _(no verb)_ | a library — imported by the above, never invoked                |

The same words are used in `boilerplate-node-backend`, and in `boilerplate-php-laravel-backend`,
whose Artisan command classes are the StudlyCase spelling of these names. Abbreviations are a lint error
(`unicorn/prevent-abbreviations` checks filenames too), so write `directory`, not `dir`.

---

## Cross-repo pairing

| File                                 | What it is                                                                                                                                                                                                                                 | Read next                                        |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| `scripts/cypress-spec-globs.ts`      | Where the Cypress specs live, as the one definition `cypress.config.ts`, `eslint.config.ts` and the shard runner all read. `package.json` cannot import it, so a spec asserts its five `--spec` arguments resolve to the same files.       | [Package Scripts](../tools/package-scripts.md)   |
| `scripts/paired-backend-path.ts`     | Where the paired backend is expected to be — a sibling checkout by default, overridable by environment. The mirror of the backend's `paired-frontend-path.ts`, pointed the other way.                                                      | [Package Scripts](../tools/package-scripts.md)   |
| `scripts/spec-identity.ts`           | The cross-repo check itself: which files must be identical in both repos, which side owns each, and the comparison. Mirrors the backend's copy; only the "which repo am I" constant differs.                                               | [Contracts](./contracts.md)                      |
| `scripts/check-spec-identity.ts`     | Its CLI — `npm run check:spec-identity`. Degrades to a warning when the sibling is not on disk, because a half-cloned pair should still be able to commit, and is fatal under `CI` where a missing sibling means a misconfigured workflow. | [Contracts](./contracts.md)                      |
| `scripts/generate-asyncapi-types.ts` | Generates `src/types/asyncapi.generated.ts` from `asyncapi.yaml`. **Byte-identical with the backend's copy** — change it in one repo and copy it to the other, or the outputs drift. What differs is the input, not the script.            | [AsyncAPI Workflow](../api/asyncapi-workflow.md) |

## Running the real backend

| File                          | What it is                                                                                                                                                                                                                 | Read next                                |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `scripts/run-backend-demo.ts` | Boots the paired backend's demo profile from this repo, resolving the sibling checkout the same way the identity check does. What makes `npm run dev` and the e2e suite talk to a real API instead of a hand-written mock. | [Demo profile](../tools/demo-profile.md) |
| `scripts/run-e2e-shards.ts`   | Runs the Cypress specs in parallel shards against one preview server, each shard with its own backend. The reason a full e2e pass is minutes rather than tens of them.                                                     | [Live E2E](../tools/live-e2e.md)         |

## Mutation testing

All three mirror the backend's.

| File                                 | What it is                                                                                                                                                          | Read next                                        |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `scripts/run-mutation-tests.ts`      | Runs Stryker — `npm run test:mutation`. A wrapper rather than a bare invocation, so machine-specific settings come from `.env` and an explicit CLI flag still wins. | [Mutation Testing](../tools/mutation-testing.md) |
| `scripts/mutation-baseline.ts`       | The per-file ratchet: the recorded score for each file, and the comparison that fails when one drops. Nothing here ever lowers a baseline on its own.               | [Mutation Testing](../tools/mutation-testing.md) |
| `scripts/check-mutation-baseline.ts` | Its CLI — compare, or record a new floor with `--update`.                                                                                                           | [Mutation Testing](../tools/mutation-testing.md) |

## Diagnostics

| File                             | What it is                                                                                       | Read next                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| `scripts/report-test-results.ts` | Turns a runner's JSON report into which **module** a failure belongs to and where the time went. | [Testing (overview)](../tools/testing-and-docs.md) |

## Git hooks

| File                | What it is                                                           | Read next                                      |
| ------------------- | -------------------------------------------------------------------- | ---------------------------------------------- |
| `.husky/pre-commit` | Runs the local gate before a commit is written.                      | [Package Scripts](../tools/package-scripts.md) |
| `.husky/commit-msg` | Runs commitlint, so every message is a conventional commit.          | [Repository Root](./root.md)                   |
| `.husky/.gitignore` | Husky's own — keeps the wrappers it generates out of the repository. | —                                              |
