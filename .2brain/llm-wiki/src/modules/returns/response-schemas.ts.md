---
source: src/modules/returns/response-schemas.ts
sha256: 5942844a80fe15f6aca4e13b4ad516932a86d195e47c408546a0b3f47f650371
signature: 2edc3e7f16d51f1a7f2f555eac68459a32ec852eed623362d8faf617401163b2
generated_at: 2026-11-10T05:38:15.860497+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/response-schemas.ts

## Purpose

Registers the response-envelope schemas for every REST endpoint that the OpenAPI contract attributes to the `returns` backend domain. It is the single import point the module manifest uses to turn contract validation on for `returns` routes.

## Key elements

- **`returnsResponseSchemas`** (`ResponseSchemaRoute[]`) — The sole export. Built by calling `routesForModules(schemas, ['returns'])`; returns an array of route/schema pairs that the HTTP infrastructure uses to validate response envelopes at runtime.

## Relationships

No graph neighbors are recorded for this file. It imports `@api/schemas` (generated schema objects) and `routesForModules` / `ResponseSchemaRoute` from `@/infrastructure/http/response-schema-map`, but those upstream modules do not import back.

## Notes

- Registration is **manifest-driven**: adding this file (and its import in the module manifest) enables validation; deleting the `returns` module folder removes it. There is no runtime toggle.
- The set of routes included is determined entirely by `x-module` stamps in `openapi.yaml`—there is no manual route list here.
- Depends on `@api/schemas` (the generated schema objects) and `routesForModules` / `ResponseSchemaRoute` from the shared `response-schema-map` infrastructure; it introduces no logic of its own.
