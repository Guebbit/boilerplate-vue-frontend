---
name: ddd-drift
description: Find where the strategic-DDD story (modules as bounded contexts, barrels as published language, the server deciding rules) and the code disagree — what the module lint and the specs cannot see
---

Before anything else, read `scripts/audit/RULES.md` and follow it. Where this skill and RULES.md
disagree, RULES.md wins.

ROLE: Architecture auditor for a frontend that uses strategic DDD only. You are not hunting bugs and not
judging presentation. You compare what the docs and `module.ts` docblocks CLAIM about the modules with what
the code DOES.

GOAL: Report every place where a claim about the module structure, or a rule the server should decide, has
drifted from the code. BE strict, FE elastic: rules and state ownership, never styling.

F2 mirrors the backend audit's C1 (`../boilerplate-node-backend/scripts/audit/ddd-drift/SKILL.md`): one
rule seen from each side. A ROUTE here is the input to that class.

WHAT DDD MEANS HERE: strategic only. Modules are bounded contexts. The context map is each module's docs page
(`docs/modules/<m>.md` § "Its neighbourhood"); `module.ts` docblocks point at it. A barrel is the published language. `domain/` is thin and pure. The server decides the
rules; the client reads the `*Actions` flags (`docs/understand/strategic-ddd.md` §4). There is no tactical DDD
on purpose (`docs/understand/domain-layer.md` §4). Do not ask for aggregates, entities or repositories.

SCOPE: the argument you were given: a module name (`orders`), a path, `--diff` or `whole-repo` (`scripts/audit/RULES.md` rule 5).
Empty means `whole-repo`. Drift is relational and is rarely introduced by the change that reveals it,
so `--diff` is a starting point, not a boundary: widen it as the steps below say, and say so in the report.

## Naming the scope

Output goes to `reports/audit-<run>/ddd-drift/<SCOPE>…`. `<run>` and `<SCOPE>` (module, path slug,
`--diff` branch slug, `whole-repo`) are defined in RULES.md rule 4.

Copy the exclusion list from "What this audit is not" below into the report header.

## What this audit is not

Already guarded elsewhere — do not report these:

- Lint: `index.ts`-only reach and `dependsOn`, foundation → shop, the tier ladder, `domain/` purity, a
  module importing its own barrel, a `.vue` calling `@api` or runtime `@types`.
- Specs: `module-coupling`, `route-name-coupling`,
  `module-file-shapes`, `module-groups`, `registry`, `module-map`, and the sitemap block.
- Compliance (run from the backend): `../boilerplate-node-backend/scripts/audit/compliance-frontend/SKILL.md`.

Neighbouring audits own a question. Note the finding in one line and route it:

| Question                                                   | Owner                                                                                |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| a pass-through, a one-caller helper, a dead export         | `/audit-code-shape` (F5 reports only where a rule lives)                             |
| the tests: weak, duplicated, uncovered, agreeing with code | `/audit-test-honesty`, `/audit-suite-bloat`, `/audit-spec-gaps`, `/audit-spec-drift` |
| styling and presentation                                   | `/audit-design-manual`                                                               |

Never propose a check, a test, a marker or a generator. The house rule is a judgement the reader can
still disagree with, and a hand-kept fix is the whole point.

## The drift classes

| class                           | drift when                                                                                                                                                                                        | fine when                                                                                                                                                                                                                | sev                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| F1 doc claim                    | a count, list or "only X" in `docs/` or a `module.ts` docblock disagrees with `ls` / `rg`                                                                                                         | the claim is generated and checked (the sitemap block)                                                                                                                                                                   | high                                      |
| F2 client decides a server rule | a button or option is gated on status literals, or a `domain/` table keyed by a `*Status`, or a hard-coded limit or duration, that the server should answer through an `*Actions` flag or a field | the literal only labels, colours or picks a notice, and gates no write; or the refusal is about the caller's account, not the resource (a purchase hold, the open-order limit), and the client renders the door's answer | high (the fix is a backend contract flag) |
| F3 context-map label wrong      | a module page's relationship label disagrees with what the import does (the table in `strategic-ddd.md`)                                                                                          | the label matches the import                                                                                                                                                                                             | med                                       |
| F4 barrel narrower than module  | a module has no `index.ts`, or its barrel leaves out a store, composable, component or domain rule a sibling could need                                                                           | the file is a view, route, manifest, locale or generated-Zod schema file: never published                                                                                                                                | med                                       |
| F5 `domain/` floor, both ways   | a rule with 2+ callers, or a trap, lives in a view or store; or `domain/` holds formatting or `Intl`                                                                                              | one caller, no trap: inline is right                                                                                                                                                                                     | low                                       |
| F6 label vs depth               | a `generic` module grows a `domain/`; the subdomain table names gone modules or misses real ones                                                                                                  | `core` with no `domain/`                                                                                                                                                                                                 | low                                       |
| F7 enum restated                | a `.ts` union or literal array copies a generated enum                                                                                                                                            | the values are client-only state                                                                                                                                                                                         | low                                       |

## Procedure

### 0 — claims first, with the code closed

Read `docs/understand/{strategic-ddd,domain-layer,modules,layers}.md`, `docs/reference/glossary.md`, `docs/modules/<m>*.md` and every
`src/modules/*/{module,index}.ts` docblock. Write one row per claim and freeze the list before you open any
code. A claim you invent after reading the code is not a claim.

**A `whole-repo` run.** The module pages do not fit one reader. Before you read a page, name the slices at
the top of `whole-repo.claims.md`: clusters of related modules (sub-pages go with their module;
`docs/modules/start.md` is read with the theory pages), sized so one reader finishes a slice in one
sitting. Read the theory pages once, yourself.

- Pass 1, per slice: a fresh read-only helper reads that slice's `docs/modules/*.md`, `module.ts`
  docblocks and `module.yaml` comments with the code closed, and returns claim rows. Take only claims a
  drift class can judge: who owns what state, `dependsOn` edges, what a barrel publishes, what sits in
  `domain/`, which `*Actions` flag gates a control, and any count, list, "only" or "never" about those.
  Skip styling, copy, routes and libraries: other audits own them. Write each reply word for word under
  the slice's heading; a section is frozen once written. Helpers write nothing.
- Checking the claims (`code says | match`) may also go to one helper per slice; write its rows word for
  word into the report's claims table. The F2-F7 searches stay whole-repo.
- Solo (no helpers): write every slice's claims before step 1 opens any code. A slice you cannot read
  stays unread: name it in the header; the run is PARTIAL. A page first opened after code, because a
  candidate led there, is read for that candidate only; its rows go under a closing `## Read after code`
  heading, never into a frozen slice.

### 1 — F1: facts against claims

```sh
ls -d src/modules/*/domain
ls src/modules/*/stores
ls src/modules/*/routes.ts
grep -v '^\s*\*' src/modules/*/index.ts
rg -n "from '@/modules/[a-z-]+'" src/modules -g '!**/tests/**'
```

Also read `src/modules.ts` and `src/modules/*/module.yaml`. A count, a list, "only", "none", "both" in a frozen
claim is checked against these.

### 2 — F2: the client deciding a server rule

```sh
rg -n "status\s*(===|!==)\s*'|\[\s*'[a-z_]+',.*\]\.includes\(.*status" src -g '!**/tests/**'
rg -n "[A-Z]\w*Status\.\w+\s*(===|!==)" src
rg -n "price\s*\*|\*\s*\w*quantity" src
rg -n "^    \w+Actions:" openapi.yaml
rg -n "new Set\(\[|\.has\(\s*\w*(props\.)?\w+\.status|override.*includes\(" src -g '!**/tests/**'
rg -n "^export const can[A-Z]" src/modules/*/domain
rg -n "Record<\w+Status," src/modules/*/domain
rg -n "\b(MAX|MIN|LIMIT|DAYS|HOURS)_\w+\s*=\s*\d+" src -g '!**/tests/**'
```

The `can` and `Record` greps catch a server rule moved into `domain/`; the last one a limit or duration the
server owns (compare each with the contract's field bounds and the backend's `config.ts`). The `Record<…Status,`
shape is also refused by lint (`eslint.config.ts`, the `src/modules/*/domain` block); the grep stays for the
copies lint is blind to, such as a status → status[] map written with `Map` or a string-literal key.

For each hit, find the `*Actions` schema of that resource. Verdict:

- a flag for it exists and the view ignores it → **DRIFT**
- no flag exists → **ROUTE**, naming the `openapi.yaml` schema that needs one — even when an operation's
  description states the rule in prose: prose is documentation, a flag is the answer
  (`docs/understand/strategic-ddd.md` §4, "delete the API" test)
- the literal only labels, colours or picks a notice → **OK**

A ROUTE is a BACKEND contract change and needs the user's yes. Report it. Never fix it, never edit the contract.
A ROUTE is an open finding, not a pass: list every ROUTE in the report's totals line as "open, owner: backend".
They go in the report and in RULES.md rule 3's plan suggestion; this audit writes no other file.

### 3 — F3 and F4: edges and barrels

For each edge label on a module page, check what the sibling does with it: reads state, asks for a write, or
mounts a component. A swapped label is F3. For each module, compare its barrel with its files: no barrel, or a
barrel narrower than the store, composables, components and domain rules it holds, is F4. An export no
sibling imports is NOT a finding: unused exports are allowed on purpose (`docs/understand/strategic-ddd.md` §5).

### 4 — F5 and F6: the `domain/` floor and the labels

```sh
rg -n "Intl\.|toLocale|formatCurrency" src/modules/*/domain
```

Look for pure expressions with 2+ callers sitting in views or stores. Compare the subdomain table in
`strategic-ddd.md` with `ls src/modules` and which modules have a `domain/`.

### 5 — F7: enums restated

```sh
rg -n "'[a-z_]+'\s*\|" src -g '!**/tests/**'
```

Compare each hit with the module's `enums.ts` and `@types`.

### 6 — name the wrong side

For every drift say whether the **code**, the **doc**, or **both** is wrong. A doc that the code correctly
outgrew is a doc fix, not a code fix. The smallest fix is prose, never code. (An F2 ROUTE is always the
backend's: say so.)

### 7 — the oracle

Every row needs BOTH a claim citation (`file:line`) AND code evidence (`file:line` or the command and its
output). Drop any row that has only one. A fabricated citation costs more than a missed finding.

## Output

Write `reports/audit-<run>/ddd-drift/<SCOPE>.md`:

- **Claims table** — `| claim (file:line) | code says (file:line) | match |`
- **Findings** — `| class | claim (file:line) | evidence | verdict | wrong side | severity | suggested fix |`

Verdicts: **DRIFT**, **OK**, **ROUTE** (name the `openapi.yaml` schema that needs the flag),
**DELIBERATE** (needs the quoted doc sentence that allows it), **NOT-TRACED** (plus the question).
Keep the OK rows that are false-positive controls; they show the search was honest. At `whole-repo` the
header names the slices read and unread, and says page claims outside the F-classes were not taken.

Then print only the DRIFT and ROUTE rows, F2 first, and one totals line: claims checked, DRIFT, ROUTE,
DELIBERATE, NOT-TRACED. A low drift-to-candidate ratio is good news, and worth saying.

## Self-check

A `whole-repo` run on the commit this audit was written against (FE `655c56bd`) found at least these. If yours
finds far fewer than about six, the procedure was too loose. Far more means presentation noise got in.

- F1 DRIFT: `domain-layer.md` (the `domain/` list), `strategic-ddd.md` ("products/orders have none", and the
  barrel-size example), `glossary.md` (`admin`, `realtime`: both modules are gone), `account.md` (six stores,
  there are seven), `delivery.md` ("only module" with no routes).
- F2 ROUTE: none expected once `OrderActions.delete`/`hardDelete` and
  `FulfillmentOrderActions.forceShip` are in the contract and used. Run against a checkout from
  before that (FE `655c56bd`), it finds `orders/domain/hard-delete.ts` and `FulfillmentOrderCard.vue`
  (forced ship) as ROUTE, `ShipmentRow.vue` (forced deliver) and `WebhookDeliveriesFilters.vue`
  (replay) as DRIFT — and `hard-delete.ts` must NOT come out OK because `DELETE /orders` states the
  rule in prose. F2 OK, as the control: the status check in `OrderTarget.vue` that only labels.
- F3 DRIFT: the swapped label in `wishlist/module.ts`.

Rows move as the code is fixed. The point is the count and the false-positive control, not these exact lines.

## Rules

- Prefer three real drifts over thirty maybes. A report full of guesses trains its reader to skip it.
- Never propose a spec, a census or a generator to guard a count. A count that needs a guard is a count that
  should not be written down.
- A rule the contract describes in prose is still ROUTE when the client gates a control on it. Only an
  `*Actions` flag (or a field the server computes) makes the client's copy unnecessary.
- `reports/` is gitignored. These files are working evidence, not deliverables.
