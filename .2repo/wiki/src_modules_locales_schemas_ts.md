# src/modules/locales/schemas.ts

## Purpose

Defines Zod validation schemas for the two forms in the locale admin (language list and translation-entry list). Error messages are wrapped in thunks that call `translate` at parse time, so they resolve in whatever locale is active when the user submits rather than freezing at schema-creation time.

## Key elements

- **`LANGUAGE_TAG_PATTERN`** (private const) — Regex `^[a-z]{2}(-[A-Z]{2})?$` enforcing the BCP 47 shape the API accepts (e.g. `pt-BR`, not `pt-br` or `por`).
- **`localesLanguageSchema`** (exported) — Zod object for the *create* language form. Validates `tag` (non-empty + pattern), `name`, `nativeName` (all required), `direction` (`'ltr' | 'rtl'`), and `active` (boolean).
- **`localesLanguageEditSchema`** (exported) — Extends `localesLanguageSchema`, replacing `tag` with a plain `z.string()` so the field renders disabled in the edit dialog without conditionally optional logic.
- **`localesEntrySchema`** (exported) — Zod object for the *add-entry* form. Validates `tenant`, `key`, and `value` as non-empty strings. Entries are never edited through the dialog (value edits happen inline in the table).
- **`translate`** (imported from `@/infrastructure/i18n`) — Used inside every error thunk so messages are looked up at parse time.

## Relationships

- **`@/infrastructure/i18n`** — provides `translate`, the lazy-lookup function every error thunk calls.

## Notes

- Error messages are **thunks** (`() => translate(...)`), not plain strings. This is deliberate: the locale admin is the screen where a visitor changes the active language, so a string captured at module-load time would display in the old language while surrounding labels have already switched.
- The edit schema does **not** re-validate `tag` against the BCP 47 pattern. The field is disabled in the UI and the API keeps it immutable; the schema only needs the field to be a string so Zod doesn't reject the form.
- `localesEntrySchema` has no "edit" variant by design — a stored entry's key is immutable and its value is edited inline, so no edit dialog exists to need one.
