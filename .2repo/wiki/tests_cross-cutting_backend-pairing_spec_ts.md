# tests/cross-cutting/backend-pairing.spec.ts

## Purpose

A cross-repository contract test that pins every enabled frontend module to its counterpart(s) in `boilerplate-node-backend`. It exists because nothing in either build fails when the two module maps drift; this file is the single, explicit record of which backend domain answers each frontend domain, and why the mapping is non-obvious where it is.

## Key elements

- **`Pairing` (interface)** — Shape of one entry: a `counterparts` array of backend module names (empty = none) and an optional `why` sentence explaining non-trivial mappings.
- **`BACKEND_PAIRING`** — `Readonly<Partial<Record<string, Pairing>>>` holding all 14 entries. Eleven are one-to-one same-name; the three exceptions are `admin` (→ `observability` + `audit-logs`), `realtime` (→ `observability`), and `demo` (→ `[]`).
- **`isSameName`** — Helper that returns `true` when the pairing is a single counterpart with an identical name, used to skip the `why` requirement.
- **`describe('the cross-repository pairing')`** — Four tests:
  1. Every enabled module has a `BACKEND_PAIRING` entry.
  2. Any entry whose pairing is not a same-name one-to-one must supply `why`.
  3. No key in `BACKEND_PAIRING` references a module that is not enabled.
  4. Meta-guard: `enabledModules.length >= 10`, preventing a vacuous pass if the registry is accidentally emptied.

## Relationships

- **`@/modules` (`enabledModules`)** — The test iterates over this export to know the set of active modules; it is the ground truth that rule 1 and rule 3 check against.
- **`docs/modules/index.md`** — Referenced in the file's doc-comment as the human-readable overview this test complements.

## Notes

- The table was migrated from `scripts/module-docs/pairing.ts` when the docs generator was removed; the pairing rules had no documentation purpose and now live only in this spec.
- The mapping is **stated, not derived**. The comment explicitly notes that a name-matcher heuristic would classify `admin` as "unpaired," which is a wrong answer rather than a missing one.
- `BACKEND_PAIRING` is typed `Partial`, so the test suite (not TypeScript) enforces completeness.
- The meta-test (≥ 10 modules) is the only guard against all three rules passing trivially on an empty registry.
