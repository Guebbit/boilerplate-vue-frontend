---
source: src/modules/locales/response-schemas.ts
sha256: 7adefecd255c0629435a92365aff9aebec8a9cd6cec26d2e5710d7911a890283
generated_at: 2026-10-17T01:04:13.123049+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/response-schemas.ts

## Purpose

Defines the response-envelope schema rows for every REST endpoint attributed to the `locales` backend module. The list is derived from the generated route table (`contracts/rest/routes.ts`, stamped via `x-module` in `openapi.yaml`) so that contract validation for locales responses is registered as a unit—enabling the domain folder turns validation on, deleting it turns it off.

## Key elements

- **`localesResponseSchemas`** (exported const, type `ResponseSchemaRoute[]`) — the single public export. Built by calling `routesForModules(schemas, ['locales'])`, which filters the full schema registry down to rows whose owning module is `locales`.
- **`routesForModules`** (imported from `@/infrastructure/http/response-schema-map`) — the helper that performs the module filter.
- **`schemas`** (imported from `@api/schemas`) — the full set of API response schemas that `routesForModules` searches.

## Relationships

- **`@/infrastructure/http/response-schema-map`** — provides both the `routesForModules` builder and the `ResponseSchemaRoute` type used to type the export. Also owns `SESSION_AND_BOOT_SCHEMA_NAMES`, which excludes four i18n boot-path reads from this module's rows.
- **`@api/schemas`** — supplies the raw schema definitions that get filtered into the locales subset.
- **`contracts/rest/routes.ts`** (generated) — the upstream source of the route-to-module attribution that `routesForModules` consumes.

## Notes

- The four i18n boot-path reads are deliberately **excluded** from this file's rows (handled by `SESSION_AND_BOOT_SCHEMA_NAMES` in `response-schema-map.ts`). They are not a gap—do not "fix" them here.
- Each row in the array obeys two invariants documented in `ResponseSchemaRoute`'s own docblock (see `response-schema-map.ts`).
- Adding or removing a locales route upstream in `openapi.yaml` will change this array on the next codegen; no manual edits to this file are expected.
