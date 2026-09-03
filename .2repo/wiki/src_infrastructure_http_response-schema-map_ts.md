# src/infrastructure/http/response-schema-map.ts

## Purpose

Maps every HTTP method + URL pattern to the Zod schema that validates its response. This lets the live API client (`orvalMutator`) check a response against the correct contract without the caller needing to know which operation it issued. Core infrastructure rows are baked in; domain modules contribute their own rows at boot.

## Key elements

- **`ResponseSchemaRoute`** (interface) — a single table row: `method`, a `RegExp` `pattern`, and a `zod.ZodType` `schema`.
- **`coreRouteSchemas`** (const, not exported) — the rows belonging to no domain module: health probe, the three session `/account` calls, and the boot-path `/locales*` reads.
- **`routeSchemas`** (module-level `let`) — the live table; starts as a copy of `coreRouteSchemas` and is replaced by `registerResponseSchemas`.
- **`registerResponseSchemas(moduleRouteSchemas)`** (exported) — replaces the table with `coreRouteSchemas` + the supplied module rows. Calling it twice resets cleanly rather than duplicating.
- **`resolveResponseSchema(method, url)`** (exported) — extracts the pathname, uppercases the method (defaulting to `GET`), and returns the first matching row's schema, or `undefined` if no row matches.

## Relationships

- **`src/infrastructure/http/url.ts`** — imports `toPathname` to strip query strings/origin from the URL before the regex match.
- **`src/infrastructure/http/validate.ts`** — consumes `resolveResponseSchema` to obtain the Zod schema it will run against the incoming response body; also the layer that logs the dev-time warning when the lookup returns `undefined`.

## Notes

- **Anchoring is mandatory.** Every pattern must be `^…$`. Without the trailing `$`, a `[^/]+` segment will absorb an adjacent literal path (e.g. `/locales/es/entries` matching the `/locales/[^/]+` row) and the wrong schema will be applied.
- **Static segments must precede wildcards.** `/locales/tenants` is registered *before* `/locales/[^/]+$` specifically so the `find()` scan hits it first. If you add a new literal segment, place it above the nearest wildcard.
- **Missing row ≠ failure.** `resolveResponseSchema` returning `undefined` is a maintenance gap, not a validation error. The caller (`validate.ts` / `orvalMutator`) warns in dev but does not reject the response.
- **No `@/modules` import allowed.** This file lives in `infrastructure`, which cannot reach into the module layer. All domain rows arrive through the `registerResponseSchemas` call in `src/main.ts` before the app mounts.
- **One row = one `orvalMutator` call site.** The `schema` field should always be the corresponding `<PascalCase>Response` export from `@api/schemas`, keeping the table diffable against the generated client by eye.
- **Order of module registration is irrelevant** as long as every pattern is fully anchored; the ordering constraint only applies within a single overlapping prefix family (like `/locales/*`).
