---
source: src/modules/locales/tests/schemas.spec.ts
sha256: 05c13da5268dec785c689c78fd7d78053278c52a14454eb46b39e970bdd27149
generated_at: 2026-10-17T01:06:00.679614+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/tests/schemas.spec.ts

## Purpose

Vitest suite that locks down the behavioral contract of the three Zod schemas exported from `../schemas`. Beyond happy-path and obvious rejection cases, it specifically asserts two things a plain `parse` would not exercise: BCP 47 case-sensitivity rules on the `tag` field, and that every error message is an i18n thunk resolved at parse time rather than frozen at import time.

## Key elements

- **`validLanguage`** – shared fixture (`tag: 'pt-BR'`, `name: 'Portuguese'`, `nativeName: 'Português'`) used as the base payload for single-field mutations.
- **`describe('localesLanguageSchema')`** – verifies BCP 47 tag pattern (accepts `en`, `pt-BR`; rejects lowercase region, wrong separators, empty, `por`, etc.), `.default()` on `direction`/`active`, restricted `direction` enum (`ltr`/`rtl`), and `minLength: 1` on `name`/`nativeName`.
- **`describe('localesLanguageEditSchema')`** – confirms the edit schema intentionally does **not** validate `tag` (the field is disabled in the UI and absent from the update API), while still enforcing `name`/`nativeName` and keeping the same defaults.
- **`describe('localesEntrySchema')`** – round-trips a complete entry and rejects empty `app`, `key`, or `value`.
- **`describe('every message is resolved at parse time')`** – the critical behavioral guard: for every `safeParse` failure, asserts each `issue.message` is non-empty and does **not** match Zod's built-in `"Too small: …"` text, proving the message came from an i18n thunk evaluated at parse time.

## Relationships

- **`src/modules/locales/schemas.ts`** – sole production dependency. The test imports `localesLanguageSchema`, `localesLanguageEditSchema`, and `localesEntrySchema` and exercises their parse/safeParse output. No other project modules are touched.

## Notes

- **Edit schema is deliberately permissive on `tag`.** A test asserts that a garbage tag string passes through `localesLanguageEditSchema` unchanged. This is not a bug; the field is read-only in the edit form and the `UpdateLocaleRequest` type has no `tag` property.
- **`.default()` vs `.optional()`.** The create schema uses Zod `.default()` so an omitted field becomes the contract's fallback value in the serialized payload, not `undefined`. A test explicitly checks the parsed output contains the concrete default.
- **Thunk assertion strategy.** Rather than comparing against a specific translated string (which would couple tests to locale vocabulary), the test asserts the message is non-empty and is *not* Zod's raw English fallback. If a thunk were missing, Zod's default `"Too small: …"` would leak through and the test would catch it.
- **BCP 47 case is a contract, not a typo.** `pt-br`, `PT-BR`, and `Pt-BR` are all rejected because the API stores the tag verbatim; normalizing case would silently change the identity of the language entry.
