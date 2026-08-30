# src/modules/locales/response-schemas.ts

## Purpose

Declares the response-envelope validation rows for the nine **admin-only** locale endpoints. Each row pairs an HTTP method with a `$`-anchored URL regex and the corresponding Zod response schema, so the global response-envelope validator can confirm that admin locale calls return the expected shape.

## Key elements

- **`localesResponseSchemas: ResponseSchemaRoute[]`** — the sole export. Nine entries covering:
  - `POST /locales`, `PUT /locales/{tag}`, `DELETE /locales/{tag}`
  - `GET /locales/{tag}/entries` (note optional `?query` in the regex)
  - `POST /locales/{tag}/entries`, `PUT …/entries`, `PATCH …/entries`
  - `PUT /locales/{tag}/entries/{id}`, `DELETE /locales/{tag}/entries/{id}`
- **`@api/schemas`** — source of the Zod schemas (`CreateLocaleResponse`, `UpdateLocaleResponse`, `DeleteLocaleResponse`, `ListLocaleEntriesResponse`, `CreateLocaleEntryResponse`, `ReplaceLocaleEntriesResponse`, `MergeLocaleEntriesResponse`, `UpdateLocaleEntryResponse`, `DeleteLocaleEntryResponse`).
- **`ResponseSchemaRoute`** (from `@/infrastructure/http/response-schema-map`) — the row type (`{ method, pattern, schema }`).

## Relationships

- **`src/modules/locales/module.ts`** — the module manifest imports `localesResponseSchemas` and registers it so the response-envelope validator can match admin locale routes at request time.

## Notes

- **Public reads are excluded by design.** `GET /locales` and `GET /locales/{tag}/messages` are deliberately *not* listed here; they are called during boot (`infrastructure/i18n/locale-overrides.ts`) regardless of whether this module is enabled, so their rows live in `coreRouteSchemas` alongside that code.
- **Regex anchoring is load-bearing.** Every single-segment pattern ends with `$` so, e.g., `^/locales/[^/]+$` cannot accidentally swallow `/locales/es/entries`. The one multi-segment `entries` list pattern additionally permits an optional query string via `(\?.*)?`.
- **`PUT` vs `PATCH` on the collection path** are distinct operations (full replace vs. merge) and map to different schemas (`ReplaceLocaleEntriesResponse` / `MergeLocaleEntriesResponse`).
