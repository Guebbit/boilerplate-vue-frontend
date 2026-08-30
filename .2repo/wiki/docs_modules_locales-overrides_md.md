# docs/modules/locales-overrides.md

## Purpose

Documents the two-tier runtime translation override system: how bundled (tier 1) locale files and server-side (tier 2) editor rows are merged key-by-key, the rules that govern that merge, and the admin screens that manage tier 2 entries.

## Key elements

- **Tier 1 (bundled)** — `locales/<code>.json` per module, loaded as separate chunks; renders when no override exists or the API is unreachable.
- **Tier 2 (server rows)** — fetched via `GET /locales/{tag}/messages`; merged over tier 1 key by key.
- **Merge rule** — overrides patch existing keys only; they never introduce new keys. The bundled files define what exists.
- **Consumer half** — `infrastructure/i18n/locale-overrides.ts`; runs on every page for every visitor; knows nothing about the admin module.
- **Author half** — `LocalesList` (language management) and `LocaleEntries` (per-language rows) screens, both `admin`-routed.
- **Bulk import** — `PATCH /locales/{id}/entries` merges a batch in one call rather than one request per key.
- **Scopes** — `GET /locales` reports `api` and `app` scopes per language, separating "can the API serve this language" from "can the app download a dictionary for it."

## Relationships

- **`docs/modules/locales.md`** — parent module page. This page covers the overrides sub-topic; `locales.md` covers the broader locales module. The two share the boot-path routes (`GET /locales`, `GET /locales/{tag}/messages`) which are registered in `infrastructure`, not in this module's folder.

## Notes

- **Existing ≠ answerable.** A language row in the DB does not guarantee an API-side dictionary file exists. The `es` seed entry demonstrates this: `api` scope is "no", `app` scope is "yes."
- **Deleting the admin module is cheap.** All rendering flows through the consumer half in `infrastructure`; removing `LocalesList`/`LocaleEntries` stops editing but not display.
- **The merge direction is the critical invariant.** If a translator could introduce a key, it would render nowhere and look like an app bug. The "files decide what exists; rows decide what it says" rule prevents that.
