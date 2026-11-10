---
source: src/infrastructure/http/response-schema-map.ts
sha256: 5928d63e7faa49de05a0dbb6bd4508bf3b30cdd6856437129388089a53230ec4
signature: 45859d658f07645aefd0e6cb87b0f083a6d46345852a9735d570e7f35c7c1adf
generated_at: 2026-11-10T03:06:09.562278+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/response-schema-map.ts

## Purpose

Route table that maps every `orvalMutator` call site (HTTP method + URL pattern) to its Zod response and request-body schemas. It exists so a live contract violation is caught at the mutator boundary without each call site knowing which OpenAPI operation it serves. All rows are generated from `openapi.yaml` (via `@api/routes`), so the method/pattern/schema triple cannot drift from the contract by hand-editing.

## Key elements

- **`ResponseSchemaRoute`** (interface) — one row: `method` (uppercase string), `pattern` (anchored `RegExp` for pathname matching), `schema` (Zod response body), `bodySchema?` (Zod request body, absent for bodyless ops).
- **`loadResponseSchemas`** (exported) — the single entry point. Dynamically imports `@api/schemas` (~350 KB), builds core rows and module rows in parallel, installs them via `registerResponseSchemas`, and flips the `schemasReady` flag. Gated behind `shouldValidateResponses()` at the call site.
- **`registerResponseSchemas`** (exported) — replaces the internal `routeSchemas` array wholesale (safe for re-wiring in tests or hot reload).
- **`routesForModules`** (exported) — filters `ROUTES` to rows whose `x-module` is in a given set, excluding the session/boot schemas reserved for the core shelf. Called by each `src/modules/<name>/response-schemas.ts`.
- **`resolveResponseSchema` / `resolveRequestSchema`** (exported) — look up the response or request-body Zod schema for a `(method, url)` pair; return `undefined` when the route is unregistered.
- **`isResponseSchemaTableLoading`** (exported) — `true` until `loadResponseSchemas` resolves; lets `validate.ts` suppress its "no schema mapped" warning during the pre-mount window.
- **`UNCLAIMED_BACKEND_MODULES`** (internal) — backend `x-module` names with no owning frontend module (`analytics`, `antibot`, `audit-logs`, `sitemap`); their rows stay on the core shelf.
- **`SESSION_AND_BOOT_SCHEMA_NAMES`** (internal) — schema names needed before any module is known to be enabled (session + i18n boot); excluded from module shelves to avoid duplication.
- **`findRoute`** (internal) — normalises method to uppercase (absent → `GET`), extracts pathname via `toPathname`, then linear-scans `routeSchemas` for a method + `pattern.test()` match.

## Relationships

- **`src/infrastructure/http/url.ts`** — imports `toPathname` to extract the pathname from an absolute or relative URL before regex matching.
- **`src/infrastructure/http/validate.ts`** — reads `isResponseSchemaTableLoading()` to decide whether to emit its "no schema mapped" dev warning; calls `resolveResponseSchema` / `resolveRequestSchema` to obtain the Zod schemas it parses against.

## Notes

- A missing row is **not fatal**: `resolveResponseSchema` returns `undefined` and the caller (`orvalMutator`) logs a dev warning. An unmapped route signals a maintenance gap, not a broken response.
- All patterns are **anchored** (`^…$`), so registration order is irrelevant and a `[^/]+` segment cannot bleed into an adjacent literal segment. Covered by `tests/unit/infrastructure/http/response-schema-map.spec.ts`.
- `registerResponseSchemas` **replaces** the table rather than appending, preventing silent doubling on repeated calls (test re-wiring, HMR).
- The file must never statically import `@api/schemas`; the dynamic `import()` inside `loadResponseSchemas` is the single place the Zod chunk is pulled in, keeping it out of every entry bundle.
- `schemasReady` starts `false` because `mergeRemoteLocales()` fires a `/locales` GET before mount, meaning a request can reach the validator before `main.ts` has called `loadResponseSchemas`. All routes read as unmapped for that window by design.
