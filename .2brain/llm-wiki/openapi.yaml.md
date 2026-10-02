---
source: openapi.yaml
sha256: bd1971fcd4cbd42240f18f7a171aa56dda95b7cea0db93e891c42bf79b908ffb
generated_at: 2026-10-02T14:33:05.610014+00:00
model: ollama:qwen3.8:27b
---

# openapi.yaml

## Purpose
Generated OpenAPI 3.0.3 contract for the "Ecommerce Demo API" (v0.1.0). Produced by `npm run contracts:bundle` from `shared/contracts/openapi.root.yaml` and per-module files under `src/modules/*/openapi.yaml`. Serves as the single source of truth for code generation (client/server stubs, DTOs, SDKs) across multi-language, multi-project consumers.

## Key elements
- **Info / i18n contract** — `info.description` documents the `Accept-Language` policy: it selects user-facing copy only (error messages, success envelope), never response shape or machine-readable codes. The header is deliberately *not* declared per-operation; the description paragraph is its contract.
- **Tags** — 20 domain tags (Auth, Antibot, Account, Users, Products, Cart, Wishlist, Orders, Payments, Invoicing, Delivery, Returns, Inventory, Feedback, System, Observability, Audit, Webhooks, ApiKeys). Several carry descriptive prose disambiguating scope (e.g. Invoicing vs. Returns; Audit vs. Observability).
- **Paths (shown)** — `/` (health ping), `/livez` (liveness), `/readyz` (readiness), `/.well-known/security.txt` (RFC 9116), `/locales` (GET/POST), `/locales/tenants` (GET), `/locales/{locale}` (GET/PUT). File is truncated; additional module paths follow.
- **Components** — Schemas (e.g. `HealthPingEnvelope`, `LocaleCapabilitiesEnvelope`, `CreateLocaleRequest`), shared responses (`TooManyRequests`, `ServiceUnavailable`, `ValidationError`, …), and headers (`Location`) referenced via `$ref`.
- **`x-module` extensions** — Custom vendor field on each operation tying it back to a source module (e.g. `x-module: locales`).
- **Servers** — Local (`http://localhost:3000`) and Production (`https://api.example.com`).

## Relationships
- **`spectral.yaml`** — Spectral lint rules applied to this file; governs style, naming, and structural conventions checked in CI.
- **`github/workflows/ci.yml`** — CI pipeline that bundles, lints (via Spectral), and likely runs breaking-change detection on this spec before it is consumed by downstream codegen.

## Notes
- **DO NOT EDIT.** Regenerate via `npm run contracts:bundle`; edit the sources in `shared/contracts/` and `src/modules/*/` instead.
- The `Accept-Language` header is intentionally absent from every operation's parameter list. Clients set it once in an interceptor; the contract lives in `info.description` only.
- `/livez` and `/readyz` return **empty bodies** by design; `/` (root) returns a JSON `HealthPingEnvelope`. Do not conflate them — liveness must never depend on external resources.
- `/locales/{locale}` (API's own dictionary, tier 1) is distinct from `/locales/{locale}/messages` (client-facing dictionary from the DB). The former exists for the client to render copy when no API response arrives at all.
- `x-module` is a non-standard vendor extension; codegen tooling that ignores unknown `x-` fields will still work, but module-level grouping metadata is lost.
