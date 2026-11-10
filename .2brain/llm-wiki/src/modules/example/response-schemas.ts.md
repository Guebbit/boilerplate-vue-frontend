---
source: src/modules/example/response-schemas.ts
sha256: 867c1aa3c9064a0a95f7a5da38470eddaf0d846f29d32e488b48bf3ddeb8c335
signature: 3f22ed2b3fa28b4f5ec4e3a61f0d0f032ff52dc723c0eb3957487124af856692
generated_at: 2026-11-10T04:23:00.527555+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/response-schemas.ts

## Purpose

Defines the response-schema routes for every `example` operation the generated table attributes to the `example` backend module. It exists so that contract validation for this module's endpoints can be toggled simply by enabling or removing the module folder, without a per-route line.

## Key elements

- **`exampleResponseSchemas`** (exported const, type `ResponseSchemaRoute[]`) — The single export. Built by calling `routesForModules(schemas, ['example'])`, which maps the shared `@api/schemas` definitions into the response-schema rows the infrastructure expects.
- **`schemas`** (import from `@api/schemas`) — The upstream OpenAPI/schema package supplying the raw operation definitions.
- **`routesForModules` / `ResponseSchemaRoute`** (import from `@/infrastructure/http/response-schema-map`) — Helper and type from the HTTP infrastructure layer that shape and type the schema rows.

## Relationships

No graph neighbors are registered for this file. It is a leaf module whose sole import sources (`@api/schemas`, `@/infrastructure/http/response-schema-map`) are consumed here; no other file in the dependency graph is recorded as importing or depending on this one.

## Notes

- The file is intentionally minimal: all routing logic lives in `routesForModules`. Adding a new `example` operation should require only that the operation appears in `@api/schemas` — no edit to this file is needed (as stated in the docblock: "picked up by the table without a line per route").
- Enabling/disabling is folder-level: registering the module manifest turns validation on; deleting the folder turns it off. Do not add per-route conditionals here.
- Conventions and rules for every `ResponseSchemaRoute` row are documented in the `ResponseSchemaRoute` docblock (see `@/infrastructure/http/response-schema-map`).
- For the broader module-template rationale, see `docs/theory/modules.md#the-module-template`.
