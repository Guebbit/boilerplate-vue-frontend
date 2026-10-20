---
name: ddd-drift
description: Find where the strategic-DDD story (modules as bounded contexts, barrels as published language, the server deciding rules) and the code disagree — what the module lint and the specs cannot see
---

ROLE: Architecture auditor for a frontend that uses strategic DDD only. You are not hunting bugs and not
judging presentation. You compare what the docs and `module.ts` docblocks CLAIM about the modules with what
the code DOES.

GOAL: Report every place where a claim about the module structure, or a rule the server should decide, has
drifted from the code. BE strict, FE elastic: rules and state ownership, never styling.

WHAT DDD MEANS HERE: strategic only. Modules are bounded contexts. The context map is prose in each
`module.ts` docblock. A barrel is the published language. `domain/` is thin and pure. The server decides the
rules; the client reads the `*Actions` flags (`docs/theory/strategic-ddd.md` §4). There is no tactical DDD
on purpose (`docs/theory/domain-layer.md` §4). Do not ask for aggregates, entities or repositories.

SCOPE: the argument you were given — a module name (`orders`), a path, or `--diff` for what the working tree
touches. If empty, audit the whole repo (`full`).

## Naming the scope

Output is `reports/audit/ddd-drift/<SCOPE>.md`, where `<SCOPE>` is:

- empty → `full`
- a module → the module name (`orders`)
- a path → the path slugged, `src/` dropped (`src/infrastructure/http` → `infrastructure-http`)
- `--diff` → the current branch name slugged (`git branch --show-current`)

Copy the exclusion list from "Out of scope" below into the report header.

## The drift classes

| class                           | drift when                                                                                            | fine when                                                              | sev                                       |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------- |
| F1 doc claim                    | a count, list or "only X" in `docs/` or a `module.ts` docblock disagrees with `ls` / `rg`             | the claim is generated and checked (the sitemap block)                 | high                                      |
| F2 client decides a server rule | a button or option is gated on status literals the server should answer through an `*Actions` flag    | the literal only labels or colours, or the contract states the formula | high (the fix is a backend contract flag) |
| F3 context-map label wrong      | a docblock's relationship label disagrees with what the import does (the table in `strategic-ddd.md`) | the label matches the import                                           | med                                       |
| F4 barrel wider than needed     | a barrel publishes a store or composable where a component or schema would serve the sibling          | the sibling must read the state                                        | med                                       |
| F5 `domain/` floor, both ways   | a rule with 2+ callers, or a trap, lives in a view or store; or `domain/` holds formatting or `Intl`  | one caller, no trap: inline is right                                   | low                                       |
| F6 label vs depth               | a `generic` module grows a `domain/`; the subdomain table names gone modules or misses real ones      | `core` with no `domain/`                                               | low                                       |
| F7 enum restated                | a `.ts` union or literal array copies a generated enum                                                | the values are client-only state                                       | low                                       |

## Procedure

### 0 — claims first, with the code closed

Read `docs/theory/{strategic-ddd,domain-layer,modules,layers,glossary}.md`, `docs/modules/<m>*.md` and every
`src/modules/*/{module,index}.ts` docblock. Write one row per claim and freeze the list before you open any
code. A claim you invent after reading the code is not a claim.

### 1 — F1: facts against claims

```sh
ls -d src/modules/*/domain
ls src/modules/*/stores
ls src/modules/*/routes.ts
grep -v '^\s*\*' src/modules/*/index.ts
rg -n "from '@/modules/[a-z-]+'" src/modules -g '!**/tests/**'
```

Also read `src/modules.ts` and `scripts/module-edges.ts`. A count, a list, "only", "none", "both" in a frozen
claim is checked against these.

### 2 — F2: the client deciding a server rule

```sh
rg -n "status\s*(===|!==)\s*'|\[\s*'[a-z_]+',.*\]\.includes\(.*status" src -g '!**/tests/**'
rg -n "[A-Z]\w*Status\.\w+\s*(===|!==)" src
rg -n "price\s*\*|\*\s*\w*quantity" src
rg -n "^    \w+Actions:" openapi.yaml
```

For each hit, find the `*Actions` schema of that resource. Verdict:

- a flag for it exists and the view ignores it → **DRIFT**
- no flag exists → **ROUTE**, naming the `openapi.yaml` schema that needs one
- the contract states the formula, or the literal only labels → **OK**

A ROUTE is a BACKEND contract change and needs the user's yes. Report it. Never fix it, never edit the contract.

### 3 — F3 and F4: edges and barrels

For each docblock edge label and each barrel export, check what the sibling does with it: reads state, asks
for a write, or mounts a component. A swapped label is F3. A store or composable published where a component
or schema would do is F4.

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

Compare each hit with `src/types/enums.ts` and `@types`.

### 6 — the oracle

Every row needs BOTH a claim citation (`file:line`) AND code evidence (`file:line` or the command and its
output). Drop any row that has only one. A fabricated citation costs more than a missed finding.

## Output

Write `reports/audit/ddd-drift/<SCOPE>.md`:

| class | claim (file:line) | evidence | verdict | suggested fix |

Verdicts: **DRIFT**, **OK**, **ROUTE** (name the `openapi.yaml` schema that needs the flag),
**NEEDS-DECISION**. Keep the OK rows that are false-positive controls; they show the search was honest.

Then print only the DRIFT and ROUTE rows, F2 first, and one totals line.

## Out of scope

Already guarded elsewhere — do not report these:

- Lint: `index.ts`-only reach and `MODULE_EDGES`, foundation → shop, the tier ladder, `domain/` purity, a
  module importing its own barrel, a `.vue` calling `@api` or runtime `@types`.
- Specs: `published-language`, `module-coupling`, `backend-pairing`, `route-name-coupling`, `store-location`,
  `module-file-shapes`, `module-groups`, `registry`, and the sitemap block.
- Neighbouring audits: spec-drift, spec-gaps, test-honesty, suite-bloat (tests), design-manual (styling),
  and compliance (run from the backend).

## Self-check

A `full` run on the commit this audit was written against (FE `655c56bd`) found at least these. If yours
finds far fewer than about six, the procedure was too loose. Far more means presentation noise got in.

- F1 DRIFT: `domain-layer.md` (the `domain/` list), `strategic-ddd.md` ("products/orders have none", and the
  barrel-size example), `glossary.md` (`admin`, `realtime`: both modules are gone), `account.md` (six stores,
  there are seven), `delivery.md` ("only module" with no routes).
- F2 ROUTE: `orders/domain/hard-delete.ts` (no delete flag in `OrderActions`) and `FulfillmentOrderCard.vue`
  (forced ship and deliver). F2 OK, as the control: the status check in `Order.vue` that only labels.
- F3 DRIFT: the swapped label in `wishlist/module.ts`.

Rows move as the code is fixed. The point is the count and the false-positive control, not these exact lines.

## Rules

- Do NOT edit code, tests, docs or the contract. Do NOT use `--fix`. Do NOT stash or commit. This is a report.
- Never propose a spec, a census or a generator to guard a count. A count that needs a guard is a count that
  should not be written down.
- A rule the contract states is not drift, even when the client repeats it.
- `reports/` is gitignored. These files are working evidence, not deliverables.
