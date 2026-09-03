# contracts/rest/schemas.zod.ts

## Purpose

Auto-generated (by orval v8.20.0 from OpenAPI spec v2.0.0) Zod validation schemas for the Ecommerce Demo API's REST endpoints. It defines the shape of request bodies and response envelopes so that server-side handlers and client SDKs can validate payloads at runtime without duplicating the contract.

## Key elements

- **`GetHealthResponse`** — Schema for the `GET /health` liveness endpoint; expects `{ success: true, status, message, data: { status: 'ok' } }`.
- **`GetLocalesResponse`** — Schema for `GET /locales`; describes the full language manifest (per-locale `tag`, `name`, `nativeName`, `direction`, `active`, `tenants[]`, `source`, `entryCount`, `revision`) plus `default` and `fallback` tags.
- **`CreateLocaleBody`** — Request-body schema for `POST /locales` (register a language in the dynamic tier). Fields: `tag`, `name`, `nativeName`, optional `direction`, `active` (defaults to `true`).
- **`CreateLocaleResponse`** — Response schema for the same endpoint; returns the persisted locale record including `id`, `baseLanguage`, timestamps.
- **Helper constants** — Exported `RegExp` values (BCP 47 tag, tenant id, base-language) and numeric min/max bounds (e.g. `getLocalesResponseDataLocalesItemTenantsItemMax`, `getLocalesResponseDataLocalesItemEntryCountMin`) used inside the schemas above.
- **`createLocaleBodyActiveDefault`** — Explicit default (`true`) for the `active` field, exported so consumers can reference the same value.

## Relationships

No graph neighbors are recorded for this file. It is a leaf module: it imports only `zod` and is imported by the runtime validation layer and any generated client stubs that need type-level or runtime shape checks.

## Notes

- **Do not edit by hand.** The header states it is orval output; changes belong in the OpenAPI spec or the orval config.
- **`zod.strictObject` everywhere.** Unknown keys in a payload will fail validation, not be silently dropped.
- **Language-tag validation is regex-based**, not enum-based. The spec explicitly notes supported tags are a *runtime* fact; the schema only enforces BCP 47 *format*.
- **`tenants` on a locale is a capability signal, not a label.** A backend tenant means the API can answer in that language; a frontend tenant means a client dictionary is downloadable. The two are distinct and a language may have only one.
- **`baseLanguage` is stored, not derived.** It equals the ISO 639-1 primary subtag of `tag` but is a separate column for query/index purposes.
- **`direction` is stored, not computed.** All current locales are `ltr`; the field exists so an `rtl` addition does not require a migration.
- **`Accept-Language` is not declared per-operation** in the generated signatures; it applies globally (see the file header) and is set once via a client interceptor.
