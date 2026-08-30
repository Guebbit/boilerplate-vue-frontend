# src/modules/locales/module.ts

## Purpose

Module manifest for the locales (translation-management) domain. It declares the routes, navigation entry, response-schema rows, and locale dictionary loaders through the `AppModule` shape consumed by the kernel registry. This file is the *author* side of the i18n tier — the screens a translator uses to edit languages — while rendering (the *consumer* side) lives in `infrastructure/i18n/locale-overrides.ts` and does not depend on this module.

## Key elements

- **`export default` (satisfies `AppModule`)** — the single object the kernel registry reads. Fields:
  - `name: 'locales'` — module identifier.
  - `routes` — re-exported from `./routes`; the URL paths for the admin screens.
  - `navigation` — one entry (`LocalesList`) in the `admin` section at order 43, icon `Languages`. The dictionary board is a sub-view of this screen, not a separate header item.
  - `responseSchemas` — re-exported from `./response-schemas`; the OpenAPI/schema rows for this domain.
  - `locales` — lazy loaders (`en`, `it`) that dynamically import `./locales/*.json` and return the default dictionary object.

## Relationships

- **`src/modules/locales/routes.ts`** — imported and passed through as the `routes` field. This file adds no route logic of its own.
- **`src/modules/locales/response-schemas.ts`** — imported (`localesResponseSchemas`) and passed through as the `responseSchemas` field.
- **`@/kernel/registry`** — the `AppModule` type (imported as type-only) constrains the shape of the default export via `satisfies`.
- **`lucide-vue-next`** — provides the `Languages` icon used in the navigation entry.

## Notes

- The two shared infrastructure reads (`GET /locales`, `GET /locales/{tag}/messages`) are registered by the bottom tier, **not** by this module. Deleting the entire `src/modules/locales/` folder removes the admin screens but does not break rendering or those shared endpoints.
- Navigation intentionally exposes exactly **one** header item. The dictionary board is reachable only from a button inside `LocalesList`; a second top-level entry would shift every other module's header slot.
- Locale loaders are plain `import()` thunks (not HMR-aware or cached here); the consuming side in `infrastructure/i18n/locale-overrides.ts` handles the runtime switching.
