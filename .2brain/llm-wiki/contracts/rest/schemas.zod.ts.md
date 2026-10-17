---
source: contracts/rest/schemas.zod.ts
sha256: 9636bd37a04ba0747fd8f98ac29a9d3e6d2840881babaf239c5d593b18837796
generated_at: 2026-10-16T23:55:16.766078+00:00
model: ollama:qwen3.8:27b
---

# contracts/rest/schemas.zod.ts

## Purpose

Auto-generated (orval v8.20.0) Zod schemas that validate the request and response shapes for the Boilerplate REST API's operational endpoints (health, liveness, readiness, `security.txt`) and its locale/internationalization surface (listing, creating, replacing languages; listing translation apps; fetching the API's own message dictionary). Exists so that server handlers and any client-side validation share a single, type-safe contract derived from the OpenAPI spec.

## Key elements

- **`GetHealthResponse`** — `zod.strictObject` for the public ping endpoint (`/health`); asserts `success: true`, a numeric `status`, a `message`, and `data.status === 'ok'`.
- **`GetLivezResponse` / `GetReadyzResponse`** — Both `zod.unknown()`: the body is intentionally empty; meaning is carried by the HTTP status code alone.
- **`GetSecurityTxtResponse`** — `zod.string()`: RFC 9116 plain-text body (not the JSON envelope).
- **`GetLocalesResponse`** — Full locale manifest: array of locale objects (tag, name, nativeName, direction, active, apps, source, entryCount, revision) plus `default` and `fallback` locale tags.
- **`CreateLocaleBody` / `CreateLocaleResponse`** — Request body (tag, name, nativeName, optional direction, active with default `true`) and the created-locale record (adds `id`, `baseLanguage`, `revision`, timestamps).
- **`ListLocaleAppsResponse`** — Array of app descriptors (`id`, `label`, `kind: 'frontend' | 'backend'`) representing the keyspaces a deployment supports.
- **`GetLocaleDictionaryParams` / `GetLocaleDictionaryResponse`** — Path-param schema for the locale tag and the tier-1 dictionary payload (`messages` as a flat `Record<string, unknown>`).
- **`ReplaceLocaleParams`** — Path-param schema for the locale tag used in the PUT (replace) endpoint.
- **Various `*Max`, `*RegExp`, `*Min`, `*Default` constants** — Extracted constraint values (length caps, BCP-47 tag regexes, app-id regexes, non-negative minimums) kept as named exports so other generated files or tests can reference them without re-parsing the schema.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- **Do not edit manually.** The header marks it as orval-generated from OpenAPI spec v0.1.0; changes must go through the spec and a codegen run.
- **Shared response envelope.** Every JSON endpoint (except `security.txt`) uses the same four-field wrapper: `{ success: true, status: number, message: string, data: … }`. The two `zod.unknown()` schemas (livez/readyz) deliberately opt out of the envelope.
- **`Accept-Language` is global, not per-operation.** The doc block explicitly states the header is honoured by every endpoint but intentionally absent from individual operation parameters to avoid a redundant argument in every generated function.
- **Locale tag format** is enforced by the regex `^[a-z]{2}(-[A-Za-z0-9]+)*$` (BCP-47) throughout; app ids use `^[a-z0-9][a-z0-9-]*$`.
- **`zod.strictObject` is used everywhere**, meaning unknown keys in a payload will fail validation — no silent pass-through of extra fields.
- **`zod.iso.datetime({ offset: true })`** is used for `createdAt`/`updatedAt`, indicating the project targets a Zod major version where the ISO module is namespaced under `zod.iso`.
