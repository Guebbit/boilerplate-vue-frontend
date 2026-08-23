# Changelog

All notable changes to this frontend are recorded here. Contract changes arrive from the paired
API (`npm run sync:frontend` over there) and are listed under the release that adopts them.

## [3.0.0] - 2026-08-23

The release that stopped this being a template with a mock layer. `main` forked from the 2.1.0 line
before that release was cut, so everything here is new since 2.1.0.

### The pattern

A domain is a folder under `src/modules/`, declared by one `module.ts` manifest carrying its
routes, navigation entries, response schemas, dependency edges and locales. `src/modules.ts`
enables them; nothing else imports a domain by path. Deleting one is `rm -rf`, one line, and its
docs page.

Each module publishes at most one barrel and publishes exactly what a sibling imports; its
`dependsOn` edges are a typed context map; and it classifies itself `core` / `supporting` /
`generic`, where a `generic` module may not carry a `domain/` folder. Three barrels and four stores
went when the rule was first applied.

Two changes account for most of the rest:

- **The contract is the backend's output.** `openapi.yaml` is copied from the paired API and every
  client type is generated from it.
- **There is no mock layer.** MSW no longer serves the app; `npm run dev` and every e2e script talk
  to the real backend, which the demo profile boots automatically. `test:e2e:live` is the merge
  gate.

### Breaking — behaviour

- **Every response is validated against the contract, in production too.** A malformed 2xx rejects
  instead of rendering as a silently empty list (`VITE_VALIDATE_RESPONSES=false` restores the old
  tolerance).
- **Translation `scope` becomes `tenant`** — `VITE_LOCALE_TENANT` names this build's keyspace, and
  the admin reads the registry from `GET /locales/tenants`.
- **Stock is a reservation model** — `onHand` / `reserved` / `available`, changed through inventory
  receipts and adjustments.
- **The admin dashboard reads readiness**, not guesses: `dependencies` and `telemetry` in place of
  `database` and `integrations`, with `disabled` painted as ok.
- **One emitter per analytics event**, so a name shared with the API is not counted twice.
- **One table and one form idiom** — a generic `CoreDataTableHeader`, and every form reaching the
  toolkit through `useAppForm`.

### Added

- **Accessibility**: a WCAG 2.2 AA pass, plus a harness that can see it — `cy.checkPageA11y()`
  sweeps every route and a spec fails when a route has no sweep.
- **The storefront and customer surface**: products, cart, wishlist, orders, addresses, account
  self-service, facets, cancellation.
- **Admin**: health and metrics overview, paged audit trail, locales admin with a dictionary board
  and runtime overrides, payments/delivery/inventory panels.
- **Realtime**: an admin-gated SSE playground over generated AsyncAPI types.
- **Testing**: mutation testing with a committed baseline, visual regression, property-based tests,
  sharded e2e, and a suite of cross-cutting architecture specs.
- One app-wide promise-based confirmation dialog, folding navigation, session management, and an
  offline notice.

### Breaking — tooling

`npm run lint` fails on warnings; kebab-case is enforced and every spec renamed to it; the
byte-mirrored contract files require the paired backend at the matching commit; `useAsyncAction`
now comes from `@guebbit/vue-toolkit`. The module docs are written by hand — the two rules worth
keeping moved into cross-cutting specs.

## Unreleased

### Fixed

- The wishlist page resolved each saved item's link from the product's TITLE rather than its id, so
  every saved item pointed at `/en/products/Wireless%20Headphones` and the product page answered 404. The visible label and the two `aria-label`s still read the title, which is what they are
  for. `titleOf` falling back to the id is why nothing caught it: until the title resolves,
  `titleOf(id) === id` and the broken link works by accident, so
  `src/modules/wishlist/tests/wishlist-view.spec.ts` seeds a title that differs from the id and
  asserts the href against the app's real route table — a `RouterLink` stub that drops `to` renders
  an anchor with no href and agrees with any location at all.

### Changed

- `openapi.yaml` adopts the API's `422` declarations on the four id-taking operations that were
  missing them. No client type changes — the responses were already reachable, only undeclared.
- `listFeedbackRequests` lost its request-body argument, and `searchFeedbackRequests` is new. The
  API's `GET /feedback` no longer declares a JSON body — a browser cannot send one — so the DTO
  form moved to `POST /feedback/search`. **The removed argument was the FIRST**, so any positional
  `listFeedbackRequests(body)` now passes that body as `params`; the only call site,
  `src/modules/feedback/store.ts`, passes nothing.
- `HardDeleteParamParameter` replaces three inline `hardDelete` booleans, and the three collection
  deletes gained `deleteUserParams` / `deleteProductParams` / `deleteOrderParams`.

### Added

- `POST /feedback/search` registered in `src/modules/feedback/response-schemas.ts` and in the
  hand-written `ROUTES` table of `tests/unit/infrastructure/http/response-schema-map.spec.ts`. A
  contract operation costs a row in **each** — the module map validates the response, the table
  asserts no row is silently covered by a wildcard belonging to another operation.
- The wishlist's functional e2e lives with its module, at
  `src/modules/wishlist/tests/e2e/wishlist.cy.ts`, so deleting the module deletes its coverage —
  it ran from `tests/e2e/specs/storefront.cy.ts` before, where a whole domain's coverage goes to be
  forgotten. It gains a case that FOLLOWS a saved item's link instead of assembling the product URL
  itself: the previous spec reached the product page by an id it looked up from the title, which is
  exactly how a link built from the title survived unnoticed.

[3.0.0]: https://github.com/Guebbit/boilerplate-vue-frontend/releases/tag/v3.0.0
