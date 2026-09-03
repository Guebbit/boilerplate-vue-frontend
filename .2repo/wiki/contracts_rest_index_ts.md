# contracts/rest/index.ts

## Purpose

Auto-generated Orval v8.20.0 TypeScript client for the Ecommerce Demo API (OpenAPI 2.0.0). It defines the shared DTO types, request/response interfaces, and enum constants that every consumer (frontend, SDK, test suite) imports to speak the REST contract. The file is the single source of typed shape knowledge for all 33 endpoints and is regenerated whenever the OpenAPI spec changes.

## Key elements

- **Scalar type aliases** — `Page`, `PageSize`, `Id`, `Text`, `Email`, `Password`, `PasswordNew`, `Locale`, `ImageUrl`, `ThumbnailUrl`: documented constraints (min/max length, patterns) that mirror server-side validation.
- **Envelope types** — `MessageResponse`, `EnvelopeSuccess`, `EnvelopeStatus`, `EnvelopeMessage`: the uniform `{ success, status, message, data? }` wrapper every endpoint returns.
- **Error types** — `ErrorItem`, `ErrorResponse`, `ValidationErrorResponse`: structured failure payload with machine-readable `code` and human-readable `message`.
- **Domain interfaces** — `User`, `Product`, `CartItem`, `OrderItem`, `OrderAddress`, `Order`, `HardDeleteRequest`, `HealthPing`, `CreateLocaleRequest`, etc.: the request/response bodies for each resource.
- **Enum constants** — `OrderStatus`, `HealthPingStatus`, `LocaleDirection`, `LocaleSource`: closed sets exported as `as const` objects with a matching union type.
- **Locale model** — `LocaleTenant`, `LocaleCapability`, `LocaleCapabilities`, `LocaleCapabilitiesEnvelope`: the multi-tenant, multi-tier language-capability manifest.
- **`orvalMutator` import** — pulled from `../../src/infrastructure/http/index.js`; the generated fetch functions (omitted in the truncated view) delegate HTTP through this mutator.

## Relationships

- **`src/infrastructure/http/index.ts`** — Provides `orvalMutator`, the HTTP transport layer (base URL, auth interceptor, `Accept-Language` header) that every generated endpoint call routes through. This file is the *consumer*; the infrastructure module is the *provider* of transport.
- **`src/modules/products/tests/product-view.spec.ts`** — Imports domain types (`Product`, `PaginationMeta`, possibly `Order`) from this file to construct fixture data and to type-assert API responses in unit tests.

## Notes

- **Do not edit manually.** The header comment explicitly marks the file as Orval-generated; any local change will be overwritten on the next `orval` run.
- **`Password` vs `PasswordNew`** are intentionally separate types. `Password` is a proof (login, re-auth) with only a length floor; `PasswordNew` carries the full complexity requirement. Conflating them in a form component or API call is a bug.
- **`onHand` / `reserved` / `available`** on `Product` are all `readonly`. `available` is a server-computed derivative; clients must never write it.
- **`OrderActions`** is the authoritative source for which UI controls to render. Re-implementing transition rules client-side is an anti-pattern the docblock calls out.
- **`Order.totalItems`** counts *line items* in that order; `PaginationMeta.totalItems` counts *orders matching a query*. The docblock warns against confusing them.
- **`LocaleTenant`** is a free string (1–64 chars, `[a-z0-9-]`), not an enum. Valid tenant ids are a runtime fact discoverable via `GET /locales/tenants`, not a compile-time constant.
- **`Accept-Language`** is deliberately absent from per-operation parameters in the spec. It is a global concern set once via the `orvalMutator` interceptor; the header comment in this file is its contract.
