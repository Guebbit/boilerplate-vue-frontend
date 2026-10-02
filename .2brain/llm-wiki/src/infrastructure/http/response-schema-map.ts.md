---
source: src/infrastructure/http/response-schema-map.ts
sha256: b7638062032d89cb98920a3798e705c75802de5867ca6bd64191c5db37b17276
generated_at: 2026-10-02T11:58:23.380154+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/response-schema-map.ts

## Purpose

Route table that maps `method + URL pattern` to Zod response (and optional request-body) schemas, matched at runtime against the request's pathname. It lets the HTTP mutator detect live contract violations without knowing which operation it is serving, and keeps the ~350 KB Zod contract in a single lazy chunk rather than every entry bundle.

## Key elements

- **`ResponseSchemaRoute`** (interface) — one table row: `method`, `pattern` (anchored RegExp), `schema` (ZodType), optional `bodySchema`.
- **`routesForModules(schemas, ownedBackendModules)`** — filters generated `ROUTES` to the backend `x-module` names a frontend module claims; excludes `SESSION_AND_BOOT_SCHEMA_NAMES`. The single call each `src/modules/<name>/response-schemas.ts` makes.
- **`buildCoreRouteSchemas(schemas)`** — builds rows no module claims: health probe (`GET /`), `UNCLAIMED_BACKEND_MODULES` (`antibot`, `audit-logs`), and the session/boot schemas reserved on the core shelf.
- **`loadResponseSchemas(moduleLoaders)`** — the one dynamic `import('@api/schemas')`; resolves core + module rows, calls `registerResponseSchemas`, sets `schemasReady = true`.
- **`registerResponseSchemas(rows)`** — replaces the installed table (idempotent; safe under hot-reload / `vi.resetModules`).
- **`resolveResponseSchema(method, url)`** / **`resolveRequestSchema(method, url)`** — public lookups; return the matched Zod schema or `undefined`.
- **`isResponseSchemaTableLoading()`** — returns `true` until `loadResponseSchemas` resolves; lets callers suppress "no schema mapped" warnings during the pre-load window.
- **`findRoute`** (private) — shared matcher: uppercases method (default `GET`), extracts pathname via `toPathname`, tests anchored RegExp.

## Relationships

- **`src/infrastructure/http/url.ts`** — imports `toPathname`; used inside `findRoute` to reduce an absolute or relative URL to a bare pathname before pattern matching.
- **`src/infrastructure/http/validate.ts`** — calls `isResponseSchemaTableLoading()` to skip its unmapped-route warning while the table is still empty (e.g., the pre-mount `/locales` GET fired by `mergeRemoteLocales`); consumes the schemas returned by `resolveResponseSchema` / `resolveRequestSchema` to actually parse the body.

## Notes

- **Anchored patterns.** Every `pattern` is `^…$`, so a `[^/]+` segment cannot bleed into a neighbouring literal segment. Registration order is therefore irrelevant — verified by `tests/unit/infrastructure/http/response-schema-map.spec.ts`.
- **Missing row is not fatal.** `resolveResponseSchema` / `resolveRequestSchema` return `undefined`; the caller logs a dev warning. An unmapped route is a maintenance gap, not a proof the response is wrong.
- **No static import of `@api/schemas`.** The file is in `infrastructure`, which cannot import `@/modules`; all rows arrive through registration. The only `@api/schemas` import in the app is the dynamic one inside `loadResponseSchemas`, deduplicated by Vite across all module loaders.
- **`registerResponseSchemas` replaces, never appends.** Calling it twice (hot-reload, test re-wiring) leaves exactly one set of rows.
- **`schemasReady` vs. "genuinely unmapped."** The flag distinguishes "table not loaded yet" from "this route was never registered," so `validate.ts` can stay quiet during boot without silencing real gaps.
- **`resolveGeneratedSchema` casts.** Two single `as` casts narrow the generated string key → `Record<string, unknown>` → `zod.ZodType`; necessary because the `@api/schemas` namespace also exports non-schema constants (generated regexes).
