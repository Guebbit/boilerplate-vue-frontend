---
source: tests/unit/scripts/audit/capture-matrix.spec.ts
sha256: 92d5eab245d434fc5d706e154c4cc3bc7347431ea6a46f9606ea569e4003a67e
signature: 92d5eab245d434fc5d706e154c4cc3bc7347431ea6a46f9606ea569e4003a67e
generated_at: 2026-11-10T08:11:27.525906+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/audit/capture-matrix.spec.ts

## Purpose

Unit tests for the `capture-matrix` script. They verify the pure expansion logic that turns audit "cases" and "action rows" into concrete screenshot shots (viewport × theme × locale combinations) with stable, unique IDs, and that helper utilities (`slugOf`, `moduleOfSpec`, `withLocale`, `statesOfAction`) produce the expected strings and arrays.

## Key elements

- **`expandCase`** (tested) — Expands a single case spec into a list of shots. Behavior differs for plain vs. prepared cases, pinned viewport/theme, `only` narrowing, and extra locales (extra locales add phone-only shots to plain cases only).
- **`expandCaptureCases`** (tested) — Expands an array of cases; guarantees globally unique shot IDs and throws `RangeError` on duplicate slugs.
- **`expandActionRow`** (tested) — Expands one action row (by `kind`) into shots per `statesOfAction` kind; encodes module, row index, name (truncated at 48 chars), state, viewport, theme into the shot `id`.
- **`expandActionRows`** (tested) — Plural wrapper; disambiguates rows sharing the same opening words via the numeric index.
- **`slugOf`** (tested) — Lowercases, strips punctuation, joins with dashes.
- **`moduleOfSpec`** (tested) — Extracts the module name from a spec file path, defaulting to `'shell'`.
- **`withLocale`** (tested) — Rewrites only the leading locale segment of a URL path.
- **`statesOfAction`** (tested) — Maps an action `kind` (`read`, `empty`, `form`, `dialog`, `row`, `slow`) to its list of photographable UI states.

## Relationships

- **Imports** every public export from `scripts/audit/design-manual/scripts/capture-matrix.ts` — that file is the sole subject under test.
- **Depends on** Vitest (`describe`, `it`, `expect`) for the test runner; no other runtime dependencies.

## Notes

- Shot ID format is positional and dash-delimited: `<module>--<name>…--<viewport>…--<theme>[--<locale>]`. The 48-char truncation test for `expandActionRow` shows that a trailing dash at the cut point is stripped (e.g. 47 `a`s + space → slug keeps exactly 47 `a`s, no dangling `-`).
- Plain cases (no `hasPrepare`) get the full 4-viewport×theme matrix plus locale extras; prepared cases are pinned to fewer viewports and never receive locale shots.
- A case that pins *only* a viewport *or* *only* a theme (but not both) yields zero shots for plain cases — the spec treats a single pin as an incomplete override.
- `statesOfAction('slow')` returns an empty array, so `expandActionRow` for a `slow` row produces no shots at all.
