# docs/modules/locales.md

## Purpose

Documents the `locales` module: the admin screens and Pinia store that let a translator manage which languages exist and edit per-key entries. The module is fully standalone—zero imports in or out—and exists purely as the authoring half of the i18n feature (the consumer half lives in `infrastructure/i18n/locale-overrides.ts`).

## Key elements

- **3 screens** (all `admin` access): `LocalesList` (CRUD languages), `LocalesDictionary` (dictionary view), `LocaleEntries` (per-language entry editor at `locales/:tag`).
- **Store `locales`** (`store.ts`): state (`capabilities`, `tenants`, `defaultLocale`, `fallbackLocale`, `filters`, pagination refs), getters (`ownTenant`, `backendTenant`, `loading`, `pageTotal`, `pageItemList`), and 14 actions covering tenant/language/entry CRUD plus dictionary fetches.
- **`dictionaries.ts`**: the runtime merge that layers server rows over bundled locale files, key by key; unedited keys fall back to bundled text.
- **`module.ts`**: the manifest declaring routes, navigation, response schemas, dependency edges (none), and locales (`en`, `it`).
- **`response-schemas.ts`**: 9 Zod envelopes, one per endpoint (`POST/PUT/DELETE /locales/{id}`, `PATCH/POST/PUT/GET/DELETE /locales/{id}/entries…`).
- **`schemas.ts`**: form schemas built on generated request schemas.
- **Components**: `EntriesImportDialog.vue`, `EntryFormDialog.vue`, `LanguageFormDialog.vue` (internal; no barrel export).
- **Locale files**: `locales/en.json`, `locales/it.json` loaded as separate chunks.

## Relationships

- **`docs/index.md`** — parent wiki index; links to this page in the module listing.
- **`docs/modules/locales-overrides.md`** — documents the consumer half (`infrastructure/i18n/locale-overrides.ts`). This module never imports it; the two halves meet only at the two shared read endpoints (`GET /locales`, `GET /locales/{tag}/messages`) which `infrastructure` registers so this folder can be deleted without touching them.

## Notes

- **Zero coupling.** No barrel, no dependency edges in `module.ts`. Deleting `src/modules/locales/` and its line in `src/modules.ts` breaks nothing—rendering and the visitor-facing locale switch are unaffected.
- **Scopes ≠ tags.** `GET /locales` returns per-language *scopes*, not a bare tag list. A language present in the database does not guarantee the API can serve it; "may I request this language?" and "may I download a dictionary for it?" are separate questions.
- **Shared reads belong to infrastructure.** The two `GET` endpoints used by the boot path are registered outside this module, by design, so the module folder is safe to `rm -rf`.
- **Access is declared once** in each route's `meta.access`; menu entries never restate it, keeping the menu and router in agreement.
