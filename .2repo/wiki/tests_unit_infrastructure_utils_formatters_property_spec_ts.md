# tests/unit/infrastructure/utils/formatters.property.spec.ts

## Purpose

Property-based test suite (via `fast-check`) that asserts universal invariants of `formatText`, `formatCurrency`, `formatFlag`, `formatDateTime`, `formatDate`, and the upload predicates (`isAcceptedImageType`, `isWithinUploadSizeLimit`) for **every** generated input, not just hand-picked examples. It complements the example-based specs (`formatters.spec.ts`, `uploads.spec.ts`) by covering boundary cases, malformed currency codes, arbitrary strings, and edge inputs that sampling would miss.

## Key elements

- **`RUN`** — frozen config object: `seed: 20_260_808`, `numRuns: 200`, `endOnFailure: true`. Single point of change for reproducibility and runtime budget.
- **`nullish()`** — `fc.constantFrom(null, undefined)`; the two spellings the formatter signatures actually accept.
- **`makeFile(type, size)`** — minimal `File`-shaped object for upload-predicate tests.
- **`formatText` block** — asserts non-empty output, biconditional fallback rule, no trimming of valid input, idempotency.
- **`formatCurrency` block** — asserts fallback only for non-numbers, never throws on any string currency code, degrades to plain number (not `EMPTY_VALUE`) on bad code, always renders ≥ 1 digit.
- **`formatFlag` block** — asserts exactly three possible outputs and that `false` (distinct from `null`/`undefined`) yields `falseLabel`.
- **`formatDateTime` / `formatDate` blocks** — assert no-throw on arbitrary strings, fallback on falsy input, and that `formatDate` output is never longer than `formatDateTime` for the same instant.
- **`upload predicates` block** — asserts type acceptance is membership in `ACCEPTED_IMAGE_TYPES`, case-sensitivity matching the backend, and size limit is inclusive (`<=`).
- **`vi.mock('@/infrastructure/i18n')`** — pins `getCurrentLocale` to `'en'` so host-locale cannot alter assertions.

## Relationships

No graph neighbors are recorded. At runtime the file imports the functions under test from `@/infrastructure/utils/formatters` and `@/infrastructure/utils/uploads`, and mocks `@/infrastructure/i18n`. It is logically paired with (and defers specific-value assertions to) the example-based `formatters.spec.ts` and `uploads.spec.ts` in the same directory.

## Notes

- **Determinism is a hard rule.** A fixed seed is non-negotiable; a failing run must reproduce identically. `endOnFailure: true` keeps shrunk counterexamples short enough to paste into a regression `it()`.
- **Counterexample → regression case.** When a property fails, the shrunk input is recorded as a plain `it()` with the discovering seed in a comment. The property remains as the general statement.
- **`numRuns` is intentionally low (200).** This suite sits on the pre-commit path (~8.5 min gate). A property needing 10 000+ cases belongs in a nightly, not a commit hook.
- **Do not duplicate example-based facts here.** Check `formatters.spec.ts` / `uploads.spec.ts` first; a fact asserted in both places must be maintained in both.
- **`false` ≠ nullish for `formatFlag`.** A `!value` guard would conflate them; the property explicitly separates the three branches.
- **Locale is mocked, not parameterised.** If a test needs a non-`en` locale, that is a new concern, not a tweak to `RUN`.
