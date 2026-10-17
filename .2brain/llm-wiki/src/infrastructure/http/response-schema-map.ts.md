---
source: src/infrastructure/http/response-schema-map.ts
sha256: 2ce5312ae95c0aeb0c100bd4a8bd9c6b1784e3fbaadb47d3c3b14b8657485532
generated_at: 2026-10-17T00:10:37.449525+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/response-schema-map.ts

## Purpose

Maps every HTTP method + URL-pattern pair to a Zod response (and optional request-body) schema so that live contract violations are caught at the `orvalMutator` boundary. Routes are generated from `openapi.yaml` (via `scripts/contracts/generate-route-table.ts`) rather than hand-typed, and the ~350 KB `@api/schemas` chunk is loaded lazily through a single dynamic `import()` so it never lands in every entry bundle.

## Key elements

- **`ResponseSchemaRoute`** (interface) — one table row: `method`, `pattern` (anchored `^…$` RegExp), `schema` (Zod response), optional `bodySchema` (Zod request body).
- **`UNCLAIMED_BACKEND_MODULES`** — set of backend `x-module` names with no owning frontend module (`analytics`, `antibot`, `audit-logs`, `shop`); their rows stay on the core shelf.
- **`SESSION_AND_BOOT_SCHEMA_NAMES`** — schemas needed before any module is known to be enabled (session, i18n boot); kept on the core shelf and explicitly excluded from their owning modules' own files.
- **`routesForModules(schemas, ownedBackendModules)`** — exported helper each module's `response-schemas.ts` calls to get its own rows, filtered from `ROUTES` by `x-module` and excluding boot schemas.
- **`buildCoreRouteSchemas(schemas)`** (private) — builds rows for unclaimed modules, the health probe (`GET /`), and session/boot schemas.
- **`registerResponseSchemas(rows)`** — replaces the in-memory table (idempotent under hot-reload / test re-wiring).
- **`loadResponseSchemas(loaders)`** — the single entry point: dynamically imports `@api/schemas`, builds core rows, awaits all module loaders, installs the combined table, flips `schemasReady`.
- **`isResponseSchemaTableLoading()`** — returns `true` until `loadResponseSchemas` resolves; lets `validate.ts` suppress its "no schema mapped" warning during that window.
- **`resolveResponseSchema(method, url)`** / **`resolveRequestSchema(method, url)`** — public lookups that return the matched Zod schema or `undefined` (fail-open; caller warns in dev).
- **`findRoute`** (private) — shared matcher: upper-cases method (defaults to `GET`), extracts pathname via `toPathname`, finds the first row whose method and regex pattern both match.

## Relationships

- **`src/infrastructure/http/url.ts`** — imports `toPathname`, which normalises an absolute or relative request URL to a bare pathname before regex matching in `findRoute`.
- **`src/infrastructure/http/validate.ts`** — consumes `isResponseSchemaTableLoading()` to suppress the "no schema mapped" dev warning while the table is still loading, and is the caller that warns when `resolveResponseSchema`/`resolveRequestSchema` return `undefined` after the table is ready.

## Notes

- **Fail-open by design.** A missing row returns `undefined`; the caller logs a dev warning. An unmapped route is a maintenance gap, not proof the response is wrong.
- **Anchored patterns prevent false matches.** Every regex is `^…$` so a `[^/]+` segment cannot absorb an adjacent literal path segment (e.g. `/orders/[^/]+` won't match `/orders/abc/invoice`). Because of this, registration order is irrelevant.
- **`loadResponseSchemas` replaces, not appends.** Calling it twice (hot-reload, test re-wiring) leaves the table exactly the right length.
- **`schemasReady` timing gap.** `mergeRemoteLocales()` fires a `/locales` GET before mount, so a request can hit `validateResponseAgainstContract` before `loadResponseSchemas` runs. During that window every route reads as unmapped; `validate.ts` uses `isResponseSchemaTableLoading()` to stay silent rather than flood the console.
- **`schemaName` is a string key, not a type.** The generated `ROUTES` entries carry `schemaName`/`bodySchemaName` as strings into the `@api/schemas` namespace; `resolveGeneratedSchema` performs the runtime lookup with a two-step cast (namespace → `Record<string, unknown>` → `zod.ZodType`).
- **Gating.** Callers should gate `loadResponseSchemas` behind `shouldValidateResponses()`; there is no benefit to downloading the chunk in a build that will never parse a response.
