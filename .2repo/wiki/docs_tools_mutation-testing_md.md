# docs/tools/mutation-testing.md

## Purpose

Documents the mutation-testing setup in this repo (Stryker + Vitest), the glossary of its reporting terms, the per-file ratchet workflow, and the operational constraints (static mutants, setup-cost multiplication, exclusion of e2e) that differ from plain unit coverage. It exists so a developer or AI assistant can reason about *why* a mutation score is what it is and *what is safe to change* without reading the full narrative.

## Key elements

- **Glossary table** — precise definitions of *mutant*, *killed*, *survived*, *no coverage*, *timeout*, *mutation score*, *break threshold*, *baseline / ratchet*, *nightly*, *concurrency*, *`coverageAnalysis: perTest`*, *static mutant*, and *incremental*.
- **Tools** — Stryker (mutant generation/scoring) and `@stryker-mutator/vitest-runner` (drives Vitest via `vitest.config.mutation.ts`).
- **Per-file ratchet** — `mutation-baseline.json` records each file's score; regressions fail the build, improvements are written back.
- **Nightly workflow** — GitHub Actions cron at 03:00 UTC; nothing blocks on it; passes `--force` to skip incremental cache.
- **Static-mutant warning** — code that executes at `import` time (module-scope constructors, config objects) forces a full-suite run per mutant; identified as the single biggest cost in this repo.
- **Setup-cost multiplication rule** — anything in `beforeAll` is paid once per file *per mutant*; the paired backend's OOM loop is cited as the cautionary example.
- **E2e exclusion** — Cypress suite is never mutated (requires dev server + browser); `.vue` files are not yet in `mutate`.
- **OOM immunity note** — this repo uses no ts-jest / TypeScript LanguageService, so it does not accumulate per-mutant memory the way the paired backend does.

## Relationships

- **`docs/index.md`** — Links to this page as one entry in the tools section; provides the navigation context.
- **`docs/tools/component-testing.md`** — Sibling tool doc; together they describe the two complementary testing strategies (assertion-based vs. mutation-based) for the same codebase.
- **`docs/tools/observability.md`** — Sibling tool doc; no direct interaction, but both are referenced from the same tools index and may share CI pipeline conventions.
- **`docs/tools/package-dependencies.md`** — Where `stryker`, `@stryker-mutator/vitest-runner`, and related devDependencies are catalogued; this page references those packages by name but the install/version details live in the dependencies doc.

## Notes

- The `break threshold` is explicitly *not* a target — it is a collapse backstop. Do not read a passing threshold as "good enough."
- "No coverage" mutants cost zero time (Stryker skips them), so untested files are cheap to keep in scope; "survived" mutants are the actual finding.
- Incremental mode is enabled by default; the nightly `--force` flag rebuilds the full result set, so local runs will be faster than the nightly report.
- The page references a paired backend repo (`Guebbit/boilerplate-node-backend`) for the full OOM-loop write-up; that content is external and not reproduced here.
