---
source: tests/e2e/specs/journeys/op13-each-role-sees-what-it-may.cy.ts
sha256: f15d9fb9a11b8b5d2cff01dbc830202d1165cb09d6c7dcac8a2e430fc49259f4
generated_at: 2026-10-17T02:19:04.635549+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op13-each-role-sees-what-it-may.cy.ts

## Purpose

E2E smoke test that walks the four application roles (guest, editor, moderator, customer) through the same set of pages and asserts each is permitted or denied exactly as the backend `shared/authorization-roles.yaml` specifies. It verifies menu visibility, page-level access, and row-level data (e.g. an editor sees zero orders, a moderator sees all) in a single linear test.

## Key elements

- **`adminMenuLinks()`** — Clicks the admin menu, collects all `href` values from the menu links, closes the menu with `Escape`, and returns them as a `Cypress.Chainable<string[]>`. Used to assert which sections appear for a given role.
- **`isTurnedBack(path)`** — Visits a disallowed URL and asserts the router redirected to `/en` (Home), the `#home-page` element exists, and a `.v-alert` notice is rendered.
- **`ordersShown(path?)`** — Intercepts the `POST **/orders/search` request, visits the given orders list (defaults to `/en/orders`), waits for the response, and returns the count of `[data-test=list-row]` elements.
- **`describe('OP13 …')` / single `it`** — One long test that sequentially exercises guest → editor → moderator → customer, using `cy.step()` for readable segments.

## Relationships

No graph-neighbour files are linked in the dependency graph. The test implicitly depends on backend modules listed in the `requires-module` header comment (`account`, `locales`, `observability`, `orders`, `products`, `users`) and on the fixture API exposed via `cy.subjectId(...)`.

## Notes

- **Single monolithic `it`**: all four roles are covered in one test rather than four separate ones; a failure at any step aborts the remaining role assertions.
- **`cy.restore()` in `beforeEach`**: snapshots are taken on the first `/en` visit and restored before re-visiting, keeping the test idempotent against seed data.
- **`cy.switchUser()`** is used between editor → moderator → customer to change the active session without a full page reload; the initial guest state is the pre-login condition.
- **Locale is hard-coded to `/en`** in every path; the test does not iterate locales.
- **Tagged `@smoke`** — included in the quick regression run.
- The editor's `ordersShown()` assertion expects exactly `0` rows, which relies on the fixture providing no orders owned by the editor account.
- `adminMenuLinks()` closes the menu with `{esc}` before yielding; callers must not expect the menu to remain open afterward.
