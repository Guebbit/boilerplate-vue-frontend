---
source: src/modules/api-keys/response-schemas.ts
sha256: f1542f43dde6db1733fda04648c71b6ccea09df4fb8a775f1f78f335d2b6a9d8
signature: 33ab2364d79b2bb2b8e9c37c7e70f14f3b4b3130f594d1caa5b90ee45fd2d5ff
generated_at: 2026-11-10T03:49:35.197295+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/response-schemas.ts

## Purpose

Declares the response-envelope schemas for every API endpoint attributed to the backend `api-keys` module (as stamped via `x-module` in `openapi.yaml`). It exists so that the domain's contract validation can be toggled on/off simply by including or deleting the module folder.

## Key elements

- **`apiKeysResponseSchemas`** (exported const, `ResponseSchemaRoute[]`) — The sole export. Built by calling `routesForModules(schemas, ['api-keys'])`, which filters the shared schema set down to rows belonging to the `api-keys` module.

## Relationships

No graph-neighbor files are recorded for this module. It imports from two infrastructure locations:

- `@/infrastructure/http/response-schema-map` — provides `routesForModules` (the builder function) and the `ResponseSchemaRoute` type that shapes each row.
- `@api/schemas` — the shared schema namespace passed into `routesForModules`.

## Notes

- The file is intentionally thin: all row logic lives in `routesForModules`; the only module-specific input is the string `'api-keys'`.
- Because registration flows through the module manifest, there is no separate "enable" step — the folder's presence is the switch. Deleting the folder disables validation with no other cleanup required.
- The generated route table (`contracts/rest/routes.ts`) is the consumer that looks these rows up; this file does not import or reference that table directly.
