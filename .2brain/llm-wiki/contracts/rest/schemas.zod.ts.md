---
source: contracts/rest/schemas.zod.ts
sha256: 372ceabbcddb676a098ca20803d34e4d2ec32008e86fb8b90202e431cff57a51
generated_at: 2026-10-02T14:31:23.178643+00:00
model: ollama:qwen3.8:27b
---

# contracts/rest/schemas.zod.ts

## Purpose

Auto-generated (by orval v8.20.0) Zod schema definitions for the Ecommerce Demo API's REST contract. It provides runtime-validation schemas for every endpoint's request body, query/path params, and response shape so client and server code can type-check payloads without importing the full OpenAPI document. The file also carries the API's i18n / locale-management schema surface (locales, tenants, dictionaries).

## Key elements

- **`GetHealthResponse`** — Zod schema for `GET /health`; strict object with `success: true`, numeric `status`, `message`, and `data.status: 'ok'`.
- **`GetLivezResponse`** — `zod.unknown()`, intentionally empty; liveness probe returns no structured body.
- **`GetReadyzResponse`** — `zod.unknown()`, same empty-body convention for readiness.
- **`GetSecurityTxtResponse`** — `zod.string()`; plain-text RFC 9116 body, not the JSON envelope.
- **`GetLocalesResponse`** — Full manifest of supported languages (tag, name, nativeName, direction, active, tenants, source, entryCount, revision) plus `default` and `fallback` locale tags.
- **`CreateLocaleBody`** — Request body for adding a dynamic-tier language (tag, name, nativeName, optional direction, `active` defaults to `true`).
- **`CreateLocaleResponse`** — Echoes the created locale record with `id`, `baseLanguage`, `revision`, timestamps.
- **`GetLocaleTenantsResponse`** — Lists all tenant keyspaces (id, label, kind: `frontend` | `backend`).
- **`GetLocaleDictionaryParams` / `GetLocaleDictionaryResponse`** — Params and response for fetching the API's own (tier-1) dictionary for a locale; `messages` is a free-form `Record<string, unknown>`.
- **`ReplaceLocaleParams` / `ReplaceLocaleBody` / `ReplaceLocaleResponse`** — Full-replace (PUT) semantics for a locale's editable fields; tag is immutable.
- **`ReplaceLocaleParams` / `ReplaceLocaleBody` / `ReplaceLocaleResponse`** (truncated) — Partial-merge (PATCH) counterpart per RFC 7396.
- **RegExp / Min / Max constants** — Named exports like `getLocalesResponseDataLocalesItemTagRegExp`, `getLocaleTenantsResponseDataTenantsItemIdMax`, etc., extracted so orval-generated client code can reference them independently of the schema objects.

## Relationships

No graph neighbors are recorded for this file. It is a leaf in the dependency graph: it imports only `zod` and is imported by orval-generated client/server stubs.

## Notes

- **Generated file** — the header states "Do not edit manually." All changes must be made in the OpenAPI spec and re-run through orval.
- **Naming convention** — each validation helper is named `<endpoint><path-to-field><Constraint>` (e.g., `createLocaleBodyTagRegExp`, `getLocaleTenantsResponseDataTenantsItemIdMax`). This is an orval convention; do not rename when hand-editing downstream consumers.
- **`zod.iso.datetime({ offset: true })`** — requires a Zod version with the `zod.iso` sub-module; older Zod installs will not resolve this.
- **Truncated at source** — the file content available here is cut off mid-definition (the PATCH-merge locale endpoints). The full file continues with `MergeLocaleParams`, `MergeLocaleBody`, and likely further locale/entry endpoints.
- **Locale tag regex** is reused across many schemas (`^[a-z]{2}(-[A-Za-z0-9]+)*$`); each schema gets its own named constant rather than a shared import, keeping generated code self-contained per endpoint.
