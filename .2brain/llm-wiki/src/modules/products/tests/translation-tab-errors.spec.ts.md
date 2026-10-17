---
source: src/modules/products/tests/translation-tab-errors.spec.ts
sha256: ffc42d60ba08b1d02059fc3ebc2a75650654c909dfabcd5ae383120d4345189c
generated_at: 2026-10-17T01:34:43.194622+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/translation-tab-errors.spec.ts

## Purpose

Vitest spec that pins the three exports of `translation-tab-errors.ts`—the composable that turns validation/server errors into a per-locale error-count map used by the product form's language-tab badges. Every test targets an edge case the production code must handle: non-translation paths, malformed items, and the three envelope shapes a rejected write can arrive in.

## Key elements

- **`describe('translationTabErrorCounts')`** — tests the core flat-issue bucketer directly. Verifies it groups by the locale at `path[1]`, skips issues whose path lacks a locale segment (top-level, whole-body refinements, single-segment paths), and returns `{}` for an empty array.
- **`describe('translationTabErrorCountsFromZodError')`** — confirms the Zod adapter delegates to the same bucketing rule, constructing a real `ZodError` instance.
- **`describe('translationTabErrorCountsFromServerError')`** — covers the server adapter across its three recognized envelopes (`error.errors`, `error.data.errors`, `error.response.data.errors`), plus rejection of non-translation field pointers, items missing `details` or with a non-string `field`, and fully unrecognizable inputs (`Error`, string, `null`).

## Relationships

- **`src/modules/products/composables/translation-tab-errors.ts`** — the module under test. The spec imports all three public exports (`translationTabErrorCounts`, `translationTabErrorCountsFromZodError`, `translationTabErrorCountsFromServerError`) and exercises them with hand-built issue arrays, `ZodError` instances, and plain-object error shapes.

## Notes

- The two error sources use different field-pointer conventions: Zod issues carry an array path (`['translations', 'it', 'title']`), while server errors carry a dot-separated string (`translations.it.title`). The spec asserts both are reduced to the same `{ locale: count }` shape.
- The "three envelope shapes" tested for `translationTabErrorCountsFromServerError` are, in priority order: `error.errors`, `error.data.errors`, and `error.response.data.errors` (the axios rejection shape). If a shape is not recognised, the function must return `{}` rather than throw.
- `translationTabErrorCounts` is the single source of truth for bucketing; the Zod and server variants are thin adapters that normalise their input into flat issues before delegating. Changes to locale-extraction logic only need to be made in the core function.
