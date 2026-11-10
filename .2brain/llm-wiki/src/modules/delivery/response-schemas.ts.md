---
source: src/modules/delivery/response-schemas.ts
sha256: 6a8cefe20eeda9ea5ef2f7a8327f8af41a63c5aaecd60b3fb447ff37655fd218
signature: a6689795f754d6c1f3495f67fe87a1a2aac4c944077aae8c52933e4514ccd9c8
generated_at: 2026-11-10T04:18:22.929816+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/response-schemas.ts

## Purpose

Defines the response-envelope schemas for every `delivery` endpoint recognized by the generated route table (`contracts/rest/routes.ts`, derived from `openapi.yaml` `x-module` stamps). It exists as the module-manifest entry that toggles contract validation for the delivery domain: present and enabled → validation on; folder deleted → validation off.

## Key elements

- **`deliveryResponseSchemas`** (exported `ResponseSchemaRoute[]`) — The single public export. Built by calling `routesForModules(schemas, ['delivery'])`, which filters the shared schema registry down to routes stamped with the `delivery` module. Consumed by the module-manifest system to register delivery response-schema validation.

## Relationships

No graph neighbors are tracked for this file. Its runtime dependencies (`@api/schemas`, `@/infrastructure/http/response-schema-map`) are imported but not listed as graph edges in the dependency map.

## Notes

- The array is built at module-load time from a static module list (`['delivery']`). Adding a new sub-module to delivery does **not** require editing this file unless a new `x-module` stamp is introduced in the OpenAPI spec.
- Because registration is manifest-driven, simply deleting this folder (or the `delivery` module directory) removes all delivery contract validation without touching the schema registry or the generated route table.
