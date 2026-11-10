---
source: tests/support/unit/pattern-samples.ts
sha256: fbd5a9accb99cd722a892fe2ca5a0d531ec88982f005dce56c29c3db40cd5c5b
signature: 5a3e4ca2a9211294841b07098126f8b22a203caaa6747d950fbd1cc1beb91c13
generated_at: 2026-11-10T07:42:42.244254+00:00
model: ollama:qwen3.8:27b
---

# tests/support/unit/pattern-samples.ts

## Purpose
Provides a single lookup table of known-good string values for regex patterns declared in the OpenAPI contract. When a generator walks the contract and encounters a pattern it cannot synthesize on its own (e.g. locale tags, ISO codes, ObjectIds), it consults this table instead of guessing. A pattern with no registered entry causes a loud failure rather than emitting a value the contract would reject.

## Key elements
- **`PATTERN_SAMPLES`** (module-private) — `Record<string, string>` mapping a regex *source* (exactly as `openapi.yaml` / `RegExp.source` writes it) to a sample value that satisfies it. Covers locale tags, country codes, currency codes, ObjectIds, identifier-shaped strings, and an https URL prefix.
- **`usesLookaround(source: string): boolean`** — Exports a helper that detects whether a pattern contains lookaround (`(?=`, `(?!`, `(?<=`, `(?<!`) via a meta-regex. Used to skip patterns that `fast-check`'s `stringMatching` cannot handle (it throws on lookarounds).
- **`sampleForPattern(source: string): string | undefined`** — Exports the lookup; returns the registered sample or `undefined` when the pattern has no entry.

## Relationships
- **`tests/support/unit/contract-data.ts`** — The generators that walk the contract (and thus call `sampleForPattern` / `usesLookaround`) derive the regex sources they pass in from the contract data defined there. The keys in `PATTERN_SAMPLES` must match the `source` strings that appear in that data; a mismatch means the lookup silently returns `undefined`.

## Notes
- This file is a **fork** of the BE repo's `tests/support/pattern-samples.ts` and is explicitly *not* kept in step with it. Do not sync changes from the BE copy.
- Keys are the raw regex source string, **not** a `RegExp` object or a named identifier. Adding a new pattern to the contract requires adding a matching literal key here, or the generator will fail.
- The `'\^[A-Za-z0-9_-]+$'` and `'^[\\w-]+$'` entries both map to `'abc'` because the generated zod schema spells `[A-Za-z0-9_]` as `\w` — both forms must be present to cover both halves of the contract.
