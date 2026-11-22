---
name: spec-gaps
description: Audit a scope for business rules and security boundaries with ZERO test coverage
---

Before anything else, read `scripts/audit/RULES.md` and follow it. Where this skill and RULES.md
disagree, RULES.md wins.

ROLE: Domain reviewer, not a code reviewer. You care about what the business
promised, not about how the code is written.

GOAL: Find business rules, invariants, precedence rules and security boundaries
with ZERO coverage — not weak coverage, no coverage.

SCOPE: the argument you were given: a module name (`orders`), a path, `--diff` or `whole-repo` (`scripts/audit/RULES.md` rule 5).
Empty means `whole-repo`.

## Naming the scope

Report path and file names: RULES.md rules 4 and 5. A `whole-repo` run: see the next section.

### A whole-repo run

- **Slices:** module families whose rules depend on each other, plus one `SYS` slice. Every module
  is in exactly one slice (not `example`). Suggested families:
    - `account+users+api-keys` (security);
    - `cart+orders+payments`;
    - `inventory+stock-alerts+products`;
    - `delivery+returns`;
    - `tasks+shop-tasks+notifications`;
    - `webhooks+observability+stats`;
    - `shop+wishlist+locales`.
- **Map:** write the slice → modules map and the order at the top of `whole-repo.md` before the
  first slice. If the newest older `spec-gaps/whole-repo.md` has a map, start from it, and put a new
  module in its nearest family. Matching rows across runs is by rule text and source, never by
  slice.
- **SYS** owns every source in the read list that belongs to no module: the folders `src/app`,
  `src/infrastructure`, `src/kernel`, `src/ui` and `src/i18n`, `shared/rules/*.yaml`, `contracts/*.yaml`, `docs/{understand,build,operate,reference}/*.md`. SYS reads them in full. A family slice searches them for its modules' names,
  subjects, route segments and error codes, the same way a module run does.
- **Lead pass** first: grep the suite for every error code, event name and storage key the docs
  name. The zero-hit list goes to the slices as leads, never findings. The lead pass signs off no
  module on its own.
- **Order:** security slices first, then money and stock, then the rest.
- **Files:** each slice writes `whole-repo.<slice>.md` starting with its HEAD sha; `whole-repo.md`
  (method, map, totals, de-duplicated short list) is written last. A missing slice file makes the
  run PARTIAL.

## Steps

### 1 — enumerate the rules

From the contract and the docs, NOT from the implementation:

- Contracts:
    - the root `openapi.yaml` and `asyncapi.yaml`: citable here, since they are tracked copies (a fix
      to one is a backend fix, so say so in the row);
    - `src/modules/<module>/module.yaml` and any other YAML in `src/modules/<module>/`;
    - `contracts/{cookies,frontend-links,authorization-keys.generated}.yaml`.
- Docs: `docs/modules/<module>*.md`, `docs/understand/*.md`, `docs/build/*.md`, `docs/operate/*.md`, `docs/reference/*.md`.
- Shared: `shared/rules/*.yaml`. Layout: `docs/understand/shared-rules.md`.

A module or path run reads its own docs and YAML in full. For `shared/**`, `contracts/*.yaml` and `docs/{understand,build,operate,reference}/*.md` it
searches for the module name, its subjects, route segments and error codes, and reads only what
matches. A `whole-repo` run: see the section above.

When the docs are thin, search the read set above for the term: Grep, or
`rg -n '<term>' docs/ shared/ contracts/ src/modules/<module>/*.yaml`. A hit counts only when re-found and
cited from its source file; a hit under `src/`, `tests/` or `.2brain/` is discarded.

List every rule as one testable sentence. Cover at least these families, and say
"none stated" where the spec is silent rather than inventing one:

- permission and ownership checks (who may see, who may act, which `*Actions` flag gates a control)
- precedence when two rules collide (discount vs. minimum, reservation vs. stock)
- money: rounding direction, currency, totals and prices shown that must reconcile
- state machines: which transitions are legal, which are terminal
- idempotency, retries, and duplicate or out-of-order delivery on the SSE channels
- limits: pagination bounds, payload size, expiry and TTL
- browser state: what may be stored where (`docs/understand/browser-storage.md`), cookies, tokens
- accessibility: an a11y block for a user that axe and the keyboard specs do not reach

### 2 — hunt for coverage

For each rule, search the whole suite — `tests/**`, `src/modules/*/tests/**`, including the Cypress journeys.
Grep for the values and the endpoint, not for the rule's name; a test that
mentions the concept but asserts nothing about it is NOT coverage.

A zero-hit error code is a lead, never a finding. The client never sends codes, it renders them, so
before calling it uncovered, search for: the view or composable that maps the code; the
`generic.<code>` or module locale key that renders it; the cross-cutting specs (`tests/cross-cutting/`)
and the Cypress journeys; for a code the client never maps, the observable outcome (the notice shown,
state unchanged). A test that asserts the rendered message or outcome but not the code is `covered`
when that status can carry only that one code on the operation, and `partially covered — code not
asserted` when it can carry two or more. Read the operation's own `x-error-codes` first. If that still
cannot be told, mark it `partially covered`.

**Search repo-wide, never batch-wide.** A rule is often covered by a test that
lives in another module's file set. "No test in scope" is not a finding — it is a
scoping artefact, and filing it as a gap is how this audit wastes someone's day.

### 3 — classify

For "partially", say precisely which half is missing.

| Verdict             | Means                                                                                                                                                                                                                                                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `covered`           | a test asserts the rule                                                                                                                                                                                                                                                                                                    |
| `partially covered` | name the missing half                                                                                                                                                                                                                                                                                                      |
| `not covered`       | passes all three tests of `docs/reference/tests.md#what-earns-a-test` (our own code enforces it today, a break would be silent, and someone is hurt: a wrong price shown, data leaked to browser storage, an a11y block, a broken journey), with a G/W/T; a security stop a dependency provides gets a learning-test G/W/T |
| `contradicted`      | the spec says X, the code or a test does not-X. Cite both sides by file:line, no G/W/T; list it first in the short list, marked "→ spec-drift Leads"                                                                                                                                                                       |
| `holds by absence`  | true only because something does not exist, or a value is read back as stored. Name what is absent, or the stored field. No G/W/T                                                                                                                                                                                          |
| `loud`              | a break would fail at once elsewhere; name where. No G/W/T                                                                                                                                                                                                                                                                 |
| `no harm`           | fails the third criterion; say who is not hurt. No G/W/T                                                                                                                                                                                                                                                                   |
| `deliberate`        | a gap left on purpose; cite the doc                                                                                                                                                                                                                                                                                        |

Totals: one column per verdict.

### 3b — open the code before filing a row

For every row that is not `covered`, open the code that should enforce it and cite the line.

- No such line: `holds by absence`.
- The line does not-X: `contradicted`.
- The line enforces X: apply the three criteria (`not covered`, `loud`, `no harm`).
- If `reports/mutation/mutation.json` covers the file, name the mutant on that line (id and
  status). A `.vue` script line has no mutant: say so instead of looking for one.

Step 1 still takes rules from the spec only; this step only sorts them.

Under RULES.md rule 8: every earlier `not covered`, `partially covered` and `contradicted` row is
re-checked against HEAD. `carried` and `not re-checked` are not allowed for them. Before the lead
pass calls a module "fully covered", it checks that module's earlier open rows.

### 4 — write the missing case

For every `not covered` rule, give the minimal input that would exercise it, as
Given/When/Then. Prose only — no code, no test files. Name the suite it belongs
in, using the suite names this repo actually has — read `package.json`'s `test:*`
scripts rather than assuming — and say why that suite. Prefer a suite Stryker runs (unit,
cross-cutting, a co-located module spec); Cypress only for a claim that needs a real browser.

## Output

Write `reports/audit-<run>/spec-gaps/<SCOPE>.md`:

| id | risk | rule | source (file:line) | status | minimal case (G/W/T) | suite |

- `id`: `<CODE>-<n>`: the slice code in a `whole-repo` run (`ACC-12`), the scope's code otherwise. A
  de-duplicated rule keeps one id and lists the others (`CRT-9 = USR-28`). Ids hold within one run;
  to match a row from the previous run, compare the rule text and the source, not the id.
- `risk`: `security` (permission, ownership, tenant, auth), `money` (money and stock that must add
  up), `state` (state machine, precedence, invariant), `limits` (limits, TTL, the rest). A row in two
  families names both and sorts by the first.

Put the short list at the top of `<SCOPE>.md`, under `## Not covered`: every `not covered` row, in
the order security, money, state, limits. The full table follows it. End by printing the same short
list.

Rules:

- Every rule needs a spec citation. A rule you inferred from the code is not a
  rule, it is an implementation detail — leave it out.
- A gap that is deliberate needs to be recorded as deliberate, with the doc that
  says so, not silently dropped.
- A rule that is real but stated nowhere is its own finding: the fix is to write
  the contract text, not the test. Say which is missing.
- `reports/` is gitignored. These files are working evidence, not deliverables.
