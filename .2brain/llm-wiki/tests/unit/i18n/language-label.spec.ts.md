---
source: tests/unit/i18n/language-label.spec.ts
sha256: aee03bebddf801056f31f5eb7b859f334fa264a23cd8eecffd500e02ced860a8
generated_at: 2026-10-17T02:33:56.522422+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/i18n/language-label.spec.ts

## Purpose

Unit tests for the `languageLabel` function, verifying its four-level fallback chain for producing a human-readable language name in the UI language switcher: app translation → manifest native name → `Intl.DisplayNames` → raw BCP-47 code.

## Key elements

- **`describe('languageLabel', …)`** — Vitest suite containing five `it` blocks, each exercising one rung of the fallback chain.
- **`afterEach`** — Deletes the mutated `localeNativeNames.es` key so the "manifest native name" test doesn't leak into subsequent tests.
- **Test 1 — translated name** — Asserts that when `te('generic.it')` is true, the localized string (`'italiano'`) is returned directly.
- **Test 2 — manifest fallback** — Sets `localeNativeNames.es = 'Español'` and asserts that string is returned when no app translation exists.
- **Test 3 — `Intl.DisplayNames` fallback** — Asserts the result matches `new Intl.DisplayNames(['en'], { type: 'language' }).of('es')`.
- **Test 4 — viewing-language awareness** — Passes `'it'` as the UI locale and confirms the fallback label is rendered in Italian, not in the language being labelled.
- **Test 5 — raw code fallback** — Uses a non-existent code (`'made-up-code'`) to confirm the bare code is returned as a last resort.

## Notes

- The `te`/`t` pair is mocked inline per test rather than imported from a shared helper; each test supplies just enough of the i18n API to isolate the path under test.
- `localeNativeNames` is imported as a mutable object and mutated in-place (not re-assigned), so `afterEach` must explicitly `delete` the key to restore state.
- The `languageLabel` import uses an explicit `.ts` extension, matching the project's ESM import convention.
