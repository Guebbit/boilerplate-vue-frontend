---
source: scripts/audit/design-manual/scripts/capture-matrix.ts
sha256: b69a93bd77a7946ac86e6865c6ad4612fb2a5cc52f43ef520967c7efdabe2a13
signature: 8bb612630ace0ebd96483c99ed8fd07f5e0e7b6aeb24b245793be5bd08b996e8
generated_at: 2026-11-10T02:20:35.585179+00:00
model: ollama:qwen3.8:27b
---

# scripts/audit/design-manual/scripts/capture-matrix.ts

## Purpose

Pure-function module that decides **which screenshots a sweep case or action-table row produces** in design-manual capture mode. It encodes the editorial rules (which viewports, themes, and locales matter for a given case) so the sweep runner and action-table runner can plan shots without any I/O or Cypress dependency.

## Key elements

- **`CaptureCaseShape`** / **`PlannedShot`** – input/output interfaces for sweep-case expansion.
- **`PLAIN_SHOTS`**, **`PREPARED_SIZES`** – hardcoded viewport/theme combinations used by the expansion logic (phone gets both light and dark; tablet/desktop light-only; prepared cases get phone + desktop).
- **`slugOf(text)`** – normalizes an arbitrary label into a kebab-case slug.
- **`moduleOfSpec(specRelative)`** – extracts the module folder name from a spec path, defaulting to `'shell'`.
- **`withLocale(route, locale)`** – rewrites the `/en` prefix to another locale for non-default locales.
- **`expandCase(shape, module, locales)`** – the core pure function: returns the `PlannedShot[]` for one sweep case. Plain cases get 4 shots (+ per-locale phone shots); prepared cases get 1–2 shots; pinned size/theme cases with no `prepare` return `[]`.
- **`expandCaptureCases(shapes, module, locales)`** – maps `expandCase` over all cases and throws `RangeError` on duplicate shot ids.
- **`ActionState`**, **`ActionRowShape`**, **`PlannedActionShot`** – types for action-table row expansion (states: `loading`, `error`, `empty`).
- **`statesOfAction(kind)`** – maps a row kind to the states it is photographed in (`read`→loading+error, `empty`→loading+empty, `slow`→none, others→error).
- **`expandActionRow(shape, module)`** – expands one row into shots at phone + desktop, light only.
- **`expandActionRows(rows, module)`** – maps `expandActionRow` over all rows and throws `RangeError` on duplicate ids.

## Relationships

- **`scripts/e2e/viewports.ts`** – imports the `ViewportName` type used throughout this file's interfaces and constants.
- **`scripts/audit/design-manual/scripts/capture-scope.ts`** – upstream: defines the sweep cases whose shape feeds into `expandCase` / `expandCaptureCases`.
- **`tests/support/e2e/design-capture.ts`** – downstream consumer: executes the `PlannedShot[]` / `PlannedActionShot[]` this file produces.
- **`tests/support/e2e/action-table.ts`** – graph neighbor that works with this file's action-table expansion utilities (`ActionRowShape`, `expandActionRow`, `expandActionRows`).
- **`tests/support/e2e/a11y-sweep.ts`** – sweep runner that calls into this module at collection time to obtain the shot plan.
- **`tests/unit/scripts/audit/capture-matrix.spec.ts`** – unit-test suite covering the expansion rules and id-collision guards.

## Notes

- This file is intentionally **pure** (no Cypress, no disk, no `import` of test-framework globals). The sweep calls it once per case at collection time; the result is serializable.
- `expandCase` returns an **empty array** (not a single shot) when a case has a pinned `viewport` or `theme` but no `prepare` step — those are layout variants of a plain case and are deliberately skipped.
- The `only` field on `CaptureCaseShape` acts as a filter: if a case declares it only works at certain sizes, `PLAIN_SHOTS` entries for excluded sizes are dropped.
- Action-row slugs are truncated to **48 chars** (`ACTION_SLUG_LENGTH`) and the row **index** is embedded in the id to disambiguate rows that share opening words.
- The `--locale` suffix in a shot `id` is omitted for `DEFAULT_LOCALE` (`en`), making the default-locale ids shorter.
- Duplicate-id detection in `expandCaptureCases` / `expandActionRows` throws `RangeError` rather than silently overwriting a screenshot file.
