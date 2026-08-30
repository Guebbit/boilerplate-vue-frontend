# src/infrastructure/http/response-schema-map.ts

## Purpose

Route table that maps an HTTP method + URL pattern to the Zod schema validating the response for that call. It exists so `orvalMutator` can catch live contract violations without each call site knowing which operation it serves. Core (infrastructure-owned) rows are baked in; domain modules contribute their own rows at boot via registration.

## Key elements

- **`ResponseSchemaRoute`** — interface with `method`, `pattern` (RegExp), and `schema` (ZodType). One row per `orvalMutator` call site.
- **`coreRouteSchemas`** — private array of rows that belong to no domain module: `GET /` (health), the three `/account/*` session calls, and the `/locales*` boot-path reads.
- **`routeSchemas`** — module-level `let` holding the active table (core rows + last registered module rows).
- **`registerResponseSchemas(moduleRouteSchemas)`** — replaces the module rows (keeps core rows). Idempotent: calling twice does not duplicate.
- **`resolveResponseSchema(method, url)`** — looks up the matching row by upper-cased method + regex `.test()` on the pathname; returns `undefined` if no row matches.

## Relationships

- **`src/infrastructure/http/url.ts`** — provides `toPathname`, imported here and used inside `resolveResponseSchema` to extract the path for matching.
- **`src/infrastructure/http/validate.ts`** — caller side: uses `resolveResponseSchema` to pick the schema and performs the actual Zod parse; logs a dev warning when the lookup returns `undefined`.
- **`src/infrastructure/http/index.ts`** — barrel file; re-exports this module so consumers import from the directory.
- **`docs/tools/live-e2e.md` / `docs/tools/property-testing.md`** — document the live-contract and property-testing tooling that depend on this table being populated before the app mounts.

## Notes

- **Layering constraint:** `infrastructure` cannot import from `@/modules`. Rows therefore arrive via `registerResponseSchemas`, called by `src/main.ts` before mount. Any harness that exercises `orvalMutator` outside the app must call it too, or it tests an unregistered table.
- **Regex anchoring is mandatory:** every pattern must start with `^` and end with `$`. Without the trailing `$`, a `[^/]+` segment absorbs the next literal segment (e.g. `/locales/[^/]+` swallows `/locales/es/entries`), causing the wrong schema to be applied.
- **Ordering within `coreRouteSchemas` matters:** static-segment rows (e.g. `/locales/tenants`) must precede the wildcard rows that could match the same path.
- **Missing row ≠ failure:** `resolveResponseSchema` returning `undefined` is a maintenance gap (caller warns in dev), not a validation error.
- **Hand-written, not generated:** the table is maintained by eye against `contracts/rest/index.ts` because the Axios request config does not carry the operation name and parsing the generated client at runtime is not feasible.
