---
source: src/modules/locales/schemas.ts
sha256: f911daa7b9ec3879818940478c8099e250d926f9ee0f203c94914c8f068d98c9
generated_at: 2026-10-17T01:04:29.885796+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/schemas.ts

## Purpose

Zod validation schemas for the two locale-admin forms (language and entry). Error messages are written as thunks wrapping `translate` so they resolve to the active locale at parse time rather than being frozen at module-load time.

## Key elements

- **`LANGUAGE_TAG_PATTERN`** (module-private) — Regex `^[a-z]{2}(-[A-Z]{2})?$` enforcing BCP 47 primary subtag plus optional region subtag (e.g. `pt-BR`).
- **`localesLanguageSchema`** — Schema for the create-language form. Validates `tag`, `name`, `nativeName` (all `min(1)`). `direction` defaults to `'ltr'`, `active` defaults to `true` via `.default()` (not `.optional()`) so omitted fields resolve to the API contract's fallback.
- **`localesLanguageEditSchema`** — Extends the create schema, replacing `tag` with a plain `z.string()` since the field is read-only on edit and `UpdateLocaleRequest` carries no `tag` property.
- **`localesEntrySchema`** — Schema for the add-entry form. Validates `app`, `key`, `value` (all `min(1)`). Used only for creation; edits happen inline in the table.

## Relationships

- **`LanguageFormDialog.vue`** — Consumes `localesLanguageSchema` (create mode) and `localesLanguageEditSchema` (edit mode) for form validation.
- **`EntryFormDialog.vue`** — Consumes `localesEntrySchema` for form validation.
- **`tests/schemas.spec.ts`** — Unit-tests all three exported schemas.

## Notes

- Error messages are **thunks** (`() => translate(...)`), not plain strings. This is deliberate: the locale-admin screen is where a visitor switches the active language, so a string baked in at module load would stay in the old language while surrounding labels move.
- `direction` and `active` use `.default()` rather than `.optional()`. This ensures a missing value becomes the contract's own fallback (`'ltr'` / `true`) instead of reaching the API as `undefined`.
- `localesLanguageEditSchema` relaxes `tag` to `z.string()` not because it should accept anything, but because the field is disabled in the UI and the API never reads it on update. The alternative (conditionally omitting `tag`) would leave a required field unchecked on the create form.
- `localesEntrySchema` is create-only by design: a stored entry's key is immutable and its value is edited inline in the table, so the dialog is never re-opened for an existing row.
