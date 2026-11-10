---
source: src/modules/api-keys/tests/e2e/roles.cy.ts
sha256: 31f7139c6addc7e751e3aa881317864f4fe986f6668eaef691e5e064092f87db
signature: 31f7139c6addc7e751e3aa881317864f4fe986f6668eaef691e5e064092f87db
generated_at: 2026-11-10T03:51:02.818164+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/tests/e2e/roles.cy.ts

## Purpose

End-to-end test case list for the API-keys module. It registers which pages and routes each persona should be allowed to open, delegating the actual page-walking and permission-assertion logic to the shared `sweepRoles` helper. Lives inside the module so that removing the module removes its sweep test automatically.

## Key elements

- **`sweepRoles` call** — the sole statement; passes `'api-keys'` as the module label and an array of two route descriptors:
  - **`keys`** — the list page (`/en/api-keys`); permission tuple `['read', 'ApiKey']`; includes `menuHref` (navigation entry) and `pageRoot` (`#api-keys-list-page`).
  - **`key create`** — the create form (`/en/api-keys/create`); permission tuple `['create', 'ApiKey']`; `pageRoot` (`#api-key-create-page`).
- No exports; the file is a side-effect-only script (marked `@module` in the JSDoc header).

## Relationships

- **`tests/support/e2e/role-sweep.ts`** — provides the `sweepRoles` function that this file calls. All page-navigation, button-clicking, and permission-assertion logic lives in that helper; this file only supplies the route/permission data.

## Notes

- The `can` array is a `[action, resource]` tuple (e.g. `['read', 'ApiKey']`). The sweep helper interprets it to decide whether a persona may interact with the page.
- `menuHref` is optional; its presence on `keys` means the sweep will also verify the navigation menu link is visible/hidden per persona. Absent on `key create` because that route is not a top-level menu item.
- Adding a new API-keys page or permission means adding one more object to the array here—no other test file changes are required.
