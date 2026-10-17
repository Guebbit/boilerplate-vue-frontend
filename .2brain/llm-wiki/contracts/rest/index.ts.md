---
source: contracts/rest/index.ts
sha256: c32461045525915d7353300b32b6d59ea33a9c0759b50561c63e0fc155b7f919
generated_at: 2026-10-16T23:54:45.112585+00:00
model: ollama:qwen3.8:27b
---

# contracts/rest/index.ts

## Purpose

Auto-generated (orval v8.20.0) TypeScript type definitions for the project's stable OpenAPI REST contract. It is the single source of shared types — scalar aliases, envelope shapes, error structures, and domain interfaces (User, Locale, Language, Health) — that both the API client layer and feature modules import to stay type-safe against the server. **Do not edit manually.**

## Key elements

- **Scalar type aliases** — `Page`, `PageSize`, `Id`, `Text`, `Email`, `Locale`, `CountryCode`, `ImageUrl`, `ImageRemoval` (always `null`), `ThumbnailUrl`. Each carries JSDoc constraints (`@minLength`, `@pattern`, etc.) that mirror the OpenAPI schema.
- **Envelope & error types** — `MessageResponse`, `ErrorResponse`, `ValidationErrorResponse`, `ErrorItem`, `ErrorItemDetails`. Standard success/failure shapes every endpoint returns; `ErrorItem.details.field` is the dotted path to the offending body field.
- **Domain interfaces** — `User`, `UserActions`, `UserEnvelope`, `HardDeleteRequest`; `HealthPing`, `HealthPingEnvelope`, `HealthPingStatus`; `LocaleCapability`, `LocaleCapabilities`, `LocaleApp`, `LocaleSource`, `LocaleDirection`, `LocaleAppKind`; `Language`, `LanguageEnvelope`, `CreateLocaleRequest`.
- **`orvalMutator` import** — pulled from `src/infrastructure/http/index.ts`; used by the generated request functions (not visible in the truncated portion) to wire fetch calls through the app's HTTP layer.

## Relationships

- **`src/infrastructure/http/index.ts`** — provides the `orvalMutator` that every generated endpoint function delegates to for actual HTTP transport, auth headers, and retry logic.
- **Feature test suites** (`cart`, `orders`, `products`, `users` specs) — import the types defined here (e.g. `User`, `ErrorResponse`, envelope shapes) to type their fixtures, assertions, and mocked API responses.
- **`src/modules/orders/store.ts`** — consumes contract types (envelopes, error items, pagination) when normalising API responses into the store.
- **`src/modules/payments/components/PaymentsTable.vue`** — imports shared types for the table's data model and status enums.

## Notes

- **Generated file.** Any structural change must go through the OpenAPI spec and a re-run of orval; hand-edits will be overwritten.
- **`ImageRemoval` is always `null`.** It is the *only* accepted value on the write side of `imageUrl`; a new image is sent as multipart `imageUpload` bytes, never as a path string. `ImageUrl` (response-side) and `ImageRemoval` (request-side) are intentionally distinct types.
- **`Locale` vs. `LocaleCapability`.** `Locale` is a shape-checked string tag. `LocaleCapability` is the runtime manifest row describing what a deployment actually supports. The split mirrors the "shape is contract, existence is runtime" convention used for `CountryCode` / `GET /delivery/methods`.
- **`UserActions` booleans** are per-request capability flags (`update`, `ban`, `delete`) that also encode staff-account protection; they are not global permission flags.
- **`Accept-Language` is not declared per-operation** in the spec; it is a global convention documented in the file header. Generated functions do not accept a language argument — the HTTP interceptor handles it.
- **File is truncated in this snapshot.** The visible portion covers shared scalars, user, health, and locale/language types; additional domain types (orders, cart, products, payments, delivery, etc.) likely follow.
