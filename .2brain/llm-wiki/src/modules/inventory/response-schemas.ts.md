---
source: src/modules/inventory/response-schemas.ts
sha256: 16dd0e37d7675832c8280afed5f3507f0a778f7ba1af1b9669cfadadaab2790e
signature: ae67ea97265446b120cbf391835970e73c3304271b6cdec47d72316281cbfc6a
generated_at: 2026-11-10T04:32:02.945381+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/response-schemas.ts

## Purpose

Declares the response-envelope schema rows for every backend `inventory` endpoint identified in the OpenAPI contract. The rows are consumed by the generated route table (`contracts/rest/routes.ts`) so that incoming responses can be validated against the expected envelope shape.

## Key elements

- **`inventoryResponseSchemas`** (exported constant, type `ResponseSchemaRoute[]`) — The single public export. Built by calling `routesForModules(schemas, ['inventory'])`, which filters the global schema registry (`@api/schemas`) down to routes tagged with the `inventory` module.
- **`routesForModules`** (imported from `@/infrastructure/http/response-schema-map`) — Helper that selects schema rows by module name; the file itself performs no filtering logic.
- **`ResponseSchemaRoute`** (imported type from `@/infrastructure/http/response-schema-map`) — The row shape every entry in the array must satisfy; its own docblock documents the two invariants each row obeys.

## Relationships

No graph neighbors are tracked for this file.

## Notes

- Registration is **module-manifest-driven**: importing this file (i.e., having the `inventory` folder present) turns contract validation on for its endpoints; deleting the folder removes the schemas from the runtime registry. There is no explicit enable/disable flag.
- The set of endpoints covered is determined entirely by the `x-module: inventory` stamps in `openapi.yaml` — adding or removing an endpoint in the spec automatically changes the contents of `inventoryResponseSchemas` without editing this file.
