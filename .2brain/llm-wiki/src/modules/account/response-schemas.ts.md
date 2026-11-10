---
source: src/modules/account/response-schemas.ts
sha256: 558cce952fbc8dd434dc15960d32060c1dbca1f23be5fc736ebd8b1e3a745853
signature: bd7f0da817c4248655953fee65ade57deef4716b74e1fa9a78295a4b3244cc03
generated_at: 2026-11-10T03:25:04.604201+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/response-schemas.ts

## Purpose

Declares the response-envelope schemas for every REST endpoint owned by the `account` and `addresses` backend modules, so that contract validation can be toggled per-domain via the module manifest. It is the wiring point that turns "this module is loaded" into "these HTTP response shapes are validated."

## Key elements

- **`accountResponseSchemas: ResponseSchemaRoute[]`** — the sole export. Built by calling `routesForModules(schemas, ['account', 'addresses'])`, which resolves the OpenAPI-derived schema map for those two backend module stamps. The `addresses` stamp is included here because address-book screens have no dedicated frontend module of their own.
- **`routesForModules`** (imported from `@/infrastructure/http/response-schema-map`) — the generic helper that filters the global schema registry down to the requested module stamps.
- **`ResponseSchemaRoute`** (type, same origin) — the shape of one row in the response-schema table; its own docblock defines the two invariants every row must satisfy.

## Relationships

No graph neighbors are recorded for this file. Its imports (`@api/schemas`, `@/infrastructure/http/response-schema-map`) are upstream dependencies only.

## Notes

- Session and boot-path HTTP calls are deliberately **excluded** from this list; they are handled separately via `SESSION_AND_BOOT_SCHEMA_NAMES` in `response-schema-map.ts`.
- The file is purely declarative (a single const). Enabling the `account` domain in the manifest activates validation for every row; deleting the module folder disables it — no imperative registration logic lives here.
- `addresses` is not a standalone frontend module; it is bundled into this file because the generated route table (`contracts/rest/routes.ts`, derived from `openapi.yaml`'s `x-module` stamps) assigns those routes to the `account` frontend surface.
