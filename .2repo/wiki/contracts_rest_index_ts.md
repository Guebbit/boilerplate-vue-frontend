# contracts/rest/index.ts

## Purpose

Generated TypeScript type definitions and const enums for the Ecommerce Demo REST API (OpenAPI spec v2.0.0), produced by orval v8.20.0. It exists so that any client or server in the monorepo can import stable, codegen-aligned DTOs without hand-maintaining them. The file is **not meant to be edited manually**; the source of truth is the OpenAPI specification.

## Key elements

- **Scalar type aliases** – `Page`, `PageSize`, `Id`, `Text`, `Email`, `Password`, `Locale`, `ImageUrl`: typed wrappers over `number`/`string` carrying JSDoc constraints (min/max length, patterns) that orval uses when generating client code.
- **Envelope & error types** – `MessageResponse`, `ErrorResponse`, `ValidationErrorResponse`, `PaginationMeta`: the standard success/error response shapes every endpoint returns. `errors[]` items carry a stable `code` plus a localized `message`.
- **Domain entities** – `User`, `Product`, `CartItem`, `OrderAddress`, `OrderItem`, `Order`, `Language`, `LocaleCapability`, `LocaleCapabilities`: the canonical data models exposed by the API. `Order` embeds `OrderActions` (server-decided allowed transitions, `cancel`, `pay`).
- **Const enums** – `OrderStatus`, `HealthPingStatus`, `LocaleDirection`, `LocaleSource`: closed string-literal sets exported as both a `const` object and a union type.
- **Locale management types** – `LocaleTenant`, `CreateLocaleRequest`, `LocaleCapabilitiesEnvelope`: types for the two-tier (static/dynamic) locale system and its capability manifest.
- **`orvalMutator` import** – pulled from `src/infrastructure/http/index.ts`; this is the HTTP transport hook orval injects into every generated request function.

## Relationships

- **`src/infrastructure/http/index.ts`** – provides `orvalMutator`, the single HTTP client implementation (auth headers, error handling) that orval wraps around every generated API call. This file is its consumer.
- **`src/modules/products/tests/product-view.spec.ts`** – imports types from this file (e.g. `Product`, `PaginationMeta`) to assert on API responses in product-related integration/unit tests.
- **`package.json`** – declares the `orval` devDependency and the `generate:api` script that (re)produces this file from the OpenAPI spec.
- **`docs/tools/runtime.md`** / **`github/copilot-instructions.md`** – documentation that instructs humans and AI assistants to treat this file as read-only and to regenerate it rather than hand-edit.

## Notes

- **Do not edit by hand.** The header comment explicitly states "Do not edit manually." All changes must flow through the OpenAPI spec → orval regeneration.
- **`Accept-Language` is intentionally absent per-operation.** It applies globally via an interceptor; the header block in the file banner is the contract for it. An unsupported language falls back silently; `Content-Language` reports what was actually used.
- **`ImageUrl` is `uri-reference`, not `uri`.** Uploaded images are stored as server-relative paths (e.g. `/uploads/abc.jpg`), not absolute URLs.
- **`Order.totalItems` vs `PaginationMeta.totalItems`** are different: the former counts line items in one order; the latter counts orders matching a list query.
- **`Product` inventory fields** (`onHand`, `reserved`, `available`) are all `readonly` and `optional`; `available` is a server-derived value, not something a client sets.
- **Locale tiers (static vs dynamic)** are distinct concerns. A `Language` row in the dynamic tier does **not** mean the API can answer in that language—that requires a deployed dictionary file (static tier). The `LocaleCapability.tenants` array disambiguates which capabilities apply.
