---
source: tests/unit/infrastructure/utils/formatters.property.spec.ts
sha256: 4276569ef077ad0d07aa269ddcbff489dcffe96d78f2d3f6ba2970c4c449fa20
signature: 6e178e90c7d85a553564deec0a35b1c663b5c34604158847d6af9dd08f542e64
generated_at: 2026-11-10T08:05:13.216794+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/utils/formatters.property.spec.ts

## Purpose

Property-based tests (via `fast-check`) that assert invariants for `formatText`, `formatCurrency`, `formatFlag`, `formatDateTime`, `formatDate`, and the upload-size/type predicates across **all** possible inputs—not just hand-picked examples. It exists to catch boundary, encoding, and degradation bugs that sampling-based suites structurally cannot reach.

## Key elements

- **`RUN`** — Shared fast-check config: `seed: 20_260_808`, `endOnFailure: true`. Single source of truth for the seed; `endOnFailure` shortens shrink output for easy regression transcription.
- **`nullish()`** — Arbitrary producing exactly `null` or `undefined`, matching the signatures' accepted inputs.
- **`amountText()`** — Arbitrary generating signed decimal strings (0–4 places) via `fromMinor`, used as realistic `formatCurrency` input.
- **`makeFile(type, size)`** — Minimal `File` stub exposing only the fields the upload predicates read.
- **`describe('formatText')`** — Four properties: never-blank output, biconditional fallback rule, non-trimming of non-blank input, idempotency.
- **`describe('formatCurrency')`** — Four properties: fallback iff not a decimal string, no-throw on any currency code, degradation shows the amount (not `EMPTY_VALUE`), decimal-place fidelity.
- **`describe('formatFlag')`** — One property: exactly three outputs, with `false` distinguished from nullish (guards against `!value`-style bugs).
- **`describe('formatDateTime')` / `describe('formatDate')`** — No-throw on any string, fallback for falsy input; `formatDate` is never longer than `formatDateTime` for the same instant.
- **`describe('upload predicates')`** — Biconditional type acceptance against `ACCEPTED_UPLOAD_TYPES`, case-sensitivity of MIME types, and size-limit boundary (file truncated).
- **`vi.mock('@/i18n')`** — Pins `getCurrentLocale` to `'en'` so locale differences cannot make assertions non-deterministic.

## Relationships

No graph neighbors are recorded for this file. It is a leaf test file.

## Notes

- **Seeded, not random.** Every run uses the fixed seed in `RUN`. A failed property must be reproducible; a flake is indistinguishable from a real regression otherwise.
- **Counterexample → regression case.** When fast-check shrinks a failing input, it must be transcribed into a plain `it()` with the seed in a comment. The property stays; the example becomes the permanent guard.
- **`numRuns` is modest by design.** Sourced from `TEST_PROPERTY_RUNS`; these run in the pre-commit gate (~8.5 min frontend budget). A property needing 10k runs belongs in a nightly suite, not a commit hook.
- **Split of responsibility.** Before adding a case here, check the example-based `formatters.spec.ts` / `uploads.spec.ts` first (referenced in the file header). A fact asserted in both files is maintained in both files.
- **Locale is mocked, not parameterized.** The `'en'` mock means these properties verify structural invariants (length, fallback, no-throw), not locale-specific formatting. Locale-specific output belongs in the example-based suite.
