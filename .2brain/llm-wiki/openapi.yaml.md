---
source: openapi.yaml
sha256: def7542fb1b9b5a855eccfcdf3db85407362e656c14340989f000e7c883c405a
generated_at: 2026-10-16T23:56:54.717311+00:00
model: ollama:qwen3.8:27b
---

# openapi.yaml

## Purpose

Generated OpenAPI 3.1.0 contract for the Boilerplate API. It is the single bundled spec produced by `npm run contracts:bundle` from `shared/contracts/openapi.root.yaml` and per-module `src/modules/*/openapi.yaml` files. It exists to serve as the stable, codegen-oriented source of truth for client/server stubs, DTOs, and SDKs across multiple projects and languages.

## Key elements

- **`info.description`** — Encodes the `Accept-Language` contract: it selects only user-facing copy (`errors[].message`, success `message`), never response shape, status code, or machine-readable codes. Declared globally (not per-operation) so clients set it once via an interceptor.
- **System paths** (`/`, `/livez`, `/readyz`, `/.well-known/security.txt`) — Health, liveness, readiness, and RFC 9116 disclosure endpoints. `security: []` (fully public).
- **`paths./locales`** — `GET` lists supported languages with per-app capability; `POST` (admin) registers a new dynamic-tier language.
- **`paths./locales/apps`** — `GET` lists the configured app keyspaces (`backend` vs `frontend`) so clients don't hardcode them.
- **`tags`** — ~25 domain tags (Auth, Products, Cart, Orders, Payments, Delivery, Returns, Webhooks, ApiKeys, etc.) each scoped with an `x-module` reference for codegen.
- **`servers`** — Local (`http://localhost:3000`) and production (`https://api.example.com`) targets.
- **Shared `$ref` responses** — Standardized error responses (400, 401, 403, 409, 413, 415, 422, 429, 500, 503) referenced across every operation.

## Relationships

- **`spectral.yaml`** — Spectral lint rules applied to this file in CI; the spec must pass those checks before merging.
- **`github/workflows/ci.yml`** — CI pipeline invokes the bundle script (`npm run contracts:bundle`) to regenerate this file, then runs Spectral and any codegen against the result. Editing this file directly is futile because the next build overwrites it.

## Notes

- **Do not edit.** The header comment and the bundle script mean any manual change is lost on the next `npm run contracts:bundle`. All modifications go to the per-module `openapi.yaml` sources or `openapi.root.yaml`.
- **OpenAPI 3.1.0**, not 3.0.x — consumers must support JSON Schema 2020-12 semantics (e.g. `type: ["string","null"]` is valid).
- **`Accept-Language` is intentionally absent from every `parameters` block.** The contract lives in `info.description` prose; codegen tooling will not emit a per-endpoint language argument.
- **`security: []`** on public endpoints is explicit (not omitted) to override any global security scheme during codegen.
- **`x-module`** extensions tag operations to their owning source module, enabling per-module codegen slicing.
