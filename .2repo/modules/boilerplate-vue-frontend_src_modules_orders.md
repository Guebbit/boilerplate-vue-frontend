---
tags:
  - 2repo
  - 2repo/module
  - project/boilerplate-vue-frontend
type: module
module: src/modules/orders/
files: 15
updated: 2026-08-30T17:11:03.163963+00:00
---

# src/modules/orders/

## Purpose

The orders module is a self-contained feature that owns the full order lifecycle in the UI: listing and searching orders, viewing a single order's details, editing status and triggering cancel/refund actions, and downloading invoices. It registers itself with the application's module system so that its routes, response-validation schemas, and locale strings are mounted (or removed) as a unit.

## Key parts

- **Module manifest & routing** — `module.ts` assembles the default export (routes, nav entry, response schemas, lazy locale dicts) that the app's module registry consumes; `routes.ts` declares the URL-to-component map and the `meta.access` level each route requires.
- **Data layer** — `store.ts` is the Pinia store wrapping the `@api` order endpoints via the `useStructureCrudApi` primitive, plus two hand-written actions (`cancelOrder`, `downloadInvoice`) for non-record-shaped responses. `schemas.ts` holds the Zod form-validation schemas with locale-aware error messages.
- **Response validation** — `response-schemas.ts` maps every orders REST path to a shared Zod contract, plugged into the `response-schema-map` infrastructure so that API responses are validated at the transport boundary.
- **Views** — `OrdersList.vue` (filterable, paginated list with per-row actions), `Order.vue` (detail page with server-driven action buttons), `OrderEdit.vue` (operator edit form with status transitions and cancel/refund controls).
- **Tests** — Unit specs for the store, route metadata, schema i18n keys, and the cancel action; Cypress E2E specs for list rendering, accessibility sweep, and visual regression. All tests live co-located so deleting the module directory removes its coverage with it.

## How it connects

- **`src/infrastructure/`** — The module *depends on* the infrastructure in several concrete ways: `module.ts` registers the orders module with the shared `AppModule` registry; `response-schemas.ts` plugs into the `response-schema-map` contract; `store.ts` calls the `useStructureCrudApi` primitive and the `@api` client; `routes.ts` entries are mounted under the shared Vue Router that the infrastructure owns. In short, infrastructure provides the plumbing (registry, validation map, CRUD primitive, router) and this module supplies the domain-specific content.
- **`tests/support/`** — The E2E and visual-regression specs (`a11y.cy.ts`, `orders.visual.cy.ts`) delegate their audit/sweep logic to shared helpers (e.g. `sweepA11y`) that live in `tests/support/`, so the module files only declare *which* routes and roles to check rather than reimplementing the comparison or reporting logic.

## Where to start

1. **`store.ts`** — Reading this first gives you the data contract: what the store exposes, how CRUD is delegated to the shared primitive, and how the two special actions (`cancelOrder`, `downloadInvoice`) differ from the generic path.
2. **`views/OrdersList.vue`** — This is the primary user-facing surface. Tracing how it binds the store's pagination, filter, and row actions to the DOM makes the rest of the module (detail page, edit page) feel like natural extensions.

## Connected modules
```mermaid
flowchart LR
    m_src_modules_orders["src/modules/orders/"]
    m_src_infrastructure["src/infrastructure/<br/>27 files"]
    m_tests_support["tests/support/<br/>13 files"]
    m_src_modules_orders --- m_src_infrastructure
    m_src_modules_orders --- m_tests_support
    style m_src_modules_orders stroke-width:3px
```

[[boilerplate-vue-frontend_src_infrastructure|src/infrastructure/]] · [[boilerplate-vue-frontend_tests_support|tests/support/]]

## Files
- `src/modules/orders/module.ts` — Module manifest that registers the **orders** module with the app's module registry (`AppModule`). It assembles the module's routes, a single navigation entry, response schemas, and lazy-loaded locale dictionaries into one default export.
- `src/modules/orders/response-schemas.ts` — Declarative table that maps every orders REST endpoint (method + path regex) to its Zod response schema. It plugs into the `response-schema-map` infrastructure so that API responses are validated against the shared `@api/schemas` contracts. Enabling or deleting the orders module folder toggles this validation on/off automatically.
- `src/modules/orders/routes.ts` — Defines the Vue Router route table for the orders module. Each entry pairs a URL path with a lazy-loaded view component and declares the minimum access level the router guard must enforce. The array is consumed by the module registry to mount these routes under the application's shared router.
- `src/modules/orders/schemas.ts` — Defines Zod validation schemas for the order form, with i18n error messages deferred to parse time so that the active locale is resolved when a value is actually validated, not at module-import time.
- `src/modules/orders/store.ts` — Pinia store for order CRUD, paginated search, and two non-record-shaped actions (`cancelOrder`, `downloadInvoice`). It wraps the raw `@api` order endpoints behind the toolkit's `useStructureCrudApi` primitive so components get a uniform record-cache + list/pagination surface, while the two hand-written actions cover responses that don't fit the record-shaped toolkit (a cancelled-order write-back and a PDF Blob).
- `src/modules/orders/tests/cancel.spec.ts` — Vitest spec that verifies the `cancelOrder` action in the orders store. It mocks `orvalMutator` at the transport layer so tests can assert both the resulting store state (cached record replaced with the cancelled one) and the exact request body sent for each refund-intent variant.
- `src/modules/orders/tests/e2e/a11y.cy.ts` — Cypress E2E accessibility sweep for the orders module. It delegates the actual auditing to the shared `sweepA11y` helper, supplying the specific routes and roles to audit. It lives co-located with the orders module so that removing the module also removes its a11y coverage, preventing a central list from referencing routes the app no longer serves.
- `src/modules/orders/tests/e2e/orders.cy.ts` — Cypress end-to-end spec that exercises the Orders list page in a real browser session. It logs in as an admin, loads `/en/orders`, and asserts that rows render with the expected status text, totals, and action buttons, and that the View action navigates to the order detail route.
- `src/modules/orders/tests/e2e/orders.visual.cy.ts` — Declares which screens in the orders module are captured by the shared visual-regression sweep. The file is a one-line route list; all screenshot, comparison, and reporting logic lives in the imported helper.
- `src/modules/orders/tests/routes.spec.ts` — Vitest spec that asserts every orders route record declares the expected `meta.access` value, and that no route exists outside the known set. It exists because a route that silently loses its `meta.access` is indistinguishable from a public one — no other test would flag it.
- `src/modules/orders/tests/schemas-i18n.spec.ts` — Vitest spec that verifies the orders schemas' i18n message keys actually resolve to the correct Italian strings (not just that a key was looked up). It runs against the real vue-i18n instance with the domain's own locale dictionaries, confirming that every message key the schemas reach for exists in `it.json` and that the Italian copy differs from English.
- `src/modules/orders/tests/store.spec.ts` — Unit tests for the `useOrdersStore` Pinia store. The `@api` client module is mocked at the module level so each test asserts only on the store's own logic: which API function it calls, with what arguments, and how it unwraps (or doesn't unwrap) the response envelope.
- `src/modules/orders/views/Order.vue` — Order detail page (component name `OrderTargetPage`) that renders a single order's information, status, line items, and action buttons for both customer and operator roles. It loads the order by route `id`, ensures the full detail representation (with server-computed `actions`) is fetched even when a summary row already exists in the Pinia cache, and delegates payment and shipment workflows to self-contained module panels.
- `src/modules/orders/views/OrderEdit.vue` — Operator-facing page for editing a single order. Loads the order by route `id`, presents a status + email form, and exposes cancel / refund / cancel-and-refund actions. All available actions and status transitions are driven by flags the server attaches to the loaded record (`actions.transitions`, `actions.cancel`) and by the payment's own refund eligibility, so the UI never offers a call the API would reject.
- `src/modules/orders/views/OrdersList.vue` — The user-facing orders list and search page. It binds a filter form and a paginated `DataTable` to the orders Pinia store, and exposes per-row actions (view, edit, delete, hard-delete) gated by the signed-in user's admin role.

---
[[boilerplate-vue-frontend_INDEX|← boilerplate-vue-frontend index]]
