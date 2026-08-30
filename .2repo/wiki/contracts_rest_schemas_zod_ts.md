# contracts/rest/schemas.zod.ts

## Purpose

Auto-generated Zod schema definitions for the Ecommerce Demo API REST contract, produced by orval v8.20.0 from the OpenAPI spec (v2.0.0). It provides runtime-validated TypeScript types for every response and request body the API exposes, intended for multi-project, multi-language use (client/server stubs, DTOs, SDKs).

## Key elements

- **`GetHealthResponse`** — Zod `strictObject` for the `GET /health` liveness check.
- **`GetLocalesResponse`** — Zod `strictObject` for `GET /locales`. Validates the full locale manifest (tag, name, nativeName, direction, active, tenants, source, entryCount, revision) plus `default` and `fallback` tags.
- **`CreateLocaleBody`** — Zod `strictObject` for the `POST /locales` request body (tag, name, nativeName, optional direction, active with default `true`).
- **`CreateLocaleResponse`** — Zod `strictObject` for the `POST /locales` success response, including `baseLanguage` (ISO 639-1 primary subtag), timestamps, and revision.
- **Regex & constraint constants** — e.g. `getLocalesResponseDataLocalesItemTagRegExp`, `createLocaleBodyTagRegExp`, `getLocalesResponseDataLocalesItemTenantsItemMax` (64), `getLocalesResponseDataLocalesItemTenantsItemRegExp`. Each is exported individually so orval can reference them inline in the schema.
- **`.describe()` annotations** — Extensive inline documentation on every field explaining semantics (e.g., backend vs. frontend tenant capability, BCP 47 tag rules, why `direction` is a column rather than a derived value).

## Relationships

- **`docs/tools/runtime.md`** — This file is the type-level contract the runtime must satisfy; the schemas encode the response shapes, validation rules, and i18n behavior (Accept-Language handling, tenant capability reporting) that the runtime documentation describes narratively.

## Notes

- **Generated file** — The header explicitly says "Do not edit manually." Regenerate via orval when the OpenAPI spec changes.
- **`Accept-Language` is not declared per operation** — The header paragraph explains this is intentional: the header applies to all 33+ endpoints and is set once in a client interceptor. The paragraph in the file header *is* the contract for that behavior.
- **Strict objects everywhere** — All schemas use `zod.strictObject`, so unknown keys will fail validation at runtime.
- **Locale data is runtime state, not contract state** — The `tag`, `default`, and `fallback` fields are validated against regex patterns, not closed enums, because the set of supported languages is deployment-specific and discoverable only via `GET /locales`.
- **Tenant semantics differ by context** — On a *locale*, `tenants` reports capability (which layer has a dictionary). On an *entry*, `tenants` reports override precedence. The `.describe()` text disambiguates; be careful not to conflate the two when reading schemas.
