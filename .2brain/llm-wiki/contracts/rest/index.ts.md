---
source: contracts/rest/index.ts
sha256: c4162248dccc46b96153d53e3c3e12e0275d380c9a3047579de37ff01fc78292
generated_at: 2026-10-02T14:30:30.046652+00:00
model: ollama:qwen3.8:27b
---

# contracts/rest/index.ts

## Purpose

Auto-generated (orval v8.20.0) REST client types and DTOs for the Ecommerce Demo API. It defines every wire-level type — request payloads, response envelopes, pagination metadata, and domain models — so that both the server runtime and any external consumer share a single source of truth for the API contract. The file is committed to the repo and must not be edited by hand.

## Key elements

- **`orvalMutator`** (import) — HTTP transport hook from `src/infrastructure/http/index.ts`; all generated request functions delegate through it.
- **Scalar aliases** — `Page`, `PageSize`, `Id`, `Text`, `Email`, `Password`, `PasswordNew`, `Locale`, `CountryCode`, `ImageUrl`, `ImageRemoval`, `ThumbnailUrl`, `Sku`. Each carries JSDoc constraints (`@minLength`, `@pattern`, etc.) that orval bakes into the generated client for validation.
- **`ImageRemoval`** — a write-only type whose sole valid value is `null` (meaning "remove current image"). A new image is always sent as multipart bytes, never as a path.
- **Response envelopes** — `MessageResponse`, `ErrorResponse`, `ValidationErrorResponse`. All share the `success`/`status`/`message` triple; error responses add a `minItems: 1` array of `ErrorItem` (stable `code` + human `message` + optional `details`).
- **`Abilities` / `AbilitiesEnvelope`** — CASL packed-rule authorization payload. Contains two independent rule lists (`tenant`, `platform`), a `subjects` string array, an optional `tenantId`, and a `version` number that clients use to invalidate their ability cache.
- **`User` / `UserEnvelope`** — the user entity as returned by the API, including `imageUrl`, `thumbnailUrl`, `locale`, `twoFactorEnabledAt`, soft-delete timestamp, etc.
- **`Product` / `CartItem`** — catalogue and cart models. Notable invariants: `price` is always gross (VAT-included), `currency` is readonly and reflects the shop's *current* setting, and inventory is exposed as three readonly counters (`onHand`, `reserved`, `available`).
- **`TaxClass` / `RateType`** — discriminated unions (reduced | zero; standard | zero-rated | exempt) describing how a product's VAT rate is determined.
- **`PackedRules`** — nested arrays representing CASL rules in packed format; used by `Abilities` and by any endpoint that publishes permissions.

## Relationships

- **`src/infrastructure/http/index.ts`** — the sole runtime import. `orvalMutator` is the single choke-point through which every generated request function dispatches HTTP calls (auth headers, base URL, error normalisation live there, not here).
- **`src/modules/account/tests/password-reset-request-view.spec.ts`**, **`src/modules/orders/tests/order-view.spec.ts`**, **`src/modules/orders/tests/orders-list-view.spec.ts`**, **`src/modules/products/tests/product-view.spec.ts`**, **`src/modules/users/tests/user-view.spec.ts`** — module-level view tests that import the type aliases and interfaces defined in this file to assert the shape of server-rendered views against the contract (e.g., that a `UserEnvelope.data` conforms to the `User` interface, that a `Product.price` satisfies `@minimum 0`, etc.). They treat this file as the normative schema under test.

## Notes

- **Generated artifact.** The header states "Do not edit manually." Regenerate with `orval` after any OpenAPI spec change; local edits will be overwritten.
- **Language header is global, not per-operation.** `Accept-Language` is deliberately *not* declared on individual operations in the spec. The block comment at the top of the file is the contractual description. Clients set it once in an interceptor; the server always returns `Content-Language` and `Vary: Accept-Language`.
- **`Password` vs `PasswordNew`.** `Password` (min 8, no pattern) is for *proving* an existing password (login, current-password leg). `PasswordNew` (min 8 + complexity pattern) is for *setting* one. Conflating them breaks the "don't leak policy to an attacker guessing" invariant.
- **`ImageUrl` allows relative paths.** It is typed as `uri-reference`, not `uri`, because uploaded images are stored server-relative. An empty string is *not* "no image" — only `null` on a nullable field is.
- **`Abilities` has two independent scopes.** `tenant` and `platform` rule lists never merge. A client must build one CASL `Ability` per scope and query the scope that owns the subject. The client-side copy is advisory (UI rendering) only; every request is re-authorised server-side.
- **`Product.currency` is readonly and mutable at the shop level.** It reports the deployment's current default currency, not a per-product value. An order freezes its own `currency` at checkout; this field will reflect whatever the shop changes it to afterwards.
- **`Sku` is optional but unique when present.** `''` is invalid (same `minLength: 1` rationale as `ImageUrl`). Once set, it is frozen onto `OrderLineProduct.sku` at checkout.
