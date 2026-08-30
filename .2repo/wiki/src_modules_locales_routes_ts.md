# src/modules/locales/routes.ts

## Purpose

Declares the locale-management route table (three admin-only routes) as a typed `RouteRecordRaw[]` that the module registry splices into the application router. Each entry lazy-loads its view component.

## Key elements

- **Default export** — an array of three `RouteRecordRaw` objects satisfying `RouteRecordRaw[]`:
  - `LocalesList` (`locales`) — the languages board; lazy-loads `./views/LocalesList.vue`.
  - `LocalesDictionary` (`locales/dictionary`) — the all-languages dictionary; lazy-loads `./views/LocalesDictionary.vue`.
  - `LocaleEntries` (`locales/:tag`) — entries for a single language; lazy-loads `./views/LocaleEntries.vue`.
- All three carry `meta: { access: 'admin' }` and an i18n `title` key under `locales-*` or `locale-*` namespaces.

## Relationships

- **`src/modules/locales/module.ts`** — the module registry that imports this default array and splices it into the app's Vue Router instance at bootstrap.

## Notes

- The dynamic segment is named `:tag`, not `:locale`, because a parent route already owns `:locale` for the interface language; a nested duplicate would silently shadow it in every navigation guard.
- The static `locales/dictionary` route is deliberately listed before `locales/:tag`. vue-router ranks static segments higher regardless of order, but the explicit ordering signals intent to readers and prevents anyone from registering a language literally tagged `"dictionary"`.
