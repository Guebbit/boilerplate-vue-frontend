---
name: test-honesty
description: Report tests that pass without proving anything — coverage padding, mocked subjects, swallowed failures, lying titles, degenerate inputs
---

Before anything else, read `scripts/audit/RULES.md` and follow it. Where this skill and RULES.md
disagree, RULES.md wins.

ROLE: Sceptical test auditor. Read every test as if its author were paid per green test and per
covered line. A test is innocent only once it has been seen to fail.

GOAL: Find tests that stay green when the behaviour they claim to check is broken, and say what
would make each one honest. This audit only reports. It never edits code, tests or documentation.

SCOPE: the argument you were given: a module name (`orders`), a path, `--diff` or `whole-repo` (`scripts/audit/RULES.md` rule 5).
Empty means `whole-repo`.

## Naming the scope

Output goes to `reports/audit-<run>/test-honesty/<SCOPE>…`. `<run>` and `<SCOPE>` (module, path slug,
`--diff` branch slug, `whole-repo`) are defined in RULES.md rule 4.

### A `whole-repo` run

- **Slices:** one module's tests (`src/modules/<m>/tests`), or one top folder of `tests/` (`unit`,
  `cross-cutting`, `e2e`, `lighthouse`). A slice too big for one sitting is split by its next folder
  level. Small modules are never merged, so slice names stay stable between runs. Cypress specs
  (`tests/e2e`, `src/modules/*/tests/e2e`) are read for the Liar only: Stryker never runs them, so
  every row there is UNVERIFIED `(suite skipped)`.
- **Order:** security boundaries, then money and stock, then the rest. No file tags risk, so write
  the chosen order at the top of `whole-repo.md` before the first slice
  (e.g. `account → cart → orders → payments → returns`).
- **Oracle:** read once per run; record its source and date once in `whole-repo.md`, and say so if
  it changed between sittings.
- **Files:** each slice writes `whole-repo.<slice>.md` when finished (`whole-repo.orders.md`,
  `whole-repo.tests-unit.md`), starting with the HEAD sha it read. A slice with nothing to report
  still writes a one-line file.
- **Roll-up:** `whole-repo.md`, written last: oracle status, one row per slice (tests, Liar read,
  verdict counts), every finding row, security and money first.
- **Partial:** a slice with no file is named in `whole-repo.md`, and the run is PARTIAL.
- **Resume:** keep the run's folder. Each sitting runs its own tripwire pair; if the last sitting
  died before its `compare`, run `compare` first, then `snapshot`. `whole-repo.md` lists one
  Tripwire line per sitting.

## What this audit is not

Three neighbours already own a question. Note the finding in one line and route it:

| Question                                         | Owner                |
| ------------------------------------------------ | -------------------- |
| the test agrees with the code, not with the spec | `/audit-spec-drift`  |
| a rule has no test at all                        | `/audit-spec-gaps`   |
| two tests discriminate the same thing            | `/audit-suite-bloat` |

This audit asks one thing only: **could this test fail?** Not "is it right", not "is it needed".

## The shapes

Names come from Meszaros' _xUnit Test Patterns_, James Carr's TDD anti-pattern catalogue and the
test-smell catalogue at https://testsmells.org. Use them in the report, so a finding links to
literature instead of to taste.

| Shape                        | What it looks like                                                                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Coverage padding**         | mounts or calls the code, asserts nothing that depends on it: `wrapper.exists()`, `toBeDefined()`, `toBeTruthy()` on a wrapper, only `not.toThrow()`     |
| **Snapshot dump**            | `toMatchSnapshot()` over a whole `wrapper.html()` — it pins every class name and checks no behaviour; nobody reads the diff when it changes              |
| **The Mockery**              | the subject itself is mocked — the store, the composable or the component under test — or the only assertion is that a mock returned what it was told    |
| **The Secret Catcher**       | `try`/`catch` or `if` around the `expect`, so the failing path skips the assertion; a missing `expect.assertions(n)`                                     |
| **The Free Ride**            | an assertion before the DOM settled — no `await flushPromises()` / `await nextTick()` — or a floating promise, so it checks the state before the change  |
| **The Liar**                 | the title promises X, the body checks Y: "shows the error" that asserts only that the button exists                                                      |
| **Success Against All Odds** | an input that cannot discriminate: a sort on sorted data, a filter everything passes, a price on whole numbers, a guard test run with every role granted |
| **The Inspector**            | asserts `wrapper.vm.<internal>` or a private ref instead of what the user sees — green after the visible behaviour breaks                                |
| **Loose oracle**             | `expect.anything()` everywhere, `toMatchObject({})`, `toBeGreaterThanOrEqual(0)` on a count, `toContain('')`, a regex that matches anything              |
| **Testing the platform**     | asserts what Vue, Vuetify, Pinia, the router, Zod or TypeScript already guarantee, not what this repo decided                                            |
| **Bent to fit**              | git history shows the expected value edited to match the code, with no spec or docs change in that commit                                                |
| **Dull**                     | a title that names nothing (`renders`, `works`, `handles it`) — the reader cannot tell what would break it                                               |

**Learning and boundary tests are not Testing the platform** (Martin, _Clean Code_ ch. 8;
Beck, _TDD by Example_, "Learning Test"). A test whose subject is the library itself is not a
finding, and goes in no row and no count, when it:

- calls the library directly, with the same switches production sets,
- has a title that names the library behaviour,
- names the production file or symbol that relies on it,
- has an oracle a library upgrade could turn red.

Example: a spec pinning Zod's `fromJSONSchema` behaviour that `create-sse-client.ts` relies on. A
test that mounts this repo's own component or calls this repo's own wrapper is judged as this
repo's code. `not.toThrow()` / `toBeDefined()` on a call the library promises never fails is still
Coverage padding. A repo setting that no test pins goes to `/audit-spec-gaps`.

"Dull" alone is never CONFIRMED by the oracle below. It is a naming finding, and it is cheap to fix.

## Steps

### 1 — candidates from the tools, not from reading

A text search is the deterministic first cut. Run it over the scope's test files
(`src/modules/<module>/tests/**`, or `tests/unit/**` and `tests/cross-cutting/**` for a system
scope):

```bash
npm run audit:test-candidates -- -o reports/audit-<run>/test-honesty/candidates.json <paths>   # tests whose every assertion is weak
rg -n "toMatchSnapshot|toMatchInlineSnapshot|\.html\(\)" <paths>   # Snapshot dump
rg -n "wrapper\.vm\." <paths>                          # The Inspector
rg -n "eslint-disable.*vitest/" <paths>                # the gate's described disables are candidates
rg -n "vi\.(mock|spyOn)\(" <paths>                      # then ask: is the mocked thing the subject?
```

The script replaces the weak-matcher, `if|try|catch` and `rg -c` cuts: the lint gate
(`@vitest/eslint-plugin` recommended) already refuses a conditional `expect`, a missing one and a
duplicate title. It lists a test whose only assertions are weak matchers, snapshot matchers, or an
`expect(<x>.exists())` read (in Vue Test Utils `exists()` sits inside the `expect`, so `toBe(true)`
reads as strong). Its known false positives are `cy.*` assertions and asserting helpers. Negative
titles and effect-verb titles ("adds", "removes", "sends") with only a success check stay an `rg`
read.

Add the two priors, in this order:

- `reports/mutation/mutation.json` (step 3 says what it holds) — a test that covers a
  line whose mutants all **survive** is the strongest candidate there is. A survived mutant on a
  covered line is, by definition, a line some test runs and none checks.
- `git log -p --follow -- <test file>` — for **Bent to fit**: a commit that changes only an
  expected literal in the test, alongside a `src/` change, and no `docs/` or contract change.

Then read for **The Liar** and **Success Against All Odds**. Those two need judgement, and no
pattern finds them. When the scope is too big to read every test, read in full every test in a
security, money or stock slice; elsewhere, every test whose title claims a refusal, an effect
(shows, sends, removes, stops, same write), or an order or rounding, plus every test the candidate
script listed. Sample the rest.

Cypress specs (`**/tests/e2e/**/*.cy.ts`) are read too, but Stryker never runs them — see step 3.

### 2 — for each candidate, name the break

Write down, per candidate:

- the behaviour the test's **title** claims to pin
- the smallest change to `src/` that would break exactly that behaviour — the _break_

The break is written into the report. It is never applied.

| The title claims                 | Break                                               |
| -------------------------------- | --------------------------------------------------- |
| a guard refuses                  | the guard deleted, or returning early as allowed    |
| a value is computed              | a constant returned, or the input unchanged         |
| an order or precedence           | the two branches swapped, or the sort reversed      |
| a side effect happens            | the call deleted (the write, the emit, the request) |
| a boundary (`<` vs `<=`, expiry) | the boundary moved by one                           |

Write the break from the title, not from the test body. A break chosen by reading the assertions
only proves the assertions agree with themselves — it is how **The Liar** survives an audit.

### 3 — the oracle is Stryker's report

Stryker already breaks the code for you, in a sandbox copy (`.stryker-tmp/`), never in the
working tree. With `coverageAnalysis: "perTest"` (`stryker.config.json`), its report records
for every mutant which tests ran it (`coveredBy`) and which failed on it (`killedBy`). Read that
report; never edit `src/` to check.

- The report is `reports/mutation/mutation.json` — see
  `docs/tools/mutation-testing.md#which-file-is-what`. After `npm run test:mutation:pull` it holds
  the whole nightly; after `npm run test:mutation -- --mutate <file>`, that file's fresh result
  laid over it.
- A file's entry is stale when that source changed after the report was written
  (`git log -1 --format=%cI -- <file>` against the report's date): say so in the row.
- No usable report:
    - Say why at the top, in one line: the pull's own error, or "never pulled".
    - Other `reports/mutation*/**/mutation.json` files: hints only, with the same per-file
      staleness rule. Never `reports/stryker-incremental.json` (a cache, not a result).
    - Offer `npm run test:mutation -- --mutate <file>` for the scope and wait for yes (RULES.md
      rule 2): it re-runs Stryker for those files and writes `reports/`. Never run
      `test:mutation:pull` or `test:mutation:baseline` yourself: they write the tracked
      `mutation-baseline.json`. Ask the user to pull instead.
    - Mark the report PARTIAL: here the report is the oracle. Rows without a mutant stay
      UNVERIFIED `(no report)`.

- Match each break to a mutant: same location, same effect — a `ConditionalExpression` forced to
  `true` for a deleted guard, an emptied `BlockStatement` for a deleted call, an `EqualityOperator`
  for a moved boundary.
- Stryker stops at the first test that kills a mutant, so `killedBy` names one test. A mutant
  killed by a _different_ test says nothing about this one.
- Cypress specs and `tests/lighthouse/` never run under Stryker. Mark them UNVERIFIED
  `(suite skipped)`.
- `.vue` files are not in `stryker.config.json`'s `mutate` list, so a break inside a component's own
  `<script setup>` has no mutant to match. Mark it UNVERIFIED `(not mutated)`; the break stays in
  the report for a human to try.

Verdicts:

| Verdict        | Means                                                                                                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **CONFIRMED**  | the matching mutant **Survived** and this test is in its `coveredBy`: the test ran the broken code and stayed green.                                                                                         |
| **CONFIRMED**  | the matching mutant is **NoCoverage**: the test never even runs the code its title names.                                                                                                                    |
| **CLEAN**      | this test is in the matching mutant's `killedBy`. A false alarm — drop it silently.                                                                                                                          |
| **UNVERIFIED** | no mutant proves it, so nothing is counted. Give the reason tag, below.                                                                                                                                      |
| **LIAR-TITLE** | the title names a rule `src/` does not have. Cite the `src/` line where the rule would sit, and the doc line when the docs speak (silent docs still count). The oracle does not apply; the fix is a retitle. |
| **DULL**       | a naming finding only — the oracle does not apply.                                                                                                                                                           |

UNVERIFIED carries one reason tag:

| Tag                        | Means                                                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `(no report)`              | no usable Stryker report for this file                                                                                 |
| `(killed by another test)` | the matching mutant was killed by a different test, so it says nothing about this one                                  |
| `(no mutator)`             | no Stryker mutator can make the break (name the mutator folder you checked)                                            |
| `(suite skipped)`          | the test is in a suite Stryker never runs: a Cypress spec, `tests/lighthouse/`                                         |
| `(not mutated)`            | the break sits in a `.vue` SFC's own script, or any file outside `stryker.config.json`'s `mutate`: no mutant can exist |

A `(no mutator)`, `(suite skipped)` or `(not mutated)` row also carries: why no mutator can make it,
a diff of 3 lines or fewer that is never applied, the observable that changes on this test's own
input (a rendered text, a stored field, an emitted event, a call), and the assertion lines that
cannot see it. If you cannot name a changed observable, treat the break as equivalent and write no
row.

Only CONFIRMED, LIAR-TITLE and DULL rows are findings. CLEAN rows go in a one-line count, never a table row.

### 4 — write the report

`reports/audit-<run>/test-honesty/<SCOPE>.md`. Start with `Tripwire:` (RULES.md rule 6), then
`Liar read: full` or `Liar read: sampled (N of M tests, picked by …)`. Then the table:

| file:line | test name | shape | claims | break | mutant (id, status) | verdict | suggested fix |

The suggested fix is prose, never code, in this order of preference:

1. **Make it check its title** — name the missing assertion, or the input that would discriminate
   (an unsorted list, a caller without the permission, a value that rounds).
2. **Make the title tell the truth**, when the body checks something real but different.
3. **Delete it**, naming the test that already kills the same mutant.

Its expected value comes from the spec — the root `openapi.yaml` and `asyncapi.yaml`,
`docs/modules/<module>*.md`, `docs/theory/*.md`, cited by `file:line` — or, where the spec is
silent, is worked out by hand from the input and labelled so. Never from running the code: that is
**Bent to fit**, done by the auditor.

Then print the CONFIRMED rows to the terminal, security boundaries and money first, with one line
of totals: candidates, CONFIRMED, LIAR-TITLE, DULL, CLEAN, and UNVERIFIED split by reason tag. A low CONFIRMED-to-candidate ratio is
good news, and worth saying.

## Rules

- **Report only.** Write nothing but the report under `reports/audit-<run>/test-honesty/`. Do NOT edit
  source, tests, documentation, contracts or config. Do NOT commit, and never `git stash` — it
  takes every peer's uncommitted work with it.
- A finding needs a Stryker mutant id, or is a LIAR-TITLE. "It looks weak" is not a finding — the
  mutant either survived this test or it did not.
- A LIAR-TITLE is reported even when its test is CLEAN: a killed mutant clears the assertion, not
  the title.
- When the spec requires a rule and `src/` lacks it, the row is not this audit's. Route it in one
  line to `/audit-spec-drift` (MISMATCH-CODE) or `/audit-spec-gaps` (`contradicted`).
- Prefer three CONFIRMED rows over thirty candidates. A report full of guesses trains its reader to
  skip it.
- A short test is not a weak test. `expect(button.attributes('disabled')).toBeDefined()` on a
  well-chosen state is honest; only the mutant tells the difference.
- `reports/` is gitignored. The report is working evidence, not a deliverable — its
  conclusions belong in a fixed test, a commit message or a tracked issue.
