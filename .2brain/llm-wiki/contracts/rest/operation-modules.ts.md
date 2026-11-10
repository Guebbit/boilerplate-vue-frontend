---
source: contracts/rest/operation-modules.ts
sha256: 40309f72a3a0c5096a2e4b7d48f50bdb41226c77bd0c334e7e1bfb58571c82e0
signature: 10d11c9e13c92d6371f1e17531103d13a6b90490f8003e56197c339a86e86592
generated_at: 2026-11-10T02:12:26.578881+00:00
model: ollama:qwen3.8:27b
---

# contracts/rest/operation-modules.ts

## Purpose

Auto-generated lookup table that maps every REST `@api` function to the backend module slug that owns it. It exists so other code and tests can resolve "which module is responsible for this operation?" without re-parsing the OpenAPI spec.

## Key elements

- **`OPERATION_MODULES`** (`Record<string, string>`) — The sole export. A flat map of ~250+ camelCase function names to kebab-case module slugs. Serves as the single source of truth for operation-to-module ownership in the REST contract layer.

## Relationships

- **`tests/cross-cutting/module-coupling.spec.ts`** — Consumes `OPERATION_MODULES` to assert coupling invariants against the module registry.

## Notes

- **Generated file.** Regenerate via `npm run gen:api` (source: `openapi.yaml`). Manual edits will be overwritten.
- Keys are camelCase (matching the generated `@api` function names); values are kebab-case slugs (matching backend module directory / route names).
- Several large modules dominate the map: `account`, `orders`, `locales`, `products`, `payments`, `delivery`, `webhooks` each own 20+ operations.
- No runtime logic lives here — it is a pure data constant intended for static lookups, not for dispatch or network calls.
