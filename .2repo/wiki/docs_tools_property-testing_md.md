# docs/tools/property-testing.md

## Purpose

Documentation page explaining the repo's property-based testing practice: what qualifies as a target, the two determinism rules (fixed seed, committed counterexamples), the deliberate split with example-based tests, and where each property test file lives. It exists so contributors know *when* to write a property vs. an example and *how* to run/extend them without duplicating assertions.

## Key elements

- **Target criteria** — pure, total, invariant-rich functions. Explicitly listed: `sumLineItems` (totals), `serialize` (models), `escapeRegex` (search).
- **Two rules** — (1) every property file fixes a seed at the top; (2) any generated counterexample is committed back as an example test with the seed in a comment.
- **The split** — property files own totality, generated combinations, and algebraic laws (idempotence, non-mutation, monotonicity); example files own named metacharacter cases, timing assertions, and specific historical negatives.
- **Running budget** — `numRuns` kept modest for the pre-commit path; raise only while hunting a specific bug.
- **File map** — four test files across `src/modules/orders` and `tests/cross-cutting`, each paired with the source module it guards.

## Relationships

- **`package.json`** — provides the `fast-check` dependency used by all property test files listed here.
- **`src/infrastructure/totals.ts`** — the `sumLineItems` function is the primary target described; its `Infinity * 0 → NaN` bug was found by the property test.
- **`src/models/serialize.ts`** — target for `serialize.property.test.ts`; invariants include `_id`→`id`, `__v` removal, non-mutation, idempotence.
- **`src/repositories/search.ts`** — `escapeRegex` is the target for `search.property.test.ts`; the paired example file is `search-regex.test.ts`.
- **`src/infrastructure/http/response-schema-map.ts`** — cited as the historical motivation: 52-row lookup at 55% mutation (182 survivors) before exhaustive generation raised the file to ~96%.
- **`src/modules/orders/tests/unit/totals.property.test.ts`** — property test for `totals.ts`; lives alongside the example-based unit tests for the same module.
- **`tests/cross-cutting/search.property.test.ts`** / **`tests/cross-cutting/search-regex.test.ts`** — the property/example pair for `search.ts`; headers in each file name the division explicitly.
- **`tests/cross-cutting/serialize.property.test.ts`** — property test for `serialize.ts`.
- **`docs/getting-started.md`** — the onboarding page that directs new contributors to this page for testing conventions.

## Notes

- The "wrong test" anecdote (secret `"p"` inside the key `"password"`) is included as a caution: a property that fails on your own assertion is valid feedback, not a flake.
- A fact asserted in both a property and an example file doubles maintenance cost under the mutation-testing replay; the split table in the file is the guard against re-adding overlap.
- The same technique and rules apply in the paired frontend repo over `utils/formatters.ts` and `utils/uploads.ts` (noted at the bottom of the file map).
