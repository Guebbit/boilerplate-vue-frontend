---
name: test-honesty
description: Report tests that pass without proving anything — coverage padding, mocked subjects, swallowed failures, lying titles, degenerate inputs
---

ROLE: Sceptical test auditor. Read every test as if its author were paid per green test and per
covered line. A test is innocent only once it has been seen to fail.

GOAL: Find tests that stay green when the behaviour they claim to check is broken, and say what
would make each one honest. This audit only reports. It never edits code, tests or documentation.

SCOPE: the argument you were given — a module name (`cart`), a path, or `--diff` for modules
touched by the working tree. If empty, use `git status --porcelain` to pick the scope.

## Naming the scope

Output is `reports/audit/test-honesty/<SCOPE>.md`, where `<SCOPE>` is:

- a module → the module name (`cart`)
- a path → the path slugged, `src/` dropped (`src/infrastructure/http` → `infrastructure-http`)
- `--diff` → the current branch name slugged (`git branch --show-current`)

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

"Dull" alone is never CONFIRMED by the oracle below. It is a naming finding, and it is cheap to fix.

## Steps

### 1 — candidates from the tools, not from reading

A text search is the deterministic first cut. Run it over the scope's test files
(`src/modules/<module>/tests/**`, or `tests/unit/**` and `tests/cross-cutting/**` for a system
scope):

```bash
rg -n "\.exists\(\)|toBeDefined\(\)|toBeTruthy\(\)|not\.toThrow\(\)|expect\(true\)|expect\.anything\(\)|toMatchObject\(\{\}\)|toBeGreaterThanOrEqual\(0\)" <paths>
rg -n "toMatchSnapshot|toMatchInlineSnapshot|\.html\(\)" <paths>
rg -n "wrapper\.vm\." <paths>                            # The Inspector
rg -n "^\s*(if|try|catch)\b" <paths>                    # conditional or caught assertions
rg -n "vi\.(mock|spyOn)\(" <paths>                      # then ask: is the mocked thing the subject?
rg -c "\bexpect\(" <paths>                               # a file whose count is low for its it() count
```

Add the two priors, in this order:

- `reports/mutation/mutation.json` (step 3 says what it holds) — a test that covers a
  line whose mutants all **survive** is the strongest candidate there is. A survived mutant on a
  covered line is, by definition, a line some test runs and none checks.
- `git log -p --follow -- <test file>` — for **Bent to fit**: a commit that changes only an
  expected literal in the test, alongside a `src/` change, and no `docs/` or contract change.

Then read every remaining test in scope for **The Liar** and **Success Against All Odds**. Those
two need judgement, and no pattern finds them.

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
- No usable report: `npm run test:mutation -- --mutate <file>` re-runs Stryker for one file and
  writes only under the gitignored `reports/`. Never run `test:mutation:pull` yourself — it writes
  the tracked `mutation-baseline.json`. Ask the user to pull instead. If nothing covers the scope,
  say so at the top and mark every row UNVERIFIED.

- Match each break to a mutant: same location, same effect — a `ConditionalExpression` forced to
  `true` for a deleted guard, an emptied `BlockStatement` for a deleted call, an `EqualityOperator`
  for a moved boundary.
- Stryker stops at the first test that kills a mutant, so `killedBy` names one test. A mutant
  killed by a _different_ test says nothing about this one.
- Cypress specs never run under Stryker. Mark them UNVERIFIED.
- `.vue` files are not in Stryker's `mutate` list, so a break inside a component's own
  `<script setup>` has no mutant to match. Mark it UNVERIFIED and say so; the break stays in the
  report for a human to try.

Verdicts:

| Verdict        | Means                                                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **CONFIRMED**  | the matching mutant **Survived** and this test is in its `coveredBy`: the test ran the broken code and stayed green.   |
| **CONFIRMED**  | the matching mutant is **NoCoverage**: the test never even runs the code its title names.                              |
| **CLEAN**      | this test is in the matching mutant's `killedBy`. A false alarm — drop it silently.                                    |
| **UNVERIFIED** | no mutant matches the break, the mutant was killed by another test, or the file is outside Stryker's reach. Say which. |
| **DULL**       | a naming finding only — the oracle does not apply.                                                                     |

Only CONFIRMED and DULL rows are findings. CLEAN rows go in a one-line count, never a table row.

### 4 — write the report

`reports/audit/test-honesty/<SCOPE>.md`:

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
of totals: candidates, CONFIRMED, CLEAN, UNVERIFIED, DULL. A low CONFIRMED-to-candidate ratio is
good news, and worth saying.

## Rules

- **Report only.** Write nothing but the report under `reports/audit/test-honesty/`. Do NOT edit
  source, tests, documentation, contracts or config. Do NOT commit, and never `git stash` — it
  takes every peer's uncommitted work with it.
- A finding needs a mutant id. "It looks weak" is not a finding — the mutant either survived this
  test or it did not.
- Prefer three CONFIRMED rows over thirty candidates. A report full of guesses trains its reader to
  skip it.
- A short test is not a weak test. `expect(button.attributes('disabled')).toBeDefined()` on a
  well-chosen state is honest; only the mutant tells the difference.
- `reports/` is gitignored. The report is working evidence, not a deliverable — its
  conclusions belong in a fixed test, a commit message or a tracked issue.
