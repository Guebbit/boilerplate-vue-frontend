---
source: src/modules/api-keys/routes.ts
sha256: b319fd1aaabc8ac656ecdc55f182b1181f734264e16fb5b3bc9a36dcc3799f62
generated_at: 2026-10-02T12:40:55.826610+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/routes.ts

## Purpose

Defines the two route records (list + create) for the api-keys module and exports them as a typed array consumed by the app's module registry. There is intentionally no edit/detail route: all key fields (name, permissions, expiry) are immutable after minting, so a list row is sufficient.

## Key elements

- **`default` (exported array)** — Two `RouteRecordRaw` objects:
  - `ApiKeysList` (`/api-keys`) — lazy-loads `ApiKeysList.vue`; requires `auth` access and `read ApiKey` permission.
  - `ApiKeyCreate` (`/api-keys/create`) — lazy-loads `ApiKeyCreate.vue`; requires `auth` access and `create ApiKey` permission.
- **`satisfies RouteRecordRaw[]`** — Asserts the array shape at compile time while preserving the literal type for downstream consumers.

## Relationships

- **`src/modules/api-keys/module.ts`** — Imports this array (the default export) and registers the routes under the app's module system.
- **`src/modules/api-keys/tests/routes.spec.ts`** — Unit-tests the route table (paths, names, meta, lazy component paths).

## Notes

- Route `meta.access: 'auth'` and `meta.can` are enforced by the app-level navigation guard; they are not validated here.
- `title` values are i18n keys (`.page-title` suffix), not literal strings.
- The `create` path is a nested child of `api-keys` (`api-keys/create`), not a separate top-level segment.
