---
source: contracts/rest/routes.ts
sha256: 8ec8a35f034480033098503d5b2a0e7108bc751d49551a667078c46dfdc51704
signature: f0cab0e507c64f668e7c3108df3450a06f1572d5a30f7f1d48f7bb2bde104cf8
generated_at: 2026-11-10T02:12:42.021125+00:00
model: ollama:qwen3.8:27b
---

# contracts/rest/routes.ts

## Purpose

Auto-generated lookup table that maps every REST operation to its response-validation metadata (schema name, optional body schema, owning backend module, and a `noRefresh` auth flag). It is the single source of truth consumed by the HTTP infrastructure layer to resolve response schemas at runtime. Regenerated from `openapi.yaml` via `npm run gen:api`; never edited by hand.

## Key elements

- **`GeneratedRoute` (interface)** — Shape of one route row: `method`, `pattern` (compiled `RegExp`), `schemaName` (response schema to validate against), `bodySchemaName` (optional request-body schema), `module` (backend `x-module` stamp; `undefined` for system endpoints like `/config`, `/livez`), and `noRefresh` (if `true`, a 401 on this route does **not** trigger the client-side token-refresh flow).
- **`ROUTES` (const array of `GeneratedRoute`)** — The full list of every operation declared in the OpenAPI spec. Each entry pairs a concrete URL pattern with the schema names the validation layer must look up in the `@api/schemas` namespace.

## Relationships

- **`scripts/contracts/generate-route-table.ts`** — The code generator that reads the OpenAPI spec, compiles path templates into anchored regexes, and emits this file. Re-running `npm run gen:api` overwrites `routes.ts` entirely. Any change to the API contract flows through that script, not through manual edits here.

## Notes

- **Generated artifact** — Treat as read-only. To add or change a route, edit the source OpenAPI spec and re-run the generator.
- **`noRefresh` semantics** — Set to `true` on authentication-critical endpoints (login, signup, password reset, 2FA verify, account restore) where a 401 is an expected "wrong credentials" signal, not an expired-session signal. The client's auth-interceptor checks this flag before attempting a refresh.
- **`module: undefined`** — A small set of system/ops endpoints (`/config`, `/livez`, `/health`, `/.well-known/security.txt`) carry no module stamp; downstream code must handle the `undefined` case.
- **Pattern anchoring** — Every `pattern` is a fully anchored `^…$` regex (no path parameters in the visible entries), so matching is exact-string against the request path.
