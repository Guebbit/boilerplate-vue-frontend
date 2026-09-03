# openapi.yaml

## Purpose

A generated OpenAPI 3.0.3 contract that defines the REST API surface for the Ecommerce Demo (v2.0.0). It is the single, codegen-oriented spec from which client/server stubs, DTOs, and SDKs are produced across projects and languages. Developers never edit it directly; it is produced by bundling module-level specs.

## Key elements

- **`info` block** — Carries the API title, version, and a long description that doubles as the i18n contract (Accept-Language behaviour, fallback rules, `Content-Language` / `Vary` headers, `GET /locales` as the discovery endpoint).
- **`servers`** — Two declared targets: local (`http://localhost:3000`) and production (`https://api.example.com`).
- **`tags`** — 14 domain tags (Auth, Account, Users, Products, Cart, Wishlist, Orders, Payments, Delivery, Inventory, Feedback, System, Observability) used to group operations in generated clients.
- **`paths`** — All REST endpoints. The visible portion covers System/Observability routes: `/` (health ping), `/locales` (list/create), `/locales/tenants`, `/locales/{locale}` (CRUD for a language), `/locales/{locale}/messages` (client dictionary download), `/locales/{locale}/entries` (paginated translation rows). The remainder (auth, products, cart, orders, etc.) is truncated but follows the same pattern.
- **`components`** — Shared schemas (e.g. `HealthPingEnvelope`, `LocaleCapabilitiesEnvelope`, `LanguageEnvelope`, request/response envelopes), reusable parameters (`LocalePathParam`, `PageParam`, `PageSizeParam`, `TextParam`, `MessagesTenantQueryParam`), and named responses (`Unauthorized`, `Forbidden`, `NotFound`, `Conflict`, `ValidationError`, `InternalError`, `Success`).
- **Security** — `bearerAuth` (OAuth2 / Bearer token) applied to admin and tenant-mutating operations; public reads (locales, health) carry no security requirement.

## Relationships

- **`src/modules.ts`** — The module registry whose per-module `openapi.yaml` files are the *source* inputs to the bundler. Editing a module's spec and re-running `npm run contracts:bundle` is the intended workflow; this file is the output.
- **`asyncapi.yaml`** — Sibling contract in the repository that covers non-REST (event/stream) interfaces. Together the two files form the full API contract; codegen tooling consumes both.
- **`README.md`** — Project-level documentation that references this file as the canonical REST spec and points readers to the `contracts:bundle` script for regeneration.

## Notes

- **Generated file.** The header comment states `DO NOT EDIT`. All changes must go through `shared/contracts/openapi.root.yaml` or the per-module files under `src/modules/*/openapi.yaml`, followed by `npm run contracts:bundle`.
- **Accept-Language is intentionally undeclared per-operation.** The `info.description` paragraph is the authoritative contract for i18n behaviour. Codegen tooling should not expect a per-path `Accept-Language` parameter.
- **Two-tier dictionary model.** `GET /locales/{locale}` serves the *backend* (deployed-file) dictionary; `GET /locales/{locale}/messages` serves the *frontend* (database-stored, per-tenant) dictionary. Clients are expected to merge the latter over the former. Passing the `backend` tenant to the messages endpoint returns 404.
- **Locale deletion is destructive and gated.** `DELETE /locales/{locale}` removes all translated entries and refuses with 409 while the locale is still active; the caller must deactivate first.
- **Inactive locales are invisible** to all public read routes (they return 404 as if absent). Only ADMIN-authenticated calls to `GET /locales` surface them with `active: false`.
