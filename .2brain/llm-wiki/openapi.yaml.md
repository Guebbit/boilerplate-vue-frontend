---
source: openapi.yaml
sha256: 3b1c3dc28f4e912ca3836dec68d01a3f1121e51bb7665a4aaf541d8bb4b46039
signature: 3b1c3dc28f4e912ca3836dec68d01a3f1121e51bb7665a4aaf541d8bb4b46039
generated_at: 2026-11-10T02:17:31.305332+00:00
model: ollama:qwen3.8:27b
---

# openapi.yaml

## Purpose

This is the **generated, bundled** OpenAPI 3.1.0 contract for the Boilerplate API. It is produced by `npm run contracts:bundle` from `shared/contracts/openapi.root.yaml` plus per-module specs in `src/modules/*/openapi.yaml`. It is the single stable spec consumed by code generators (client/server stubs, DTOs, SDKs) across multiple projects and languages. **Do not edit it by hand.**

## Key elements

- **`info.description`** — A long prose block that serves as the *de facto* API-level contract for cross-cutting conventions: `Accept-Language` / `Content-Language` / `Vary` handling, response shape rules (no wrappers, `{ items, meta }` for paged lists, `204` for empty, `201` + `Location` for creates), and the RFC 9457 `application/problem+json` error envelope (`type`, `title`, `status`, `detail`, `instance`, `errors[].code`). This block is the contract for behaviors that are deliberately **not** declared per-operation (e.g. the language header).
- **`tags`** — ~28 named groups, each tagged with `x-family` (Core, Catalogue, Buying, After the sale, Running the shop, Example). They double as the module map for the API.
- **`paths`** — Concrete operations per module. Shown (before truncation): `/` (health ping), `/config` (public boot config), `/livez` (orchestrator liveness), `/readyz` (readiness). Each operation carries standard response headers (`x-request-id`, `Cache-Control`, `Content-Language`, `Vary`, `RateLimit-*`, `ETag`) and references shared `#/components/…` for headers, schemas, and error responses.
- **`servers`** — Two environments: `http://localhost:3000` (Local) and `https://api.example.com` (Production).
- **`components`** (referenced, not shown) — Shared schemas (`HealthPing`, `Config`, etc.), header definitions, and reusable error responses (`TooManyRequests`, `InternalError`, `ServiceUnavailable`, `NotModified`).

## Relationships

- **`contracts/`** — The source directory that feeds this file. `npm run contracts:bundle` merges the specs in `contracts/` (including `openapi.root.yaml` and per-module files) into this bundled output. Changes flow from `contracts/` into this file.
- **`spectral.yaml`** — The Spectral linting ruleset applied to this file (and its sources) to enforce structural and stylistic rules on the OpenAPI document.
- **`github/actions/paired-backend/action.yml`** — A composite GitHub Action that references this file (or the build script that produces it) as part of a backend validation step in CI.
- **`README.md`** — The project readme references this file as the canonical API contract and points readers to it for endpoint documentation.

## Notes

- **Generated — never edit.** The first line says `DO NOT EDIT`. All changes must go through the source files in `contracts/` and `src/modules/*/openapi.yaml`, then a re-bundle.
- **The `info.description` block is load-bearing.** It documents cross-cutting behaviors (i18n, error shape, response conventions) that are intentionally *not* encoded as per-operation OpenAPI parameters or annotations. Code generators and human readers both rely on it; removing or rewording it without updating all downstream consumers will break the contract.
- **`Accept-Language` is not a declared parameter on any operation.** This is a deliberate choice to keep generated function signatures clean. The prose in `info.description` is the sole contract for that header.
- **Draft-language preview** (staff-only, `display:Locale` scope) returns `Cache-Control: private, no-store` and is never cached server-side. This is documented only in the description block, not in per-operation metadata.
- The file is truncated in the snippet above; the full path set is substantially larger than the four endpoints shown.
