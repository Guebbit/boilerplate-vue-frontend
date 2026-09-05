# Scripts & Hooks

`scripts/` is the repo's own tooling: every file here is the implementation behind an `npm run`
entry, and none of it ships in the bundle. `.husky/` holds the git hooks.

Every script's user-facing name and when to run it is on
[Package Scripts](../tools/package-scripts.md). This page says what each _file_ is.

Several of these have a **counterpart in the backend**, and each one says in its header which kind
it is: byte-identical (`contracts/generate-asyncapi-types.ts`, `testing/report-results.ts`), or the
same shape with stated differences (everything under `pairing/` and `mutation/`). Nothing enforces
either — `diff` is the tool, and changing one copy without the other is how the two repos drift.

## How these are organised

**The folder says the subject. The filename says the action.** One folder per problem this repo has
tooling for, so `ls scripts/` reads as a list of problems rather than a list of verbs.

```
scripts/
├── contracts/   the types generated off the contract this repo receives
├── pairing/     keeping this repo and the paired backend in step
├── demo/        booting the paired backend's demo profile from here
├── e2e/         the Cypress shard runner, its balancer and the spec globs
├── mutation/    the Stryker run and the per-file ratchet
└── testing/     everything else that reads a test suite
```

The folder's word is not repeated in the filename: `scripts/mutation/run-tests.ts`, not
`run-mutation-tests.ts`. Deliberately NOT aligned with the `npm run` namespaces — those group by
_when you run a thing_, these group by _what it is about_.

The backend carries the same folders, minus `e2e/` and plus a `docs/`, so a mirrored file sits at
the same path in both checkouts.

## How these are named

| Prefix      | The file                                                                       |
| ----------- | ------------------------------------------------------------------------------ |
| `check-`    | verifies and writes nothing — the exit code is the whole answer                |
| `generate-` | produces an artifact, committed or not — `.gitignore` is where that is decided |
| `run-`      | starts a process or drives a tool                                              |
| `report-`   | turns machine output into a human summary, and never fails                     |
| `sync-`     | writes into the paired repo                                                    |
| _(no verb)_ | a library — imported by the above, never invoked                               |

**An executable carries a shebang and leads with a verb. A library carries neither.** Both halves,
so the split is greppable rather than a naming habit: `head -1` says which a file is.

The same words are used in `boilerplate-node-backend`, and in `boilerplate-php-laravel-backend`,
whose Artisan command classes are the StudlyCase spelling of these names. Abbreviations are a lint error
(`unicorn/prevent-abbreviations` checks filenames too), so write `directory`, not `dir`.

---

## Cross-repo pairing — `scripts/pairing/` and `scripts/contracts/`

| File                                           | What it is                                                                                                                                                                                                                                                 | Read next                                        |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `scripts/pairing/paired-backend-path.ts`       | Where the paired backend is expected to be — a sibling checkout by default, overridable by environment. The mirror of the backend's `paired-frontend-path.ts`, pointed the other way.                                                                      | [Package Scripts](../tools/package-scripts.md)   |
| `scripts/pairing/spec-identity.ts`             | The cross-repo check itself: which files must be identical in both repos, which side owns each, and the comparison. Same list and same comparison as the backend's copy; `THIS_REPO` differs, and this side adds the `fingerprint` the twin backends need. | [Contracts](./contracts.md)                      |
| `scripts/pairing/check-spec-identity.ts`       | Its CLI — `npm run check:spec-identity`. Degrades to a warning when the sibling is not on disk, because a half-cloned pair should still be able to commit, and is fatal under `CI` where a missing sibling means a misconfigured workflow.                 | [Contracts](./contracts.md)                      |
| `scripts/contracts/generate-asyncapi-types.ts` | Generates `src/types/asyncapi.generated.ts` from `asyncapi.yaml`. **Byte-identical with the backend's copy** — change it in one repo and copy it to the other, or the outputs drift. What differs is the input, not the script.                            | [AsyncAPI Workflow](../api/asyncapi-workflow.md) |

## Running the real backend — `scripts/demo/`

| File                                | What it is                                                                                                                                                                                                                 | Read next                                |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `scripts/demo/run-backend.ts`       | Boots the paired backend's demo profile from this repo, resolving the sibling checkout the same way the identity check does. What makes `npm run dev` and the e2e suite talk to a real API instead of a hand-written mock. | [Demo profile](../tools/demo-profile.md) |
| `scripts/demo/scratch-directory.ts` | A disk-backed `TMPDIR` for every backend this repo spawns, removed however the run ends — otherwise a killed `mongodb-memory-server` leaves ~200 MB in tmpfs each time.                                                    | [Live E2E](../tools/live-e2e.md)         |

## End-to-end — `scripts/e2e/`

| File                                | What it is                                                                                                                                                             | Read next                                      |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `scripts/e2e/run-shards.ts`         | Runs the Cypress specs in parallel shards against one preview server, each shard with its own backend. The reason a full e2e pass is minutes rather than tens of them. | [Live E2E](../tools/live-e2e.md)               |
| `scripts/e2e/shard-balancer.ts`     | The pure half of the runner: the measured-duration table and the LPT bin-packing that assigns specs to shards. Split out so the algorithm can be unit tested.          | [Live E2E](../tools/live-e2e.md)               |
| `scripts/e2e/cypress-spec-globs.ts` | Where the Cypress specs live, as the one definition `cypress.config.ts`, `eslint.config.ts` and the shard runner all read.                                             | [Package Scripts](../tools/package-scripts.md) |

## Mutation testing — `scripts/mutation/`

All three have a backend counterpart of the same shape. None is byte-identical: the backend runs a
second, deeper scope that this repo has no equivalent for.

| File                                 | What it is                                                                                                                                                          | Read next                                        |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `scripts/mutation/run-tests.ts`      | Runs Stryker — `npm run test:mutation`. A wrapper rather than a bare invocation, so machine-specific settings come from `.env` and an explicit CLI flag still wins. | [Mutation Testing](../tools/mutation-testing.md) |
| `scripts/mutation/baseline.ts`       | The per-file ratchet: the recorded score for each file, and the comparison that fails when one drops. Nothing here ever lowers a baseline on its own.               | [Mutation Testing](../tools/mutation-testing.md) |
| `scripts/mutation/check-baseline.ts` | Its CLI — compare, or record a new floor with `--update`.                                                                                                           | [Mutation Testing](../tools/mutation-testing.md) |

## Testing — `scripts/testing/`

| File                                | What it is                                                                                       | Read next                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| `scripts/testing/report-results.ts` | Turns a runner's JSON report into which **module** a failure belongs to and where the time went. | [Testing (overview)](../tools/testing-and-docs.md) |

## Git hooks

| File                | What it is                                                           | Read next                                      |
| ------------------- | -------------------------------------------------------------------- | ---------------------------------------------- |
| `.husky/pre-commit` | Runs the local gate before a commit is written.                      | [Package Scripts](../tools/package-scripts.md) |
| `.husky/commit-msg` | Runs commitlint, so every message is a conventional commit.          | [Repository Root](./root.md)                   |
| `.husky/.gitignore` | Husky's own — keeps the wrappers it generates out of the repository. | —                                              |
