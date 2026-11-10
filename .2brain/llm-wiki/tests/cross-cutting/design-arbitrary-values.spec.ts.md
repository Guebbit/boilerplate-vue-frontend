---
source: tests/cross-cutting/design-arbitrary-values.spec.ts
sha256: 13fc648b0e5aaf2654439bd02c4be0cf275e6486168c0cc6cb5ec5eb2f41e272
signature: a15d226bb379a09c47dbed95261721e96a8db7d36ca4cdc17a2f97c96c1cc07b
generated_at: 2026-11-10T06:36:13.487166+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/design-arbitrary-values.spec.ts

## Purpose

Cross-cutting design-lint test that enforces a single rule across the entire codebase: no Tailwind arbitrary-value class (e.g. `w-[420px]`) may appear in more than `arbitraryRepeatLimit` places. A repeated value is a signal that it belongs as a named token in `main.css`, not as a scattered inline value. Lint tools check one file at a time and cannot see this pattern; this test closes that gap.

## Key elements

- **`styledFiles()`** — Globs `src/**/*.{vue,ts}` and filters out test files, returning the set of files that actually style the app.
- **`withoutComments(source)`** — Strips HTML (`<!-- -->`), block (`/* */`), and line (`//`) comments so that a class mentioned in prose is not counted as a usage.
- **`ARBITRARY_CLASS`** (regex) — Matches a Tailwind arbitrary-value utility: optional variant prefixes, a utility name, the required `[value]` bracket, and an optional `/opacity` suffix.
- **`placesOf(token)`** — Iterates every styled file, applies the regex to comment-stripped source, and returns a `Map<string, number>` of class → total occurrence count (per-occurrence, not per-file).
- **Test 1 – "finds some arbitrary values"** — Sanity guard: asserts the scanner matches at least one class, preventing a broken regex from making the enforcement test pass vacuously.
- **Test 2 – "has none repeated beyond the limit"** — The actual gate: filters `placesOf` results to entries exceeding the policy's repeat limit and expects an empty list. Failure message instructs the developer to add the value to `@theme` in `main.css` and run `npm run lint:fix`.

## Relationships

- **`scripts/design-policy.ts`** — Imports the `DESIGN_POLICY` object from this file and reads its `arbitraryRepeatLimit` field as the threshold used by the enforcement test. This is the single source of truth for how many times an arbitrary value may repeat before it must be tokenized.

## Notes

- Counting is per **occurrence**, not per file: the same class used twice in one SFC counts as 2.
- The test resolves files relative to `process.cwd()`, so it must be run from the repo root (the default vitest working directory).
- The sanity test (Test 1) exists specifically to catch a silent regex regression: without it, Test 2 would pass with zero matches and the gate would be silently disabled.
- The failure message is intentionally actionable — it names the target file (`src/styles/main.css`) and the fix command.
