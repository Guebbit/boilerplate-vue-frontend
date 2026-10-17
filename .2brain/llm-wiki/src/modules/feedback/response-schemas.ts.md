---
source: src/modules/feedback/response-schemas.ts
sha256: 3418b90df300eeb7d27d05d8af49a06ab7ec31c4de44bbc645330a2f2981e035
generated_at: 2026-10-17T00:55:38.667197+00:00
model: ollama:qwen3.8:27b
---

# src/modules/feedback/response-schemas.ts

## Purpose

Declares the response-schema route rows for every endpoint the `feedback` backend module owns. These rows feed the shared contract-validation map so that, once the module is enabled, incoming/outgoing responses on feedback routes are checked against the expected envelopes derived from the OpenAPI spec.

## Key elements

- **`feedbackResponseSchemas: ResponseSchemaRoute[]`** — The sole export. Built by calling `routesForModules(schemas, ['feedback'])`, which filters the global schema registry (`@api/schemas`) down to routes stamped with the `feedback` x-module tag in `openapi.yaml`.

## Relationships

- **`@/infrastructure/http/response-schema-map`** — Provides both the `routesForModules` helper and the `ResponseSchemaRoute` type used to shape the export.
- **`@api/schemas`** — The shared schema registry that `routesForModules` filters to produce the final array.
- **Module manifest (implicit)** — The docblock states the array is registered through the module manifest; enabling the `feedback` domain activates contract validation, and deleting this folder disables it.

## Notes

- The array is generated, not hand-authored: adding or removing a feedback endpoint means updating `openapi.yaml` (specifically its `x-module` stamps), not editing this file.
- Because the export is a plain constant (no conditional logic), the "on/off" behavior is entirely controlled by whether the module manifest includes the `feedback` entry.
