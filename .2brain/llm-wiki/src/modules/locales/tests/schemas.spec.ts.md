---
source: src/modules/locales/tests/schemas.spec.ts
sha256: 0ddfb1269179a0ca35c2d64fa4a1c11e8f373c28fd55fa8044e271b7a4ef7a10
signature: 15c0d98220096de479cc4c5f7101d7d12a61a4ce93a8d9b6fd28e77db97bb901
generated_at: 2026-11-10T04:44:57.393270+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/tests/schemas.spec.ts

## Purpose

Vitest spec for the three Zod schemas that validate locale-admin form payloads (create, edit, entry). Beyond happy-path and rejection checks, it verifies two invariants a normal parse would never expose: the BCP 47 tag pattern's breadth (casing, script, numeric subtags, 3-letter languages) and that every error message is a *thunk* resolved against the active locale at parse time rather than frozen at import time.

## Key elements

- **`validLanguage`** — shared baseline payload (`pt-BR` / "Portuguese" / "Português") used by every test that mutates one field.
- **`describe('localesLanguageSchema')`** — create-form schema. Covers tag accept/reject sets, `direction`/`active` defaults (`.default()`, not `.optional()`), `name`/`nativeName` min/max length, and the two-enum constraint on `direction`.
- **`describe('localesLanguageEditSchema')`** — edit-form schema. Confirms `tag` is intentionally left unvalidated (disabled in UI, absent from `UpdateLocaleRequest`), while `name`/`nativeName` stay required and defaults are preserved.
- **`describe('localesEntrySchema')`** — single-entry schema (`app`, `key`, `value`). Asserts passthrough on valid input and rejection of empty strings in any field.
- **`describe('every message is resolved at parse time')`** — meta-test. Feeds all-empty payloads to both `localesLanguageSchema` and `localesEntrySchema`, then asserts no `issue.message` is empty and none matches Zod's built-in `"Too small: …"` text. This is the regression guard for the thunk pattern.

## Relationships

- **`src/modules/locales/schemas.ts`** — sole import target. The spec imports `localesLanguageSchema`, `localesLanguageEditSchema`, and `localesEntrySchema` and exercises them exclusively; no other module is touched.

## Notes

- The thunk test asserts *message shape*, not translated text. It checks that messages are non-empty and don't start with "Too small" (Zod's default). The actual i18n key/text is locale-dependent and out of scope here.
- `direction` accepts exactly `'ltr'` | `'rtl'`; anything else (e.g. `'ttb'`) is rejected.
- The edit schema's permissive `tag` field is deliberate, not a gap: the field is disabled in the UI and the API contract omits it, so strict validation would only risk breaking the form without protecting the server.
- `name` and `nativeName` have a max length of 100 characters (tests use 101 to confirm rejection).
