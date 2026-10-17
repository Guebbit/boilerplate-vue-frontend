---
source: src/modules/api-keys/routes.ts
sha256: fa03a84a912b43e0d9472819f520d1f009d57ff5d7ebccae093a15625f0ce756
generated_at: 2026-10-17T00:31:49.791611+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/routes.ts

## Purpose

Declares the two route records for the api-keys module (list and create/mint). There is deliberately no edit or detail route: API keys are immutable after minting, so every field fits in a list row and there is nothing to patch.

## Key elements

- **`export default`** — An array of two `RouteRecordRaw` objects, type-checked via `satisfies RouteRecordRaw[]`.
  - `ApiKeysList` (`/api-keys`) — lazy-loads `./views/ApiKeysList.vue`; requires `auth` access and the `read ApiKey` ability.
  - `ApiKeyCreate` (`/api-keys/create`) — lazy-loads `./views/ApiKeyCreate.vue`; requires `auth` access and the `create ApiKey` ability.
- Both entries use dynamic `import()` so their view components are code-split.

## Relationships

- **`src/modules/api-keys/module.ts`** — Consumes this default export to register the two routes under the app's module registry.
- **`src/modules/api-keys/tests/routes.spec.ts`** — Imports the route array and asserts on paths, names, meta fields, and component resolution.

## Notes

- The `path` values are relative (`api-keys`, `api-keys/create`), not absolute — they are expected to be mounted under a parent prefix by `module.ts`.
- `meta.can` uses the `[verb, resource]` tuple convention (e.g. `['read', 'ApiKey']`); the permission middleware must match on both parts.
- `satisfies` (not `:`) is used so the array retains its literal type for downstream consumers while still being checked against `RouteRecordRaw[]`.
