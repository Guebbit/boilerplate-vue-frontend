---
source: contracts/rest/index.ts
sha256: 48448326066436c540e21386c16c8b9d3214de6021884ca39eb8be30ce6bcbc9
signature: f3c99f79cce308698e054fc1db3409b6796019b0e1478e41981eecdc834d2f92
generated_at: 2026-11-10T02:12:12.332725+00:00
model: ollama:qwen3.8:27b
---

# contracts/rest/index.ts

## Purpose

Auto-generated (orval v8.20.0) TypeScript type definitions for the project's OpenAPI REST contract. It exists so that every consumer—server handlers, client views, tests—shares a single, versioned definition of request/response shapes, pagination semantics, RFC 9457 error structure, and the i18n contract (language selection, `Content-Language`, `Vary` behaviour). The file is regenerated from the OpenAPI spec; manual edits are overwritten.

## Key elements

- **Scalar type aliases** – `Page` (1–10 000), `PageSize` (1–100), `Id`, `Text`, `CurrencyCode` (ISO 4217), `DecimalAmount` / `NonNegativeDecimalAmount` (plain decimal strings), `Email`, `Locale` (BCP 47), `CountryCode` (ISO 3166-1 alpha-2), address fields, `ImageUrl`, `ImageRemoval` (always `null`), `ThumbnailUrl`.
- **`PaginationMeta`** – `{ page, pageSize, totalItems, totalPages }`; the standard envelope for paged list responses.
- **`Problem` / `ErrorItem` / `ProblemType`** – RFC 9457 problem-details shape returned on every 4xx/5xx. `ProblemType` is always `'about:blank'`; machine key lives in `ErrorItem.code`.
- **`PurchaseHold` / `PurchaseHoldReason`** – reason enum (`repeated_cancellations`, `staff`) and hold metadata attached to an `Account`.
- **`Account`** – full user record including optional `pendingEmail`, `purchaseHold`, consent timestamps, 2FA flag.
- **`SessionConfig` / `SessionConfigMode` / `SessionConfigLifetimeSeconds`** – deployment-level session mode (`jwt` | `cookie`) and per-tier lifetimes.
- **`orvalMutator` import** – pulls the HTTP transport mutator from `src/infrastructure/http/index.js` so generated functions route through the project's fetch/interceptor layer.
- **Endpoint functions** (truncated in the sample) – one generated function per OpenAPI operation, typed with the above.

## Relationships

- **`src/infrastructure/http/index.ts`** – this file imports `orvalMutator` from there; that module supplies the fetch wrapper and interceptor logic that every generated call routes through.
- **`contracts/asyncapi.generated.ts`** – sibling generated contract covering the project's async (WebSocket / SSE) channels; the two files are produced by the same codegen pipeline but target different transports.
- **`src/modules/orders/store.ts`** – consumes types and endpoint functions from this file for its order-related state and API calls.
- **`src/modules/notifications/notices.ts`** – uses the `ErrorItem` / `Problem` shapes to map API errors into user-facing notice objects.
- **`scripts/lighthouse/evaluate.ts`** – calls generated endpoint functions to issue scripted requests during Lighthouse-based integration runs.
- **Test files** (`password-reset-request-view.spec.ts`, `cart-view-double-submit.spec.ts`, `cart-view-stale-refusal.spec.ts`, `guest-cart-store.spec.ts`, `store-checkout-key.spec.ts`, `store-stock-poll.spec.ts`, `entity-translations-leave-guard.spec.ts`, `admin-audit-tab.spec.ts`, `order-view.spec.ts`, `orders-list-view.spec.ts`) – depend on the type exports from this file to type their fixtures and assertions.

## Notes

- **Do not edit by hand.** The header explicitly states the file is orval-generated; changes go through the OpenAPI spec and a regeneration step.
- **`ImageRemoval` is always `null`.** The write-side field uses `null` to mean "remove image"; new images are uploaded via multipart `imageUpload` bytes, never by naming a path.
- **`ImageUrl` uses `uri-reference`, not `uri`.** Uploaded images are stored as server-relative paths (e.g. `/uploads/abc.jpg`), which are not valid absolute URIs.
- **`Locale` and `CountryCode` are shape-checked only.** Whether a particular tag or code is actually supported is a runtime fact discovered via `GET /locales` and `GET /delivery/methods`, not a contract constraint.
- **Error branching key is `ErrorItem.code`, never `message`.** `Problem.detail` is the human-readable, language-translated sentence; `Problem.title` is the fixed English RFC 9110 phrase.
- **Pagination bounds are strict.** `page` is 1–10 000 and `pageSize` is 1–100; out-of-range values produce a 422—nothing is silently clamped.
- **Language selection is not a per-operation header.** `Accept-Language` applies globally; it is intentionally omitted from individual operation definitions to avoid a redundant argument on every generated function. The file's header comment is the authoritative contract for that behaviour.
