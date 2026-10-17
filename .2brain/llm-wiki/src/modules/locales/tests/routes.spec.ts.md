---
source: src/modules/locales/tests/routes.spec.ts
sha256: 3f5d9a8bf5a662daeb8d429eaa6633d24c68e1fe40d045e3fa914fcf120b031a
generated_at: 2026-10-17T01:05:48.784023+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/tests/routes.spec.ts

## Purpose
Pin-tests the `meta.access` and `meta.can` declarations on every route the locales module exports. It verifies the security metadata is *present and correct* at the data level, complementing a separate router spec that proves enforcement is *attached*. Running this spec requires no app boot, no locale prefix, and no resolved router.

## Key elements
- **`byName(name)`** – local lookup helper that finds a `RouteRecordRaw` in the imported `routes` array by its `name` property.
- **`it.each([...])` block** – table-driven test asserting, per route name, the exact `meta.access` string and the `meta.can` tuple (`[action, subject]` or `undefined`). Covers `LocalesList`, `LocalesDictionary`, `LocaleEntries` (all `auth` / `update` / `Locale`) and `EntityTranslations` (`auth` / `read` / `Translation`).
- **"declares no route this file does not know about"** – sorted equality check on the full set of route names, catching any route added to `routes.ts` without a corresponding access entry here.

## Relationships
- **`src/modules/locales/routes.ts`** – the sole import. The spec reads the default-exported `routes` array (an array of `RouteRecordRaw`) and asserts on each record's `meta` fields. No other file is touched.

## Notes
- `EntityTranslations` deliberately uses `read` + `Translation` rather than the `update` + `Locale` pattern of the other three routes; the comment notes no shipped role currently holds that exact shape, but the key is kept separable.
- The catch-all test is the only guard against a new route being added to `routes.ts` with no access decision at all — every other test is scoped to the four known names.
- Expected values are written out literally (not derived from the route object) so a silent removal of `meta.access` fails the assertion instead of passing vacuously.
- Test placement follows `docs/theory/modules.md`: the spec lives alongside the module it describes, as a fact about this domain rather than a global router concern.
