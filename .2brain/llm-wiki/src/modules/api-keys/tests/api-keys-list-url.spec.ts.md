---
source: src/modules/api-keys/tests/api-keys-list-url.spec.ts
sha256: 256497da21637b46ce8ef5a17d9ab4d14e9f0a3f0d3b3f3e37f45715c17cca85
signature: aea84f06baaf0960af28ad6a924ccc684ffbe00f51f051eb01a929eccb9ee224
generated_at: 2026-11-10T03:50:18.923307+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/tests/api-keys-list-url.spec.ts

## Purpose

Verifies that `ApiKeysList` reads `page` and `pageSize` from the URL query string on initial load and forwards them to the `listApiKeys` API call, so a shared link opens the correct page directly.

## Key elements

- **`vi.mock('@api')`** – Stubs `listApiKeys` to resolve an empty page (`{ items: [], meta: { totalItems: 0 } }`) while preserving the rest of the original module via `importOriginal`.
- **`router`** – A `createMemoryHistory` router wired to the real module route tree (`collectModuleRoutes(enabledModules)`) so in-app links resolve during the test.
- **`beforeEach`** – Clears mocks, installs a fresh Pinia instance, and loads the `'en'` locale.
- **`describe('ApiKeysList URL state')`** – Single test: pushes `/en/api-keys?page=2&pageSize=20`, mounts the component, flushes promises, and asserts `listApiKeys` was called with `{ page: 2, pageSize: 20 }`.

## Relationships

- **`src/modules/api-keys/views/ApiKeysList.vue`** – The component under test; mounted with the router, Vuetify, and i18n plugins.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is invoked at module scope (before tests run) so module routes are registered in the kernel registry, making `collectModuleRoutes` return the full tree.

## Notes

- The test pushes the URL *before* `mount`, exercising the "first read" path (initial `onMounted`/`created` fetch) rather than a reactive re-fetch triggered by navigation.
- The mock spreads the original `@api` exports, so any other API functions the component might call remain functional (they just won't be asserted here).
