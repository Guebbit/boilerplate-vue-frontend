---
source: src/modules/api-keys/routes.ts
sha256: fa03a84a912b43e0d9472819f520d1f009d57ff5d7ebccae093a15625f0ce756
signature: fa03a84a912b43e0d9472819f520d1f009d57ff5d7ebccae093a15625f0ce756
generated_at: 2026-11-10T03:49:41.515179+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/routes.ts

## Purpose

Declares the route table for the api-keys module: a list screen and a create screen. There is no edit or detail route because API-key fields (name, permissions, expiry) are fixed at mint time.

## Key elements

- **default export** — an array of two `RouteRecordRaw` objects (type-checked via `satisfies`), to be consumed by the module registry.
  - `ApiKeysList` (`/api-keys`) — lazy-loads `./views/ApiKeysList.vue`; requires `auth` + `read ApiKey`.
  - `ApiKeyCreate` (`/api-keys/create`) — lazy-loads `./views/ApiKeyCreate.vue`; requires `auth` + `create ApiKey`.

## Relationships

- **`src/modules/api-keys/module.ts`** — the module definition that imports this default export and registers the routes under the app's module registry.
- **`src/modules/api-keys/tests/routes.spec.ts`** — unit tests that assert the shape, paths, names, and meta of the two route records.

## Notes

- Route ordering matters: `api-keys/create` is declared after `api-keys` so the static path does not shadow the parametric-style sibling (Vue Router v4 matches by specificity, but keeping the more specific path first is a common defensive pattern here).
- `meta.access: 'auth'` and `meta.can` are the app's global guards; adding a new permission string here without a corresponding backend check will silently pass.
- Titles are i18n keys (`api-keys-list-page.page-title`, `api-key-create-page.page-title`), not literal strings.
