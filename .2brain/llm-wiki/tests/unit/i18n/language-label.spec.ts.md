---
source: tests/unit/i18n/language-label.spec.ts
sha256: aee03bebddf801056f31f5eb7b859f334fa264a23cd8eecffd500e02ced860a8
signature: aee03bebddf801056f31f5eb7b859f334fa264a23cd8eecffd500e02ced860a8
generated_at: 2026-11-10T07:53:36.029475+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/i18n/language-label.spec.ts

## Purpose
Unit tests for the `languageLabel` function, which resolves the display name of a language in the app's language switcher. The tests verify the full fallback chain and the "read label in the viewer's language" rule.

## Key elements
- **`describe('languageLabel')`** — single block with five `it` cases covering the fallback ladder:
  1. App-local translation exists (`te` returns true) → use it.
  2. No app translation, but `localeNativeNames[code]` is set → use the manifest's native name.
  3. No manifest entry → use `Intl.DisplayNames` in the *viewer's* locale.
  4. Viewer locale is not the option's own code (e.g. viewing `es` while UI is `it`) → still resolves via `Intl.DisplayNames` in `it`.
  5. Unknown code with no translation, no manifest entry, and no `Intl` match → return the bare code string.
- **`afterEach`** — deletes the test-mutated `localeNativeNames.es` key to prevent cross-test leakage.
- **Mock i18n context** — each call passes a minimal `{ te, t }` object instead of a real i18n instance.

## Relationships
No graph neighbors are tracked for this file. The test imports `languageLabel` from `@/i18n/language-label.ts` and the mutable `localeNativeNames` record from `@/i18n`, but neither appears in the dependency graph.

## Notes
- `localeNativeNames` is **shared mutable state** imported from `@/i18n`. Only `.es` is cleaned up in `afterEach`; if future tests set other keys they must clean them too.
- The fallback order is strict and is the primary contract being asserted: *app translation → manifest → `Intl.DisplayNames` → raw code*.
- The `te`/`t` pair simulates the i18n backend; `te` acts as a "translation exists?" probe and `t` as the lookup. Keep this contract in mind when updating the test or the SUT.
