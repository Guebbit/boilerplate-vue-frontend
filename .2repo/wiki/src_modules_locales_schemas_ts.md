# src/modules/locales/schemas.ts

## Purpose

Zod validation schemas for the locale admin's two forms (language and entry). Error messages are written as thunks wrapping `translate()` so they resolve to whatever locale is active at parse time, rather than freezing to the locale that was active when the schema object was created.

## Key elements

- **`LANGUAGE_TAG_PATTERN`** – Regex enforcing the BCP 47 shape the API accepts: lowercase primary subtag, optional uppercase region (`^[a-z]{2}(-[A-Z]{2})?$`).
- **`localesLanguageSchema`** – Create-form schema. Validates `tag` (non-empty + pattern), `name`, `nativeName` (non-empty strings), `direction` (`'ltr' | 'rtl'`), and `active` (boolean).
- **`localesLanguageEditSchema`** – Extends the create schema, replacing `tag` with a plain `z.string()` (non-empty). The tag is displayed but immutable on edit; the dialog swaps to this schema instead of making the field conditionally optional.
- **`localesEntrySchema`** – Add-only schema for translation entries: `tenant`, `key`, `value` (each a required non-empty string).

## Relationships

- Imports `translate` from `@/infrastructure/i18n`; every error message calls it inside a zero-arg thunk so translation is deferred to parse time.
- No other graph neighbors.

## Notes

- The edit schema deliberately **replaces** `tag` validation rather than making it optional. This keeps the create form's required-tag check intact while the edit dialog simply shows the tag disabled.
- Entry values are edited inline in the table, not through this schema — there is no update/edit entry schema here.
- Client-side validation of `tenant` is only non-emptiness; the API rejects unknown registry IDs with a 422.
