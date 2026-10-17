---
source: src/modules/products/tests/release-date.spec.ts
sha256: 54890bf7501fc134a3c5298c6744e5db6c83883ccb445728f465934caaf73c13
generated_at: 2026-10-17T01:33:38.555216+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/release-date.spec.ts

## Purpose

Vitest spec that verifies the two spellings of the release-date field round-trip correctly: the `datetime-local` input value (wall-clock, minute precision) and the wire value (a UTC instant). It pins the contract that invalid or missing values are normalised to an empty string in both directions.

## Key elements

- **`describe('release date spellings')`** – top-level suite.
- **`it('reads an instant back to the minute it was typed at')`** – asserts `toDateTimeLocal(fromDateTimeLocal(x)) === x` for a sample `datetime-local` string, proving lossless round-trip at minute precision.
- **`it('writes the typed wall-clock time as one UTC instant')`** – asserts `fromDateTimeLocal` produces the same ISO string as a local-time `new Date(...)` converted via `.toISOString()`, i.e. the wire value is a UTC instant.
- **`it.each([undefined, null, '', 'not a date'])('reads %j as an empty field')`** – parameterised test that `toDateTimeLocal` returns `''` for any absent/invalid input.
- **`it.each([undefined, null, '', 'not a date'])('writes %j as no date')`** – parameterised test that `fromDateTimeLocal` returns `''` for any absent/invalid input.

## Relationships

- **Imports `fromDateTimeLocal`, `toDateTimeLocal` from `../domain`** (`src/modules/products/domain/index.ts`), which re-exports them from **`src/modules/products/domain/release-date.ts`** where the actual parsing/serialisation logic lives. This file exercises that logic in both directions and for edge cases.

## Notes

- The suite is intentionally timezone-agnostic: it runs under whatever zone the CI/dev host has. The contract under test is that the *input* is wall-clock and the *output* is the same instant, not a specific UTC offset.
- Precision is minutes only — seconds and sub-second components are out of scope (the `datetime-local` format carries no seconds).
- `fromDateTimeLocal` returning `''` (not `null`/`undefined`) for invalid input is an explicit part of the contract; callers must treat `''` as "no date set."
