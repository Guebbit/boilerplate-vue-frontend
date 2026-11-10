---
source: src/modules/stock-alerts/response-schemas.ts
sha256: d9e395ec925aa85514b588f79682be7474af27cddb6f10c3968f1c277f524ae8
signature: 7e3d689f87f797bb87899deebb8f72756caed4b862f9b70b0022d7bbb483d821
generated_at: 2026-11-10T05:54:45.976355+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stock-alerts/response-schemas.ts

## Purpose

Declares the response-envelope schema rows for every endpoint the `stock-alerts` domain calls. The rows are registered through the module manifest so that contract validation is enabled by the module's presence and disabled by deleting the folder.

## Key elements

- **`stockAlertsResponseSchemas`** (`ResponseSchemaRoute[]`) — The single export. Built by calling `routesForModules(schemas, ['stock-alerts'])`, which filters the shared schema registry (`@api/schemas`) to rows stamped with the `stock-alerts` module tag. Consumed by the HTTP infrastructure for response contract validation.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The module tag (`'stock-alerts'`) must match the `x-module` stamp in `openapi.yaml`; a mismatch silently yields an empty row array.
- Validation is toggled purely by folder existence — no feature-flag or config entry is involved.
- The type `ResponseSchemaRoute` is imported as a type-only import; the runtime value comes from `routesForModules`.
