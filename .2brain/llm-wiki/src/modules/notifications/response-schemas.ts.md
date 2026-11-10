---
source: src/modules/notifications/response-schemas.ts
sha256: a810cc16fc49aa1c0d9640afdefcb10f7e31f592e7b05180d4b0f7270b2991db
signature: ce9245fa3b4367c79aca6b3ed755f1d113a11ea1d5a6ce90e708177d4e331c3c
generated_at: 2026-11-10T04:48:34.951045+00:00
model: ollama:qwen3.8:27b
---

# src/modules/notifications/response-schemas.ts

## Purpose

Defines and exports the response-envelope schema rows for every endpoint the `notifications` module calls. It plugs the module into the global contract-validation pipeline by registering a `ResponseSchemaRoute[]` under the `'notifications'` key, so that enabling the module activates validation and removing the folder disables it.

## Key elements

- **`notificationsResponseSchemas`** (exported const, type `ResponseSchemaRoute[]`) — The sole export. Built by calling `routesForModules(schemas, ['notifications'])`, which selects the subset of schemas in `@api/schemas` stamped to the `notifications` module (via `x-module` annotations in `openapi.yaml`).
- **`routesForModules`** (imported from `@/infrastructure/http/response-schema-map`) — Helper that filters the full schema registry down to the routes belonging to the given module name(s).
- **`schemas`** (imported from `@api/schemas`) — The centralized, generated schema registry that `routesForModules` filters against.
- **`ResponseSchemaRoute`** (type import) — The row shape each entry in the array conforms to; its own docblock specifies the two invariants every row must satisfy.

## Relationships

No graph neighbors are recorded for this file. Its only runtime coupling is the import of `routesForModules` and `ResponseSchemaRoute` from `@/infrastructure/http/response-schema-map` and the `@api/schemas` package.

## Notes

- The file is intentionally tiny and declarative: adding or removing an endpoint's schema row happens by changing the `x-module` stamp in `openapi.yaml` and regenerating, not by editing this file.
- Because registration is manifest-driven, the file acts as a switch — it exists to opt the notifications module into contract validation, not to define any logic itself.
- The two rules every `ResponseSchemaRoute` row obeys are documented in the `ResponseSchemaRoute` type's own docblock, not here; see `@/infrastructure/http/response-schema-map` for the authoritative statement.
