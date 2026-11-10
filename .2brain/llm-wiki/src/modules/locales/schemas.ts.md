---
source: src/modules/locales/schemas.ts
sha256: 24b4a19aa74304be6205fcdbaf9d1d759afee8195eb687981feb144f26b8113f
signature: 1aaf2027846a8eb52ade7f46639d2e9ea3530d7b4a873d71de88101635ddcf53
generated_at: 2026-11-10T04:41:12.604797+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/schemas.ts

## Purpose

Zod validation schemas for the locale admin's two dialogs (language and entry). Error messages are defined as thunks (`() => translate(...)`) so they resolve against the *current* locale at parse time rather than freezing to whichever locale was active when the schema object was constructed.

## Key elements

- **`localesLanguageSchema`** — Zod object for the *create* language form. Validates `tag` (min 1, max/regex from `@api/schemas`), `name`, `nativeName`, and defaults `direction` to `LocaleDirection.ltr` and `active` to `true`.
- **`localesLanguageEditSchema`** — Extends the create schema, replacing `tag` with a bare `z.string()`. The tag is displayed but disabled in the UI and is not part of `UpdateLocaleRequest`; accepting anything here avoids a misleading "required" error on a field the user cannot edit.
- **`localesEntrySchema`** — Zod object for the *add-only* entry form. Validates `app`, `key`, and `value` (each `string().min(1)`).

## Relationships

- **`LanguageFormDialog.vue`** — Consumes `localesLanguageSchema` for create and `localesLanguageEditSchema` for edit, swapping between the two based on mode.
- **`EntryFormDialog.vue`** — Consumes `localesEntrySchema` to validate the add-entry form before submission.
- **`schemas.spec.ts`** — Unit-tests all three exported schemas (valid/invalid payloads, default values, error-message keys).

## Notes

- Error messages are thunks, **not** pre-resolved strings. This is intentional and load-bearing: the locale admin is the screen where the user switches language, so a string built at schema-creation time would remain in the old locale while surrounding labels update.
- `tag` validation reuses `createLocaleBodyTagMax` / `createLocaleBodyTagRegExp` from `@api/schemas` rather than a local copy, keeping the frontend contract in sync with the API.
- `direction` and `active` use `.default()` (not `.optional()`) so a missing value resolves to the contract's fallback instead of reaching the API as `undefined`.
- The entry schema is add-only by design; stored entries have immutable keys and inline value editing in the table, so no edit path passes through this schema.
