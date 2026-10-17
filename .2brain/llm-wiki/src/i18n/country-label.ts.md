---
source: src/i18n/country-label.ts
sha256: a0fc0fd2b9d9dc7fb956cabd1bcff9f32a4114557ec532563dfe0ed36c786264
generated_at: 2026-10-17T00:07:59.649985+00:00
model: ollama:qwen3.8:27b
---

# src/i18n/country-label.ts

## Purpose

Provides a localized display name for an ISO 3166-1 alpha-2 country code, rendered in the viewer's current language. It uses the browser's built-in `Intl.DisplayNames` API so the project can avoid a third-party dependency (`i18n-iso-countries`, which was rejected for not meeting the repo's 12-month maintenance-window requirement).

## Key elements

- **`countryLabel(code: string, viewingLocale: string): string`** (the sole export) — Returns the country's localized name (e.g. `"Italy"` for `IT` in English). Falls back to the bare code string if `Intl.DisplayNames` cannot resolve it (malformed tag, missing CLDR data, or an engine without support).

## Relationships

No formal dependency-graph neighbors. The doc comment references two related files:

- **`language-label.ts`** — the analogous `languageLabel` function for language codes; `countryLabel` mirrors its pattern (same try/catch reasoning, same fallback strategy).
- **`AddressFormDialog.vue`** — the UI consumer; calls `countryLabel` to populate the country `<select>` options.

## Notes

- The `try/catch` around `new Intl.DisplayNames(...)` is intentional and carries an `eslint-disable no-restricted-syntax` comment: `Intl.DisplayNames` has **no non-throwing pre-check** for malformed BCP-47 tags or unsupported engines, so catching is the only safe option.
- The `?? code` inside the `try` block guards against `.of(code)` returning `undefined` (e.g. an unrecognized region code that the engine simply doesn't know).
- `type: 'region'` is hardcoded; this function is not general-purpose for other `Intl.DisplayNames` types (language, script, etc.).
