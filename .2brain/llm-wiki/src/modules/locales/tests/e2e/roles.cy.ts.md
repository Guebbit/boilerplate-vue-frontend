---
source: src/modules/locales/tests/e2e/roles.cy.ts
sha256: 6e42c388b909b40b39f7423b4b750d3aceba1b6d4ace78da4dd385cf43714384
signature: 6e42c388b909b40b39f7423b4b750d3aceba1b6d4ace78da4dd385cf43714384
generated_at: 2026-11-10T04:43:06.810506+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/tests/e2e/roles.cy.ts

## Purpose

Declares the role-sweep case list for the locales module. It tells the shared `sweepRoles` helper which routes to visit, what permission each route requires, and which DOM root to assert on. The file is deliberately co-located inside the locales module so that deleting the module removes its access-control tests automatically.

## Key elements

- **`sweepRoles('locales', [...])`** — the sole statement in the file; passes the module identifier and an array of four route descriptors to the shared helper.
- **Route descriptors** (one per page tested):
  - `languages` — `/en/locales`, requires `['update', 'Locale']`, includes a `menuHref` for nav-link assertion.
  - `dictionary` — `/en/locales/dictionary`, requires `['update', 'Locale']`.
  - `entries of a language` — `/en/locales/en`, requires `['update', 'Locale']`.
  - `entity translations` — dynamic route resolved via `cy.subjectId('product.rich')`, requires `['read', 'Translation']`.
- Each descriptor carries a `pageRoot` CSS selector (e.g. `#locales-list-page`) that the helper uses to verify the correct page rendered.

## Relationships

- **`tests/support/e2e/role-sweep.ts`** — provides the `sweepRoles` function imported and invoked here. This file supplies the data (routes, permissions, selectors); the helper owns the navigation, assertion, and persona-walking logic.

## Notes

- The `route` field is normally a string, but the *entity translations* entry is a **function** returning a string after an async `cy.subjectId` lookup — the helper must handle both shapes.
- The `can` array encodes a permission pair (`[action, Resource]`). The entity-translations route uses `['read', 'Translation']` rather than `['update', 'Locale']`, reflecting that translating entities is a different resource than editing locale metadata.
- `menuHref` is optional; it appears only on the `languages` entry and is presumably used to verify the nav menu link resolves correctly.
