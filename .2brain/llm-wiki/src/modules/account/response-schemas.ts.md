---
source: src/modules/account/response-schemas.ts
sha256: 1eeb384bb1f16d37e56b828f7ee154e13f8069109e01dabe4e5d67ddf24003bb
generated_at: 2026-10-02T12:16:13.839294+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/response-schemas.ts

## Purpose

Declares the response-schema contract-validation rows for every REST endpoint attributed to the `account` or `addresses` backend module (the address-book screens have no dedicated frontend module). Registering these rows via the module manifest is what turns envelope validation on or off for the account domain as a whole.

## Key elements

- **`accountResponseSchemas: ResponseSchemaRoute[]`** — The single export. Built by calling `routesForModules(schemas, ['account', 'addresses'])`, which selects from the shared `@api/schemas` registry all rows stamped with one of those two `x-module` values. Consumed downstream by `@/infrastructure/http/response-schema-map` to wire Zod (or equivalent) validation into the HTTP client.

## Relationships

- **`@/infrastructure/http/response-schema-map`** — Supplies both the `routesForModules` helper and the `ResponseSchemaRoute` type used here. The map also defines `SESSION_AND_BOOT_SCHEMA_NAMES`, which explicitly *excludes* the four boot-path calls made by `infrastructure/session.ts` so they are not double-validated.
- **`@api/schemas`** — The generated schema registry (originating from `openapi.yaml`). This file only selects a subset of it; it never defines schemas itself.
- **`contracts/rest/routes.ts`** (generated) — The source of truth for which route belongs to which module; this file's docblock references it for the attribution rule.

## Notes

- The `addresses` module has **no** corresponding frontend module folder; its screens live under `src/modules/account/`, which is why it is grouped here.
- Boot-path calls in `infrastructure/session.ts` are intentionally **absent** from this list (see `SESSION_AND_BOOT_SCHEMA_NAMES`). Do not add them.
- Deleting this file (or the `account` module folder) disables contract validation for the account domain via the manifest mechanism — there is no separate runtime toggle.
