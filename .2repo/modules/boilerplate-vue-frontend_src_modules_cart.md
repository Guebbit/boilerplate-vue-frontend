---
tags:
  - 2repo
  - 2repo/module
  - project/boilerplate-vue-frontend
type: module
module: src/modules/cart/
files: 21
updated: 2026-09-03T10:58:07.198387+00:00
---

# src/modules/cart/

## Purpose

This module owns the authenticated user's shopping cart end-to-end: the Pinia store that holds cart state, the `Cart.vue` page the visitor interacts with, pure domain rules for quantity stepping and checkout-error classification, and the routing/registration glue that plugs the cart into the application shell.

## Key parts

- **Domain layer** (`domain/`) — Pure, framework-free rules. `quantity.ts` enforces the minimum-quantity floor and step arithmetic; `checkout-errors.ts` classifies a raw checkout rejection into a small typed verdict. `index.ts` re-exports both so consumers never reference internal files directly.
- **Store** (`store.ts`) — Pinia setup store that owns all cart mutations (add, update, remove, clear, checkout, reorder). Every action replaces the local `cart` ref wholesale with the API response; derived getters read from that single source of truth.
- **View & composable** — `views/Cart.vue` renders line items, quantity steppers, and the sticky order summary, and drives the checkout flow with targeted UI for each refusal shape. `composables/use-line-quantity.ts` layers a debounced local stepper over the store so rapid clicks collapse into one trailing API call per line.
- **Module wiring** — `module.ts` is the manifest the app registry reads to mount routes, the nav badge, response schemas, and i18n. `routes.ts` declares the single authenticated route. `response-schemas.ts` maps HTTP method + URL patterns to Zod validation schemas. `index.ts` is the barrel that exposes the module's public API.
- **Tests** — Unit specs for the store, domain functions, composable debounce, product-title resolution, and route access metadata. Integration specs mount `Cart.vue` against a real router. Cypress E2E suites cover the full cart workflow, visual regression, a11y, and a cross-repo analytics (Umami) double-count guard.

## How it connects

- **`src/infrastructure/`** — The app registry (`AppModule`) that consumes the cart's `module.ts` manifest to mount its route, navigation entry, and i18n dictionaries. The HTTP layer in infrastructure looks up the cart's `response-schemas.ts` table to validate responses before they reach the store. Shared route-collection helpers (e.g. `collectModuleRoutes`) used by the cart's integration specs also live here.
- **`tests/support/`** — Provides shared test utilities (router construction, mock server helpers, etc.) that the cart's Vitest and Cypress specs import to mount components and drive E2E flows.
- **`tests/unit/`** — Houses cross-module unit-test infrastructure and conventions that the cart's co-located specs follow (e.g. the "every module must ship an a11y spec" cross-cutting assertion).

## Where to start

1. **`store.ts`** — Read this first to understand the single source of truth, the replace-on-response invariant, and the full set of mutating actions the rest of the module calls.
2. **`views/Cart.vue`** — Then read the page component to see how the store, the `useLineQuantity` composable, and the `classifyCheckoutError` domain function are composed into the user-facing cart experience.

## Connected modules
```mermaid
flowchart LR
    m_src_modules_cart["src/modules/cart/"]
    m_src_infrastructure["src/infrastructure/<br/>21 files"]
    m_tests_support["tests/support/<br/>13 files"]
    m_tests_unit["tests/unit/<br/>38 files"]
    m_src_modules_cart --- m_src_infrastructure
    m_src_modules_cart --- m_tests_support
    m_src_modules_cart --- m_tests_unit
    style m_src_modules_cart stroke-width:3px
```

[[boilerplate-vue-frontend_src_infrastructure|src/infrastructure/]] · [[boilerplate-vue-frontend_tests_support|tests/support/]] · [[boilerplate-vue-frontend_tests_unit|tests/unit/]]

## Files
- `src/modules/cart/composables/use-line-quantity.ts` — Provides a composable that debounces per-product cart quantity stepper clicks into a single trailing API call per line, while a local `pending` map keeps the UI responsive to the visitor's own clicks without waiting for the round trip. It replaces the previous pattern of firing one `updateCartItem` call per click, which caused out-of-order responses under slow connections.
- `src/modules/cart/domain/checkout-errors.ts` — Pure classifier that maps a raw checkout rejection (the value thrown by `cartStore.checkout()`) into a small, typed verdict the view layer can render from. It intentionally produces no user-facing copy — only structural data (e.g. the shortfall lines) — leaving messaging and side-effects entirely to the view.
- `src/modules/cart/domain/index.ts` — Barrel (re-export) file for the cart domain layer. It serves as the single public entry point so consumers can import cart domain rules without knowing the internal file layout, while keeping the domain layer's "pure rules" boundary explicit.
- `src/modules/cart/domain/quantity.ts` — Defines the quantity rules for a single cart line. It is a pure domain module (no Vue, no store) that enforces the minimum-quantity floor and handles the step operation. It exists so that the invariant "a line never reaches zero by stepping" lives in one place and is testable without UI or state dependencies.
- `src/modules/cart/index.ts` — Barrel (re-export) file for the cart module. It exposes the module's public API as a single import surface so that sibling modules never reach into cart's internal files directly.
- `src/modules/cart/module.ts` — Module manifest for the cart/checkout domain. Declares the module's routes, a pinned navigation entry (with a live badge and currency total), response schemas, and locale loaders, and hands the bundle to the app registry (`AppModule`). This is the single object the shell reads to wire the cart into the navigation bar and to resolve its i18n dictionaries.
- `src/modules/cart/response-schemas.ts` — Declares the runtime contract-validation table for the cart domain: a flat array mapping each HTTP method + URL pattern to a Zod (or similar) response schema. The HTTP layer looks up a response against this table to validate it before handing it to the caller.
- `src/modules/cart/routes.ts` — Declares the route table for the cart module. It exports a single authenticated route record that the app router mounts under the module's registered path, separating routing concerns from the module's service/store logic.
- `src/modules/cart/store.ts` — Pinia setup store that owns the authenticated user's shopping cart. Every mutating action (add, update, remove, clear, checkout, reorder) replaces the local `cart` ref wholesale with the API's response rather than patching state locally. All derived getters (`cartItems`, badge fields, etc.) read from that single source of truth.
- `src/modules/cart/tests/cart-view.spec.ts` — Vitest integration spec that mounts the real `Cart.vue` against a real memory-history router (built from `collectModuleRoutes(enabledModules)`) and verifies that each of the four documented checkout refusals produces a distinct, specific UI response rather than collapsing into one generic toast. It is the component-level counterpart to the domain-layer tests in `docs/modules/cart-checkout.md`.
- `src/modules/cart/tests/checkout-errors.spec.ts` — Unit tests for `classifyCheckoutError`, a pure decision function in the cart domain. Given a rejection value (any shape that might cross a wire boundary), it asserts the returned "verdict" object. No DOM, no Pinia, no HTTP—just input → output. The companion `cart-view.spec.ts` proves the view reacts correctly to each verdict; this file proves the verdict itself is correct, including malformed or absent `errors` payloads.
- `src/modules/cart/tests/e2e/a11y.cy.ts` — Co-located accessibility (a11y) test for the cart module's routes. It exists in this module's directory so that deleting the cart module automatically removes its a11y coverage, preventing a stale central route list. A cross-cutting spec asserts every routed module has one of these files.
- `src/modules/cart/tests/e2e/analytics.cy.ts` — End-to-end Cypress spec that verifies a single add-to-cart action produces exactly **one** `cart_item_added` row in Umami, guarding against a double-count bug where both the frontend cart store and the backend `POST /cart/items` handler emit the same-named event. It also asserts that a mere page visit writes no server-owned events. The spec queries Umami's API directly (not the app under test) to count rows, because the bug was invisible from either repo's own unit suite.
- `src/modules/cart/tests/e2e/cart.cy.ts` — Cypress E2E test suite for the cart page. It verifies the full user-visible behaviour of the cart: empty-state rendering, item listing, quantity increment/decrement, item removal, cart clearing, and checkout redirect to the orders list.
- `src/modules/cart/tests/e2e/cart.visual.cy.ts` — Visual regression test for the cart screen. It registers the cart page into a shared visual sweep so that a screenshot baseline is captured and compared on CI, catching unintended UI changes without requiring a dedicated test harness per screen.
- `src/modules/cart/tests/product-titles.spec.ts` — Vitest spec for the cart store's product-title resolution. The cart and wishlist APIs return lines as bare product IDs; this file verifies that `useCartStore` maps those IDs to display titles with two guarantees: an unknown ID falls back to the ID string itself (never blank), and a single failed lookup does not corrupt the remaining results.
- `src/modules/cart/tests/quantity.spec.ts` — Unit tests for the `steppedQuantity` cart-domain function. It verifies the arithmetic and floor-clamping behavior of the quantity stepper as a pure function (no component mount, no Pinia, no HTTP), ensuring the guard holds even when a double-click outruns the `disabled` attribute on `Cart.vue`.
- `src/modules/cart/tests/routes.spec.ts` — Guarantees that every cart route declares its access requirement (`meta.access`) and that no route exists outside this file's explicit list. Without this spec, a route that silently loses its `meta.access` would remain indistinguishable from a public route—still rendering, still passing every other test—while simply becoming open to everyone.
- `src/modules/cart/tests/store.spec.ts` — Vitest unit-test suite for the Pinia cart store. It locks down three invariants the store is designed around: every mutating action replaces the local cart with the API's response (not a patch), `fetchSummary` treats only a 401 as "no cart" while letting other failures propagate, and `checkout` must let both API rejections and network-level errors reach the caller unmodified.
- `src/modules/cart/tests/use-line-quantity.spec.ts` — Test suite for the `useLineQuantity` composable's debounce behavior. Every assertion is written against the specific race it fixes (last-response-wins cart overwrite) rather than against debounce mechanics in the abstract, so the tests document *why* the debounce exists, not just *that* it exists.
- `src/modules/cart/views/Cart.vue` — The cart page component. Renders the current cart's line items (with quantity steppers) and a sticky order summary, and drives the checkout flow. It layers a debounced local stepper on top of the store's quantity update so rapid clicks collapse into one request per line, and handles the four distinct checkout-refusal shapes with targeted UI (inline shortfall list, stale-cart refetch, generic toast).

---
[[boilerplate-vue-frontend_INDEX|← boilerplate-vue-frontend index]]
