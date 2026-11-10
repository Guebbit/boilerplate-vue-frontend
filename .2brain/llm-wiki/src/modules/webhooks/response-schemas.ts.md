---
source: src/modules/webhooks/response-schemas.ts
sha256: 030a15d0e82118425010ab5b4c99cf37e1d668b04d3a70f2534ee9c76c970f47
signature: c78e832d7c80cf2a0408c87f68c8883b98e6ce4b1240d928e7a287f547039fd6
generated_at: 2026-11-10T06:13:00.171868+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/response-schemas.ts

## Purpose

Declares the response-schema contract rows for every operation the generated route table (`contracts/rest/routes.ts`) attributes to the `webhooks` backend module. It exists so that the global response-envelope validation pipeline knows which OpenAPI response shapes apply to webhooks endpoints.

## Key elements

- **`webhooksResponseSchemas: ResponseSchemaRoute[]`** — The sole export. Built by calling `routesForModules(schemas, ['webhooks'])`, which filters the shared schema registry (`@api/schemas`) down to routes stamped with `x-module: webhooks` in `openapi.yaml`. Each entry describes the expected response envelope for one webhooks endpoint.

## Relationships

No graph neighbors are recorded for this file. It consumes two external modules (`@api/schemas` and `@/infrastructure/http/response-schema-map`) but no other files in the dependency graph import it directly; it is consumed indirectly through the module-manifest registration mechanism described in its docblock.

## Notes

- Enabling or disabling the webhooks domain is purely folder- and manifest-driven: the file's presence (and its registration via the module manifest) turns contract validation on; deleting the folder turns it off. There is no runtime toggle.
- The `routesForModules` helper does the filtering; this file itself contains no per-route logic. If a route is missing, check the `x-module` stamp in `openapi.yaml` rather than editing this file.
