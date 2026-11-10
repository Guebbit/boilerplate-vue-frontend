---
source: src/modules/products/tests/translation-tab-errors.spec.ts
sha256: 7012e171b8bc3a5d97d89e1224f7611774ae9405a89536b0127f4fd3bc3b0a52
signature: 7012e171b8bc3a5d97d89e1224f7611774ae9405a89536b0127f4fd3bc3b0a52
generated_at: 2026-11-10T05:32:11.171237+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/translation-tab-errors.spec.ts

## Purpose

Vitest spec that pins the behavior of the three error-counting helpers in `../translation-tab-errors`. It exists so that the flat-issue bucketer, the Zod-error adapter, and the server-error adapter each remain correct across their documented edge cases (non-translation paths, malformed items, and the three envelope shapes a rejected write can arrive in).

## Key elements

- **`describe('translationTabErrorCounts')`** — 4 tests verifying the core bucketer: groups by `path[1]` when `path[0]` is `'translations'`; returns `{}` for non-locale paths, top-level refinements, single-segment `['translations']` paths, and an empty issue array.
- **`describe('translationTabErrorCountsFromZodError')`** — 1 test confirming the Zod adapter delegates to the same bucketing rule by reading `ZodError.issues`.
- **`describe('translationTabErrorCountsFromServerError')`** — 6 tests covering:
  - Reading `error.errors` directly.
  - Falling back to `error.data.errors`.
  - Falling back to `error.response.data.errors` (axios-shaped rejection).
  - Ignoring field pointers outside `translations.*` (e.g. `price`).
  - Ignoring items with missing `details` or a non-string `details.field`.
  - Returning `{}` for `new Error(...)`, a plain string, and `null`.

## Relationships

- **`src/modules/products/translation-tab-errors.ts`** — the sole production dependency. This spec imports and exercises all three of its exports: `translationTabErrorCounts`, `translationTabErrorCountsFromZodError`, and `translationTabErrorCountsFromServerError`. No other module is imported.

## Notes

- The flat bucketing rule is positional: `path` must be an array with `path[0] === 'translations'` and `path[1]` a locale string. Anything else is silently dropped.
- The server-error path uses **dot-notation strings** (`translations.it.title`) in `details.field`, not the array form used by Zod. The two adapters are independent entry points into the same underlying count.
- The three envelope shapes (`error.errors` → `error.data.errors` → `error.response.data.errors`) are tested in priority order; the implementation is expected to return the first match it finds.
- The spec deliberately feeds `null`, a string, and a bare `Error` to the server adapter to lock in the "no `errors` array anywhere" guard—these inputs have no `.errors` property, so the function must not throw.
