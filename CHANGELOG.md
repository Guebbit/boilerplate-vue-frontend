# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **The profile is a real account page: password change, sessions, the address book and email
  verification.** The save finally goes through `PUT /account` — routing self-service through the
  admin `/users/{id}` write was the 403 every non-admin got — and two real bugs came out with the
  rework: the page never fetched the profile on a hard reload (the form mounted empty and the
  first save failed validation on fields the visitor never touched), and the record arriving
  mid-typing CLOBBERED keystrokes — the form now hydrates only while pristine and re-baselines
  after a save. Password change proves the current password (a wrong one is a 422 toast, not a
  logout); the sessions panel lists every device with the current one flagged, revokes them one
  by one, and keeps "log out everywhere" for the day a credential leaks — plain logout now ends
  ONLY this session. The verification banner reads `verified` off the record, re-sends the link,
  and `verify-email/confirm` spends it; an email change brings the banner back, because the old
  confirmation vouched for the old address.

- **The storefront sells now: add-to-cart, stock, facet chips, wishlist, cancel and buy-again.**
  The product page gets the demo's first add-to-cart button (no view had one — the cart could
  only be filled by seed), a shelf count with an out-of-stock state the seeded `stock: 0` product
  exercises, and a heart backed by the new wishlist module — module number eight, one folder plus
  one registry line, `products → wishlist → cart → orders` kept a line rather than a loop (which
  meant dropping the cart's stale `dependsOn: ['orders']`, an import the checkout move had
  already removed). The listing grows category/tag chips fed by `GET /products/categories`,
  counts public-scope only. The order page gets the customer cancel (pending only, gate read off
  the status) and buy-again via `POST /cart/reorder`. The MSW handlers mirror the API's
  invariants — the stock gate refuses with `CART_INSUFFICIENT_STOCK`, cancel restores the shelf,
  reorder skips vanished products — so the mock profile demos the same failures the live one
  would.

- **The contact form has a page, the inbox has an admin, and the shop has prose.** A ninth
  module, `feedback`, finally claims the endpoints the BE has served all along: a public
  `/contact` form and an admin `/feedback` inbox that moves tickets through their statuses. Its
  mock inbox starts EMPTY on purpose — the BE seeds no tickets, so the form itself is the
  fixture, and the e2e walks a message from submission to the inbox through the app's own
  navigation. Four static pages (`/about`, `/faq`, `/terms`, `/privacy`) share one `StaticPage`
  component whose copy lives entirely in the dictionaries — a project built on this boilerplate
  rewrites locale files, not components — cross-linked so the single About nav entry reaches all
  four. The parked response-schema rows moved into the modules that now own them, exactly as the
  bottom-shelf comment always prescribed.

- **`docs/theory/module-lifecycle.md` — adding and removing a domain as a procedure, not a
  measurement.** `modules.md` said what a domain costs and proved it; it never said what to type.
  The new page is the ordered procedure in both directions, and it leads with the two things this
  side gets wrong: the mock ternaries must stay written out inline or a production build ships MSW
  and faker, and **a route name is a string** — the failure class that is invisible to `vue-tsc`, to
  lint and to a green suite, and that `hasRoute()` is the only discipline against. It also states
  why a red parity table after a deletion is the gate working rather than a bug. It stays a written
  procedure rather than becoming a test on purpose, and the page says why: the failure classes worth
  catching — a route addressed by name, a canary pinned to the module count, a mechanism spec using
  a domain as sample data — are each invisible to a sweep. `modules.md` keeps the reasoning and the
  four lessons, points here, and carries the standing reminder to run the exercise after any
  significant change.

### Changed

- **`tests/unit/modules/cartQuantity.spec.ts` → `src/modules/cart/tests/quantity.spec.ts`,** which
  is where every other module's specs already live and the only reason `rm -rf src/modules/cart`
  takes its tests with it — it was the last spec left outside its module, and
  `tests/unit/modules/` is gone with it. Its `canDecrement` block went too: that rule moved back
  into `Cart.vue` as `:disabled="item.quantity <= MIN_LINE_QUANTITY"` and the spec had not caught
  up. The floor is still asserted, through the clamp that has to hold when a double click outruns
  the disabled guard.

### Changed

- **The contract grew from 56 to 74 operations, and this repo now validates every one of them.**
  The backend's customer-surface release landed: account self-service (`PUT /account`, password
  change, single-session logout, sessions, email verification with `verified` on the `User`), the
  address book (`/account/addresses`, plus `Order.shippingAddress` and `addressId` on checkout),
  the wishlist resource, order cancel and cart reorder, `stock` on the `Product` (with
  `CART_INSUFFICIENT_STOCK` as a new checkout refusal), and the catalogue facets
  (`GET /products/categories`). `openapi.yaml`, the seed identities (products now carry `stock`,
  `categories` and `tags`; two users carry a seeded wishlist) and the analytics events are the
  backend's fresh copies; orval regenerated the client, the Zod schemas and the MSW mocks; and
  every new operation has its row in the response-schema map — the account, cart, orders and
  products modules own theirs, while the four `/wishlist*` rows sit with the core `/feedback*`
  rows until the module that claims them exists. The UI for all of this is the next step; this
  entry is the contract landing first, which is the order the two repos always move in.

### Removed

- **The three `.dev/` API client collections, and their spec-identity entries — the gate is 8
  files now, not 11.** Nothing in this repo ever read them: mocking is MSW, the API layer is
  orval, and no script or doc named them. Their identity entries defended against hand-written
  restatements of the contract forking — but the backend generates them from `openapi.yaml` now
  and pins them to a fresh generation in its own suite, and `openapi.yaml` itself stays
  identity-checked, so a copy here could never disagree without the spec disagreeing first. The
  collections keep living where they are produced — at the backend's repo root, as
  `contract.bruno.yml`, `contract.insomnia.json` and `contract.mockoon.json`.

## [2.0.0] - 2026-08-13

The modular release, and the first one cut — the counterpart of the API repo's 2.0.0, released
together. Everything below is a single arc told in waves — separated by `---`, newest first, each
with its own preamble: a views-and-stores layout became self-registering modules over a tiered
substrate (`infrastructure`, `ui`, `kernel`, `app`); the shared contract files
became backend output verified byte-identical by the spec-identity gate; and the router, the
navigation and the access rules read one registry instead of naming domains. A wave's "Known
issues" records what was true when that wave closed; later waves above it document the fixes.

### ⚠ Breaking

- **Modules may now carry a `domain/` folder: pure rules, lint-guaranteed framework-free.** Nothing
  in `src/modules/*/domain/**` may import vue, pinia, axios, vue-router, vue-i18n, any tier alias, a
  sibling module, or its own module's outer files. `cart/domain/quantity.ts` is the first and
  currently only one: `MIN_LINE_QUANTITY` and `steppedQuantity` replace two inline `quantity ± 1`
  expressions inside `views/Cart.vue` — one rule written twice in a template, testable only by
  mounting a component. Behaviour is unchanged; the step is now clamped rather than merely guarded,
  so a double click cannot send `quantity: 0`.

    The folder has a **floor**, so it does not collect one-liners: a rule earns a place only with
    more than one caller or a non-obvious failure mode. `steppedQuantity` clears it on the second
    count (the clamp catches the double click); `canDecrement` did not, and is back in the template
    as `:disabled="item.quantity <= MIN_LINE_QUANTITY"`.

    **On a frontend this layer is thin by design.** Prices, totals and eligibility are decided by the
    API, and restating them here would be two implementations of one rule — the drift
    `scripts/specIdentity.ts` exists to catch. See `docs/theory/domain-layer.md`, and
    `DDD_EXPLORATION.md` for the full-tactical transformation of both repos, costed and not
    implemented.

- **Two tiers were renamed: `src/core` → `src/infrastructure`, `src/platform` → `src/kernel`**,
  matching the API repo commit for commit. Imports follow: `@/core/*` → `@/infrastructure/*`,
  `@/platform/*` → `@/kernel/*`. The dependency rule is unchanged — same tiers, same arrows, same
  per-tier lint blocks — only the two names that carried the wrong meaning.

    `core` is not an unusual name, it is an **overloaded** one: Nest and Angular use it for the DI
    container, Spring and Backstage for the substrate. This repo used it for the substrate, and
    `docs/theory/modules.md` had to carry a standing disclaimer saying so. A novel name makes a reader
    look it up; an overloaded one makes them think they already know, and that failure is silent.
    `platform` moved because in current usage the word means the base layer everything runs on — which
    is this repo's `infrastructure` — so the two old names read as pointing at each other's contents.
    `kernel` names what the folder is: a microkernel hosting plugins it has never heard of.

- **`src/kernel` is now a single file, `registry.ts`.** The three that failed the tier's own test
  moved with the rename: `FormCounterInput.vue` and `AppLanguageSwitcher.vue` to `ui/molecules/`,
  and `counter.ts` to `app/` (it is Pinia demo scaffolding for the Playground, not shared state).
  `docs/theory/modules.md` had listed all three as misplaced; this closes that note. Their specs
  moved too: `tests/unit/platform/` is gone, `tests/unit/core/` is now `tests/unit/infrastructure/`.

- **`src/` is organised into four tiers: `core`, `ui`, `platform`, `modules`.** What a file is
  allowed to know is now a property of where it lives, and dependencies point one way.

    | was                                                                                 | is                                     |
    | ----------------------------------------------------------------------------------- | -------------------------------------- |
    | `src/utils/*`                                                                       | `src/infrastructure/*`                 |
    | `src/plugins/http/*`                                                                | `src/infrastructure/http/*`            |
    | `src/composables/useAsyncAction.ts`                                                 | `src/infrastructure/useAsyncAction.ts` |
    | `src/stores/{observability,analyticsEvents,profile}.ts`                             | `src/infrastructure/*`                 |
    | `src/plugins/vuetify/*`                                                             | `src/ui/vuetify/*`                     |
    | `src/components/{molecules,organisms}/*`                                            | `src/ui/{molecules,organisms}/*`       |
    | `src/router/*`, `src/middlewares/*`, `src/layouts/*`, `src/views/*`                 | `src/kernel/*`                         |
    | `AppNavigation`, `AppLanguageSwitcher`, `FormCounterInput`, `src/stores/counter.ts` | `src/kernel/`                          |
    | `FeedbackMessageFeed`, `src/stores/realtimeObservability.ts`                        | `src/features/realtime/`               |

    `src/plugins/vuetify` is the theme and the icon set, so it lands in `ui` rather than `core`
    alongside the components that read its tokens: restyling the app is one folder. `profile.ts`
    lands in `core` rather than `platform` because `core/http` reads the access token from it in
    three places, and a tier that has to import upward on day one is not a tier. The session and the
    user's data are the two halves of that store; splitting them is what puts the second half in a
    module.

    `eslint.config.ts` enforces the order with one `no-restricted-imports` block per tier, verified
    against 18 probe imports. Two allowances are deliberate: `platform` may read `@/modules` (the
    registry list) but never `@/modules/<name>`, and may splice `@/features/<name>/routes` — and
    nothing else from a feature — until the last domain becomes a module.

- **Products and cart are modules; `@/features/products` and `@/features/cart` are now
  `@/modules/products` and `@/modules/cart`.** Each owns its routes, store, schemas and views, and
  exposes one barrel — `index.ts`. Lint rejects an import of another module's internals. A module
  declares itself in `module.ts` and is enabled by one line in `src/modules.ts`; the router
  no longer imports either domain by name.

- **`VITE_APP_DEBUG_ROUTER` and `VITE_APP_DEBUG_HTTP` are replaced by `VITE_APP_LOG_LEVEL` and
  `VITE_APP_LOG_SCOPES`.** A boolean per feature does not scale — each new noisy area cost a
  variable, a README row and its own copy of `import.meta.env.DEV && … === 'true'` — and between
  them the two flags governed 2 of the app's 22 `console` calls. To restore the old behaviour set
  `VITE_APP_LOG_SCOPES=router` or `=http`.

- **`no-console` is an error**, not a warning, with its only exemptions inside `src/infrastructure/logger.ts`.
  That removes 19 `eslint-disable` comments from 7 files.

- **The three access guards `isAuth`, `isAdmin` and `isGuest` are gone.** A route declares
  `meta: { access: 'guest' | 'auth' | 'admin' }` (absent means public) and one global
  `enforceRouteAccess` applies it. `canAccess(access, visitor)` is the single expression of the rule,
  which `AppNavigation` also calls — the menu and the router can no longer disagree.

    `meta.access` is type-checked through a `vue-router` module augmentation, so a typo is a compile
    error. A _missing_ `beforeEnter` never was, which is the failure that matters.

- **`translate` takes an optional second argument** for interpolation values, so it covers every
  key lookup outside a component scope. `TranslateFunction` widened to match.

### Added

- **`src/kernel/registry.ts` — the module registry.** `src/modules.ts` lists the enabled modules;
  the registry validates them while the router is assembled. A duplicate name, a dependency that is
  not enabled, or a dependency cycle throws with the offending path named, instead of surfacing as
  a blank page on whichever navigation first crosses the gap. Adding a domain is one folder plus one
  line; removing one is `rm -rf` plus deleting that line.

    Mirrors the backend registry on the idea and on the field names — `name`, `routes`, `dependsOn`
    — while staying idiomatic: no `basePath`, because a vue-router record carries its own path, and
    no event bus, because nothing here has the mutual dependency the backend's cart and catalogue
    have.

- **Module boundaries are linted per module,** from a list `eslint.config.ts` reads out of
  `src/modules/` rather than one written by hand — so adding a domain does not edit the lint config
  either.

- **Adopted `@guebbit/vue-toolkit@3.0.0` and `@guebbit/js-toolkit@2.1.0`**, both of which gained
  what this repo had been re-deriving per feature.

    - The three list stores are declared rather than wired: `useStructureCrudApi` takes the
      endpoints once and derives dictionary, filters, pagination, caching, optimistic updates and
      rollback. `products` 242 → 166 lines, `users` 220 → 142, `orders` 222 → 179 — most of what
      remains is the endpoint declarations and the comments explaining the non-default cache
      settings, rather than wiring. Each
      destructures the composable and renames as it goes (`selectedRecord: currentProduct`,
      `watchList: watchSearchProducts`), so a store exposes exactly one name per thing and the
      views read as they always did.
    - `products` sets `TTL: 5 * 60 * 1000` and `orders` sets `maxRecords: 5000`, the first
      non-default cache configuration in this repo. Products are read by visitors while admins
      edit them, so an hour of staleness is too long; orders are the store that actually grows,
      and their records carry embedded line items.
    - All eight forms share one submit flow. `useStructureFormValidation` now owns
      `showFormErrors` and reveals errors, waits for the render and focuses the first invalid
      field itself; `applyServerErrors` puts a rejection's errors under the field the server
      named. `focusFirstErrorField` is gone, replaced by the single
      `VUETIFY_INVALID_FIELD_SELECTOR` constant every form passes as `invalidFieldSelector`.
    - `utils/formatters.ts` and `utils/uploads.ts` are now thin bindings over `js-toolkit`,
      supplying this app's locale, empty glyph and upload limits and nothing else. Upload progress
      is the toolkit's state machine plus one axios adapter line.

    ⚠️ **Both toolkits are local `file:` dependencies while they are unpublished.** Before
    releasing, swap them for real ranges:

    ```json
    "@guebbit/js-toolkit": "^2.1.0",
    "@guebbit/vue-toolkit": "^3.0.0"
    ```

    While they stay local, a source change in either needs `npm run build` there and
    `rm -rf node_modules/.vite` here — Vite keys its dependency cache off the lockfile, not
    package contents. The `resolve.dedupe`, `optimizeDeps.exclude` and `tsconfig` `paths` entries
    exist for the same reason and are documented where they sit.

- **`src/composables/useAsyncAction.ts`** — loading/data/error state for a one-shot call, with a
  last-call-wins guard so a slow response cannot overwrite a newer one. `useAdminObservability`
  was writing that block once per endpoint; now it declares three.

    Deliberately **not** in `@guebbit/vue-toolkit`: the toolkit's composables are about records —
    identified, cached, mutated — and this is a call whose answer is just a payload. Same call as
    the route-access guards and the i18n layer, both of which also stay here: a boilerplate is
    meant to be copied, and generalizing them would cost more configuration than the code they
    save.

- **`src/utils/logger.ts`** — the only module allowed to touch `console`, governed by two axes that
  mirror the API's model:

    - `VITE_APP_LOG_LEVEL` — `error` | `warn` | `info` | `debug`, the same ladder and names as
      `NODE_LOG_LEVEL`. Defaults to `debug` in development, `warn` in production.
    - `VITE_APP_LOG_SCOPES` — which areas emit `debug`/`info`: comma-separated, or `*`. Empty
      means none, so a per-navigation or per-request trace stays opt-in.

    Severity and volume are different questions — a trace on every navigation is noisy without being
    low-severity — which is why a level alone cannot replace the per-area switch. `warn` and `error`
    are never scope-filtered.

    `error` still reaches the console in production on purpose: Faro's `getWebInstrumentations()`
    captures console errors and ships them, so the logger needs no dependency on the observability
    store, and a failure during bootstrap still leaves a trace.

- **`src/stores/analyticsEvents.ts`** — the analytics event names shared with the backend,
  byte-identical with its `src/infrastructure/observability/analytics-events.ts` and guarded by
  `check:spec-identity` (now eleven files). Events only this app can emit — `APP_STARTED`,
  `APP_READY`, `USER_LOGGED_OUT` — stay in a local `frontendOnlyAnalyticsEvents` spread on top, so
  "ours alone" is visible rather than implied by a comment.

- Cases for the `VITE_APP_DEBUG_ROUTER` logging path, which had no coverage in either direction —
  nothing asserted the navigation logs appear when the flag is on, or stay quiet when it is off. A
  `no-console` exemption guarding code no test executes is how a stray `console.log` reaches a
  bundle. Also a 5xx case for `onError`, which is the only input that can tell the
  `status !== undefined && status < 500` guard from a looser one.

- **`formatDate`** in `utils/formatters.ts`, the date-only counterpart to `formatDateTime`.

- **Hard delete on the products, users and orders stores** (`hardDeleteProduct` and friends), and
  `DELETE /:id/hard` handlers in the products and users mocks. The three operations had a declared
  response schema, no mock and no client path; only orders had been finished.

- **`vue/block-order`** in `eslint.config.ts`, pinning `script` → `template` → `style`. The rule's
  default allows either order, which is how both spellings coexisted.

### Removed

- **`focusFirstErrorField` from `src/utils/errors.ts`.** The focusing is
  `useStructureFormValidation`'s now, including the render wait it needs to find anything. What is
  left here is `VUETIFY_INVALID_FIELD_SELECTOR`, the one constant every form passes as
  `invalidFieldSelector` — Vuetify marks the wrapper rather than the control, so the toolkit's
  standard `[aria-invalid="true"]` default does not fit.

- **`isFeatureEnabled` from the observability store.** Marked "kept for API compatibility",
  hardcoded to `return false`, and called from nowhere. Feature flags are not part of this stack;
  when they are, they can arrive as something that works.

- **`WithFileUpload<T, K>` from `src/types/api.ts`.** Marked "kept for any future extensions" and
  referenced nowhere. The multipart request types are generated from the spec.

### Fixed

- **The products and users mocks hard-deleted on every request.** The real API soft-deletes by
  default, setting `deletedAt`, which an admin can still see and toggle back. The mocks spliced the
  row outright, so they agreed with the API only on the hard path — behaviour drift of exactly the
  kind `mockShared.ts`'s docblock warns about. Seven cases in `mockHandlerParity.spec.ts` now pin
  the soft/hard split, including `?hardDelete=false` (which `!!'false'` would read as true).

- **`formatDate` was copy-pasted into three list views**, each using `toLocaleDateString()` with no
  locale and a literal `'-'`. Dates now follow the language the visitor picked in-app, and a missing
  one renders `EMPTY_VALUE`. `AdminAuditTab`'s fourth copy went too — it was named `formatDate` but
  formatted date _and_ time, inside a `try/catch` that could never fire.

- **Ten hardcoded `'—'` fallbacks** in the admin components now use `EMPTY_VALUE`, so
  `VITE_APP_EMPTY_VALUE` governs every one of them.

- **Field hints and validation messages failed WCAG AA, on every form that shows one.** Vuetify
  renders `.v-messages` at its medium-emphasis opacity, about 4.0:1 on a white surface where AA
  requires 4.5:1. `FormImageUpload` sets `persistent-hint`, so five screens showed it at all times.
  Raised to the 0.82 the labels already use, on the `.v-messages` WRAPPER — setting it on
  `.v-messages__message` leaves the wrapper's 0.6 in place and the two multiply to about 0.49,
  darker than the default it was meant to lighten.

    The same rule covers `opacity-70`, which measures 5.2:1 on pure white but drops below the
    threshold on the `surface-variant` the cart summary and admin panels draw it on.

- **The accessibility gate had been passing over those violations by accident.** `checkPageA11y`
  injected axe immediately, and axe cannot compute a contrast ratio through a partly-transparent
  element — so auditing mid-fade returned "incomplete" rather than a violation. It now waits until
  no CSS transition is running, which is what surfaced the four real failures above. Filtered to
  transitions, since an indefinite keyframe animation never finishes. Same lesson the
  loading-header rule in `main.css` already records: a result that depends on when you looked is
  not a result.

- **`router.onError` had four `router.push` calls where one does.** 401 keeps its own line, being
  the only recoverable status; 403 keeps its distinct copy. The 403 case had asserted only the
  status, never the message — so the one thing that branch exists for was unverified.

- **A stale mock in the guard spec** pointed at `@/utils/helperGenerics.ts` for `getCookie`, which
  the source imports from `@guebbit/js-toolkit`. It had been mocking nothing.

- **Every protected navigation fetched the profile twice.** Each guard opened with
  `restoreTokenIfNeeded().then(fetchProfile)` — work the global `beforeEach` had already done.

- **`createErrorEnvelope` set the envelope `message` to the error text.** The API derives it from
  the status, so the mock now mirrors `resolveErrorMessage`.

- **37 of 41 SFCs put `<template>` before `<script>`,** including two sibling list views that could
  not be read side by side. All script-first now.

- **The redundant `.optional()` after `.nullish()`** in the user schema (six fields), and
  `orderSchema`/`orderStatusSchema` renamed to the plural form the other two features use.

- **Responses from `DELETE /products/{id}/hard` and `DELETE /users/{id}/hard` were never
  validated.** `openapi.yaml` declares both operations and orval generated clients for both, but
  `responseSchemaMap.ts` had no entry for either, so `orvalMutator` silently skipped them — the
  "missing map entry" case the module's own docblock warns about. Both are mapped now, along with
  the new `DELETE /orders/{id}/hard`.

- **The test guarding that map asserted a hardcoded row count**, which is what let the gap
  survive: it could only notice a table that shrank, and said nothing about _which_ operation was
  missing. It now reads `openapi.yaml`, resolves every declared operation through the real lookup,
  and fails with the list of unmapped ones. It also caught two further absences — `GET /locales`
  and `GET /locales/{locale}` were mapped but untested.

- **`docs/tools/live-e2e.md` said the live profile was not in CI**, under a section titled "Why
  this is not in CI", arguing that no single pipeline could own both repos. `e2e-live.yml` does
  exactly that — checks out both, starts Mongo and Redis, seeds, boots the backend and runs the
  suite nightly. The page predates the workflow and was never updated, so it had been telling
  readers to assume a guard did not exist.

    It now states where the profile runs (nightly in CI **and** by hand) and, more usefully, where
    it does **not**: a `cron` trigger only ever fires against the default branch, so work on a
    feature branch is never covered by the nightly run. The first live exercise of a branch is
    after it merges, or a manual `workflow_dispatch` against it. The rationale section is retitled
    "Why it is nightly rather than a merge gate", matching what the workflow's own header says.

### ⚠ Breaking

- **`checkout` moved from the orders store to the cart store.** `useOrdersStore().checkout()` is now
  `useCartStore().checkout()`. It is `POST /cart/checkout`, the contract files it under `Cart`, and
  this repo already mapped the URL in `src/modules/cart/responseSchemas.ts` — only the action was
  in the wrong module, and `Cart.vue` was reaching across modules to reach it.

    Two bugs came out with it. The action **never emitted `checkout_failed`**, so the funnel it
    shares with the backend counted completions on both sides and rejections only on one, making
    checkout refusals look like users changing their minds. And it **never cleared the local cart**
    after a completed order, because the orders store had no access to it: the header kept showing
    items the server had already turned into an order until something else refetched. The cart store
    drops its copy on success — it does not invent one the API did not send — and reports both
    outcomes, the failure carrying the API's error code via the new `apiErrorCode()` in
    `src/infrastructure/errors.ts` (a code, never a translated message: a message groups one bucket per
    language, which is a funnel nobody can read).

### Changed

- **Six shared files are now BACKEND OUTPUT, not hand-maintained copies.**
  `src/infrastructure/analyticsEvents.ts`, `tests/support/mocks/seed-identities.ts` and all three `.dev/`
  API client collections joined `openapi.yaml` in being produced there and copied here whole. The
  analytics names and the seed exports are the same names with the same values in a different
  declaration order; nothing in this repo changed shape. `npm run check:spec-identity` proves the
  copy is current.

    **The three collections are new files, not reordered ones.** They are generated from the
    backend's contract now, and the ones this repo carried were badly stale: Bruno and Mockoon each
    covered 37 of the API's 56 operations, 30 of Insomnia's 39 requests pointed at URLs the API
    stopped serving, and Mockoon's mock bodies predated the response envelope — it answered
    `GET /account` with a bare user where the API returns `{ success, status, message, data }`.
    Anyone who imported that Mockoon file into a local mock server was testing against shapes this
    app cannot parse. All three now carry all 56 operations, with ids and credentials from the seed
    dataset, so `cy.loginAs`-style flows work against them without editing.

    Bruno and Insomnia additionally carry 14 **probes** — requests the contract cannot describe,
    declared per module in the backend: a bogus token, a duplicate signup, a body that breaks two
    constraints, `Accept-Language: it`, the soft-deleted product, checkout on an empty cart. The
    Insomnia file also shed a real (expired) JWT in its cookie jar and a personal email address in
    a request body, both of which had been committed here.

    What changes is where to fix one. Editing a copy here is now a change the next
    `npm run contracts:bundle` in the backend silently reverts, so `scripts/specIdentity.ts` says
    so — in its failure message and in the list itself — and its spec asserts that the message names
    the rebuild command rather than only "copy whichever side is right".

- **Mutation testing reset onto the four-tier layout.** `stryker.config.json`'s `mutate` had been
  written against `src/features/*`, which no longer exists, and it never named `src/app/`, where the
  router and the middlewares now live — so the guard layer was outside the scope while a third of
  the globs matched nothing. It is now `core` (minus `i18n.ts`), `app`, `platform` and every
  module's own `.ts`, less each module's barrel, its `module.ts`, and its `mocks/` and `tests/`
  directories: 44 files, with every glob verified to match something.

    `mutation-baseline.json` is **deleted rather than rewritten**. Its keys were pre-migration paths,
    and `check-mutation-baseline.ts` already seeds a fresh baseline when the file is absent, so
    hand-editing it would have been inventing per-file scores for a scope nothing has measured.
    `break` is `null` for the same reason: the old `50` was derived from a population that no longer
    exists, and a threshold that was not measured is not a threshold. The first full run supplies
    both, in that order — `npm run test:mutation`, then `npm run test:mutation:check`.

    The config's notes lost ~70 lines of superseded run history and per-file score lists and now
    carry only reasoning that still applies; `docs/tools/mutation-testing.md` was un-frozen and
    matches. Stryker itself, the ratchet scripts, the nightly workflow and
    `vitest.config.mutation.ts` are untouched.

- **`scripts/preflight-live.ts` is gone**, along with its `pretest:e2e:live` hook. It checked
  three things before a live run: that a backend answered, that the backend checkout had a
  `db:seed:reset:host` script, and that the shared contract files matched. The first two are
  self-evident the moment the suite runs — an absent backend fails every spec on a network error,
  and a missing seed script fails `cy.resetState()` — and its boot advice had gone stale anyway,
  naming `docker compose up -d` rather than the `podman:restart` / `docker:restart` scripts the
  backend actually ships.

    The one check worth keeping was the shared-file comparison, and it did not need a bespoke
    script: `.github/workflows/e2e-live.yml` now runs `npm run check:spec-identity` as an explicit
    step before Cypress, which is the same guard with one fewer moving part. `README.md` and
    `docs/tools/live-e2e.md` document the docker/podman boot sequence directly.

- **Order mocks follow the backend's new soft-delete semantics.** `DELETE /orders/:id` sets
  `deletedAt` rather than splicing the record out, calling it twice restores the order, and
  `DELETE /orders/:id/hard` (or `?hardDelete=true`) destroys it. Soft-deleted orders are hidden
  from the list and answer 404 on the item route for everyone but an admin — `isOrderVisibleToCaller`
  in `mockShared.ts` mirrors the backend's `visibleScope`.

- **`Order` gained `deletedAt`** in the shared contract, and the seed fixtures gained a
  soft-deleted order on the non-admin user, so the visibility branches have data behind them. The
  seed database now holds three orders rather than two. The random profile guarantees one
  soft-deleted order for the same reason.

- **`check:spec-identity` covers ten shared files, not three.** It guarded `openapi.yaml`,
  `asyncapi.yaml` and `spectral.yaml`; it now also guards `tests/mocks/shared/seed-identities.ts`,
  `src/types/realtime.generated.ts`, the three `.dev/` API client collections, and
  `scripts/check-mutation-baseline.ts` / `scripts/gen-asyncapi-types.ts`.

    The omissions were structural rather than an oversight: `SHARED_SPEC_FILES` was a list of
    **names**, compared at the same relative path in both repos, so any file living at a different
    path in each was uncheckable by construction — and this repo keeps the seed identities under
    `tests/mocks/shared/` while the backend keeps them under `db/seeds/`. `SHARED_FILES` is a list
    of **path pairs**, and a per-repo `THIS_REPO` constant decides which side this checkout is.

    That file is the reason it matters: `docs/tools/mocking.md` calls the seed records the thing
    that lets `cy.loginAs('user')` behave identically against MSW and against the real API. A fork
    leaves both repos green, because each is consistent with its own copy, and surfaces only in a
    live-API run.

    Renamed with it, since the module no longer handles only specs: `SHARED_SPEC_FILES` →
    `SHARED_FILES`, `compareSpecs` → `compareSharedFiles`, `formatSpecProblems` →
    `formatSharedFileProblems`, `specProblems` → `sharedFileProblems`. The npm script and the CI
    job keep their `spec-identity` names.

    Membership is decided by "would a fork cause a _silent_ bug", not by "do these match today" —
    a dozen more files do, from favicons to `.prettierrc`, and are deliberately excluded because a
    gate that fails when one repo legitimately changes its own icon is a gate people learn to
    ignore. `scripts/specIdentity.ts` records the reasoning per entry.

---

A correctness pass over the HTTP layer, the mock data and port allocation, driven by running this
app against its paired backend (`boilerplate-node-api-mongodb-mongoose`) rather than only against its
own mocks.

### ⚠ Breaking

- **`GET /account/refresh/{token}` is gone from the contract**, following the backend's removal of
  it on security grounds: a refresh token in a URL path leaks into browser history, proxy logs and
  `Referer` headers, and it is a long-lived credential. No client code changes — this app has always
  refreshed through the `HttpOnly` cookie via `GET /account/refresh`. The generated
  `refreshTokenWithPath` client, its Zod schemas and the MSW handler that mirrored it are all
  regenerated away.

- **`Order.total` is gone**, replaced by `totalItems`, `totalQuantity` and `totalPrice`, following
  the backend's contract change. The order views and the checkout analytics payload now read
  `totalPrice`. This was a live defect: the API had never sent `total`, so order totals rendered
  empty against the real backend while looking correct against the mocks — the mocks were the only
  thing producing the field the spec promised.
- **The axios `instance` is no longer exported** from `src/plugins/http/index.ts`. Every API call —
  generated or hand-written — goes through `orvalMutator`, so there is exactly one place that
  unwraps the response and one place request/response behaviour is configured.
- **The success interceptor no longer auto-unwraps.** `instance` now resolves a real
  `AxiosResponse`, as axios documents. Anything that relied on the old implicit unwrap must read
  `.data` itself, or go through `orvalMutator`, which does it once and honestly.
- **`apiMutator` was renamed `orvalMutator`**, so its name states what it is: the function
  `orval.config.ts` points every generated call through. Re-run `npm run genapi` after pulling.
- **Host ports moved.** This repo now owns the `8080–8099` block: the e2e vite server `4173` →
  `8085`, docs `4173` → `8090`. `VITE_UMAMI_SRC` now points at `http://localhost:3080/script.js`,
  since the paired backend moved Umami into its own `3000–3099` block.
- **Mock data changed.** `mockShared.ts` now mirrors the backend's seeds, so any spec asserting on
  `Product Alpha` / `prod-1` / `john@example.com` needs updating.

- **`VITE_MOCK_SEED` is now `RANDOM_DATA_SEED`** — no `VITE_` prefix, because the paired backend
  reads a variable of exactly that name to seed its own contract-data generator. Two names for one
  concept meant a seed printed by a failing nightly run said nothing to the other side. The two
  keep separate PRNGs and, given one seed, still produce unrelated values — that is intended, they
  generate opposite halves of the same contract. `vite.config.ts` widens `envPrefix` for this one
  variable; it is the only unprefixed env var this app reads.

- **The seed fixtures moved out of `mockProfiles.ts`** into `tests/mocks/shared/seed-identities.ts`,
  which is byte-identical to `db/seeds/seed-identities.ts` in the backend. Anything referencing the
  old inline arrays needs to go through the shared file (or its per-repo mapper) instead. Seeded
  order ids are now the backend's fixed ids rather than freshly minted `order-<timestamp>-<rand>`
  ones, so a spec deep-linking to `/orders/:id` hits the same URL under MSW as against the real API.

### Added

- **`TableLoadingBar.vue`** — the named loading bar every `v-data-table` supplies through its
  `#loader` slot. Vuetify's own bar carries `role="progressbar"` with no accessible name, and it
  cannot be fixed globally: component `defaults` apply only to declared props, and `aria-label` is
  not one. Extracting it means a new table is accessible by using the component, and the
  accessibility suite has one place to fail rather than one per table.

- **Visual regression testing** (`npm run test:e2e:visual`) — four screens photographed at a pinned
  1280×800 viewport and compared pixel by pixel against committed baselines in
  `tests/e2e/snapshots/`. Catches the class of defect every other layer is blind to: a layout
  shift, a dropped stylesheet, a font that failed to load, a theme token gone wrong — cases where
  the DOM is correct and every existing assertion passes. Hand-rolled on `pixelmatch` rather than a
  plugin, so the two numbers that decide whether the suite is useful or infuriating (per-pixel
  colour tolerance, and the 0.2% differing-pixel budget) are readable and changeable rather than
  hidden behind options. Documented in [Visual Regression](docs/tools/visual-regression.md),
  including why it is capped at four screens and what it would take to run it in CI.

- **A `link` colour in both themes.** Brand `primary` is designed as a background with `on-primary`
  text over it; used the other way round, as coloured text on a white surface, it measures about
  2:1 against the 4.5:1 WCAG AA requires. Inline links now have a token that passes.

- **Documentation for the testing layers that had none** —
  [Component Testing](docs/tools/component-testing.md),
  [Property Testing](docs/tools/property-testing.md) and
  [Accessibility Testing](docs/tools/accessibility-testing.md), plus a "gate or hunter" section on
  the testing map explaining which suites block a merge and which are allowed to be slow and
  merely report.

- **The per-file mutation ratchet** — `scripts/mutationBaseline.ts`, a committed
  `mutation-baseline.json`, and `npm run test:mutation:check` / `:baseline`, wired into
  `mutation.yml`. Stryker's thresholds are GLOBAL (`high`/`low`/`break` and nothing else), which
  is the same pooling failure as a directory-shaped coverage threshold one level up: a strong file
  carries a weak one and the number that passes is an average nobody can act on.

    A ratchet rather than a wall — improvements are recorded, regressions fail and **cannot be
    laundered**: `--update` on a regressed file keeps the higher value and still exits non-zero.
    New files are recorded at whatever they first measure, including `0`, because an honest zero
    in a diff beats a zero dissolved into a mean.

- **Mutation scope widened to every `.ts` under stores, router, features, middlewares,
  plugins/http and utils** (plan §5.6 stage 1). `.vue` is deliberately still out: Stryker mutates
  an SFC's `<script>` block but not its template, so including SFCs would report a number implying
  template coverage nobody has. It is sequenced after component tests exist.

- **Component tests for the two highest-risk components** — `FormImageUpload` and
  `ListPagination`. The upload component's real subject is not validation but a **resource**:
  `URL.createObjectURL` pins a blob until it is revoked, and there are three moments (replace,
  clear, unmount) where a missed revoke leaks a whole image invisibly. All three are now asserted
  against a counted stub, which is the only way to observe a revoke that did not happen.

- **Accessibility checks (L9)** — `cypress-axe`, a `cy.checkPageA11y()` command and
  `tests/e2e/specs/a11y.cy.ts` covering 13 routes across public, user and admin sessions. Fails on
  `serious`/`critical` only; everything lighter is run and logged, so the information is recorded
  and the threshold can be tightened later without rediscovering it.

- **Property-based tests** (`fast-check`) over `utils/formatters.ts` and `utils/uploads.ts` —
  `tests/unit/utils/formatters.property.spec.ts`. The general form of the fix that took
  `responseSchemaMap.ts` from 182 survivors to ~96%: assert what holds for every input rather than
  for the inputs someone thought of. Seeded, because an unseeded property test that fails one run
  in fifty teaches the team to hit retry.

- **The cross-repo contract check** — `scripts/specIdentity.ts`, `npm run check:spec-identity`, and
  a `spec-identity` job in `ci.yml` that checks out the paired backend and compares `openapi.yaml`,
  `asyncapi.yaml` and `spectral.yaml` by digest. All three exist in both repos, byte-identical,
  maintained by hand, and were verified by nothing on the PR path: `lint:openapi` and
  `lint:asyncapi` lint _this_ repo's copy and pass, because a forked spec is still a valid spec.
  `preflight-live.ts` now reuses the same comparison instead of its own `openapi.yaml`-only md5
  check, so a live run and a pull request cannot disagree about what "the specs match" means.

- **`e2e-live.yml`** — the third e2e profile, nightly, standing the real backend up (Mongo, Redis,
  migrated and seeded) and running the nine specs against it. `npm run test:e2e:live` existed and
  was invoked by no workflow at all.

    This is what switches `parity.cy.ts` on. That spec is the only guard against
    `tests/mocks/shared/mockShared.ts` drifting from the backend's `db/seeds/index.ts`, and every
    one of its cases opens with `cy.skipUnlessLive()` — under the mock profile the mirror IS the
    source of truth, so there is nothing to compare against. The `test-e2e` job has been green all
    along with those five cases reporting _pending_.

- **Property-based tests** (`fast-check`) over `utils/formatters.ts` and `utils/uploads.ts` —
  `tests/unit/utils/formatters.property.spec.ts`. The general form of the fix that took
  `responseSchemaMap.ts` from 182 survivors to ~96% mutation score: assert what holds for every
  input rather than for the inputs someone thought of. Seeded, because an unseeded property test
  that fails one run in fifty teaches the team to hit retry.

- **`tests/unit/mocks/mockHandlerParity.spec.ts`** — the first unit coverage the mock handlers
  have ever had. `docs/tools/mocking.md` declares two invariants: data parity and behaviour
  parity. Data parity became structural when both repos started reading a byte-identical
  `seed-identities.ts`; behaviour parity was held by comments naming the backend file each handler
  mirrors, and by nothing else — no unit test imported a single handler, so the filtering, role
  scoping and pagination in `tests/mocks/handlers/*` were only exercised indirectly through
  Cypress, against data chosen to make specs readable rather than to probe the rules.

    The cases are shaped after the backend's own tests and name them, so a divergence is obvious
    when one side changes. They cover the combinations the fixed seed cannot reach — all four of
    `active` × `deletedAt` against both roles, including deleted-but-active — pagination boundaries
    (partial last page, exact division, a page past the end, page size above the total), the create
    default, and `?active=false` arriving as the truthy string `'false'`. Driven through
    `setupServer` from `msw/node`, so the query-string parsing is covered too rather than bypassed.
    No new runner or script: it is picked up by the existing `npm run test:unit`.

- **A "where test data comes from" map** in [`docs/tools/testing-and-docs.md`](docs/tools/testing-and-docs.md),
  answering a question worth asking out loud: seven things across the two repos can hand you an
  entity, so which are necessary? The page names each one's job, and shows the shape — one
  hand-maintained dataset, two mappers over it (one per runtime, because mongoose documents and
  API entities are different shapes of the same truth), and four generators that exist because
  "the demo data", "some data" and "deliberately illegal data" are three different questions.
  Merging any two of the four would mean one of those questions stops being asked. It also records
  the one real gap: this repo has no counterpart to the backend's `tests/helpers/factories/`, so
  "give me a product" is hand-rolled in two places — not yet a pattern, worth a shared builder at
  the third.

- **The contract now declares four things the API had always accepted.** `category` and `tag` are
  query parameters on `GET /products`, not body-only. `admin` and `active` are declared on
  `UpdateUserRequest`, `UpdateUserByIdRequest` and both multipart variants — the backend has
  always decoded and stored them on update, not only on create, so the generated multipart client
  now appends them. `DELETE /products/{id}` and `DELETE /users/{id}` declare an optional
  `HardDeleteRequest` body carrying just the flag. `GET /feedback` declares the query parameters
  it reads, producing a `ListFeedbackRequestsParams` type where there was none. Each was
  previously a silent superset: input no generated client could reach and no contract test could
  guard.

- **Image upload, from the file picker to the served file.** Every layer of this feature existed
  except the one a user touches: the contract declared `imageUpload` on six request bodies, orval
  had generated seven `*WithMultipart` clients, the product and user stores already branched on
  `imageUpload`, and the backend had a hardened multer + magic-byte pipeline waiting. There was no
  file input anywhere in `src/`. There is now one — `components/molecules/FormImageUpload.vue` —
  used by `ProductEdit`, `ProductCreate`, `UserEdit`, `UserCreate` and `Signup`, with a local preview, an upload
  progress bar fed by axios' `onUploadProgress`, and the existing `imageUrl` as the initial preview
  on edit forms. The preview's object URL is revoked on replacement as well as on unmount; the
  replacement case is the one that leaks quietly through a long editing session.

- **`useUploadProgress` owns the whole upload sequence, not just the percentage.** Its first form
  exported a `trackUploadProgress` callback and a `resetUploadProgress`, which left all five
  upload forms re-deriving the same three decisions by hand — attach `onUploadProgress` only when
  there is a file to watch, surface the percentage, return to idle however the call ends — in five
  near-identical `try`/`finally` blocks carrying the same comment word for word. It now exposes
  `trackUpload(file, send)` and each view is one call. The duplicated comment was the tell: when
  the same explanation has to be pasted into five files, the logic it explains is in the wrong
  place.

- **A product creation page.** `POST /products` had been in the contract, generated in both
  content types and implemented in the store, but products could only be _edited_ from the UI —
  the create endpoint had no caller. `products/create` is admin-guarded and declared before
  `products/:id`; vue-router ranks a static segment above a dynamic one so `create` could not have
  been swallowed as an id either way, but a reader should not need to know the ranking rules, and
  a spec now pins it. `createProduct` and `createUser` both gained the per-call axios `options`
  that `updateProduct` / `updateUser` already had, which is what feeds the progress bar on the two
  create forms. Every form field is seeded rather than left
  `undefined`: a `undefined` fails `z.string()` on its _type_, and zod answers that with its own
  built-in English message, bypassing the thunked one attached to the `.min(1)` check the value
  never reaches — so an untouched field would report itself in the wrong language.

- **`stores/profile.ts`'s `signup` finally has its multipart branch.** It was the one store method
  that always sent JSON, while `SignupRequest.imageUpload` had been in `openapi.yaml` and
  `signupWithMultipart` generated for it all along — so a signup with a profile image would have
  dropped the file on the floor silently. It also stopped taking its fields positionally: at six
  arguments, two of them defaulted from earlier ones, a caller could transpose `imageUpload` and
  `options` with nothing but argument order to catch it, so it now matches `createUser` /
  `createProduct`'s `(data, options)` shape.

- **`src/utils/uploads.ts`, holding the client-side limits, the rule that enforces them and the
  progress helper.** The accepted types and the 5 MB cap are a hand-maintained copy of the
  backend's `storage.ts`, and the file says so at length: `openapi.yaml` declares the binary
  fields as a bare `type: string, format: binary`, and declaring `maxLength`/`contentMediaType`
  there would buy nothing, because orval's zod generator short-circuits `format: binary` to
  `zod.instanceof(File)` and the `zodSchemas` target has no `splitByContentType` — the multipart
  bodies never become zod schemas at all. `VITE_MAX_UPLOAD_BYTES` lets a deployment follow a
  backend running a non-default `NODE_MAX_UPLOAD_BYTES`. All of it is a UX affordance and none of
  it is a gate: the backend still checks the declared type before the bytes touch disk and the
  actual magic bytes afterwards, and a browser can only fail faster, never weaker. `openapi.yaml`
  carries the same explanation as a comment beside `ImageUrl`, so the next person to notice the
  missing `maxLength` finds out why before "fixing" it into something that generates nothing.

- **Forms re-translate the errors already on screen when the language changes.** A thunked schema
  decides what the _next_ validation says; it cannot touch what is currently displayed, because
  `validate()` copies resolved _strings_ into `formErrors` and re-rendering just re-prints them.
  Every form now passes `{ revalidateOn: locale }` to `useStructureFormValidation`
  (`@guebbit/vue-toolkit@2.2.0`), which re-runs validation over the unchanged data — and only
  while errors are showing, so a pristine form does not sprout red text because someone switched
  language.

- **`api.*`, a reserved namespace for the API's own dictionary.** Each repository owns its
  strings: this app never gets UI copy from the API, and the API never gets response copy from
  here — either boilerplate has to work against a different counterpart. What they synchronize is
  the _choice_ of language. The API's dictionary is nonetheless available at
  `GET /locales/:locale` and merged under `api`, never at the root, where two
  independently-authored keyspaces would eventually collide silently. `apiText(apiKey, localKey)`
  reads it with a local stand-in, because the messages that need it are exactly the ones produced
  when the API could not be reached.

- **A language only the API has is offered anyway.** `mergeApiLocales()` takes the union of the
  build-time list and `GET /locales` at boot, so the switcher shows what the server can actually
  answer in. `es` is the worked example: declared in `VITE_APP_SUPPORTED_LOCALES`, no
  `src/locales/es.json`, Spanish API copy inside an otherwise-English UI. Every fetch resolves
  rather than rejects, so an unreachable API degrades the copy and never blocks a navigation.

- **`vue/no-bare-strings-in-template`.** Catches the two shapes that slipped past review — a bare
  text node, and a static `alt` / `title` / `label` / `placeholder` / `aria-label` that a screen
  reader or a tab title reads. Symbols and SI units (`×`, `MB`, `ms`) are allowlisted: identical
  in every language, and putting them through a dictionary only invites a translator to "fix"
  them.

- **A [Docker & Podman](docs/tools/docker-and-podman.md) docs page**, and a pairing section in the
  README. Both state the rule the compose setup depends on: the two stacks are separate projects on
  separate networks and stay that way, because the only thing crossing between them is the browser
  on the host — which is why `VITE_API_URL` and friends must always be **host** ports and never
  compose service names. Both also document that `cp .env-example .env` is required for the
  container path too (compose bind-mounts the repo, so Vite reads that same file from `/app`), and
  why the compose `environment:` block is deliberately minimal: entries there become `process.env`,
  which Vite's `loadEnv` applies _after_ `.env`, so anything added silently becomes unoverridable.
- **Mutation testing** — Stryker with the vitest runner, `npm run test:mutation`, scoped to
  `src/features/*/store.ts`, `src/middlewares/`, `src/plugins/http/` and `src/utils/`. It runs in
  its own workflow (`.github/workflows/mutation.yml`, nightly + on demand) and deliberately **not**
  in `ci.yml`: a run re-executes the suite once per mutant, so keeping it out of the `ci` aggregate
  is structural rather than a convention. Thresholds come from real runs, not from numbers picked
  in advance, and the rule is one-directional: raise `break` when the score rises, never lower it
  to make a run pass. Final: **81.12% total / 84.13% covered**, 784 mutants, ~2 minutes;
  `break` raised 50 → **70**.

    Two earlier runs are worth recording, because each produced tests rather than just a number:

    - **55.95% / 65.98%** over 435 mutants. This is the run that produced
      `tests/unit/utils/formatters.spec.ts`: the file scored 0% because no test had ever called it,
      and the coverage report had never said so (see `coverage.include` below, which is the cheap
      way to see that class of gap without a mutation run).
    - **55.74%** over 784 mutants, with **182 of the 318 survivors in `responseSchemaMap.ts` alone**
      (30.53%). That file is a 52-row lookup table, and it had been tested by checking a handful of
      representative rows — which reads like testing and is not. Replacing the sample with a
      table-driven test over _every_ row, plus deeper-path, prefixed-path and empty-segment
      negatives per row (targeting the two regex anchors and the `[^/]+` quantifier respectively),
      took that file to **100%** and the suite as a whole from 55.74% to 81.12%. Sampling a
      declarative table is the failure mode to watch for here.

- **`coverage.include` in `vitest.config.ts`**, plus 70% per-glob thresholds on the paths Stryker
  mutates. Without `include`, v8 reports only files a test imported — a source file nobody tests is
  _absent_ from the report rather than a 0% row, so it never drags the average down and never
  appears. That is precisely how `utils/formatters.ts` sat completely untested behind a clean
  coverage report until a 435-mutant Stryker run named it. The glob puts every source file in the
  denominator, so "no test at all" now shows up as 0% instead of showing up as nothing.
- **Unit tests for the four feature stores**, the token-refresh flow, the router, all three
  middlewares, the live-profile's response validation and its `responseSchemaMap`, and the mock
  profile switch itself. The suite went from 8 files / 34 tests to **21 / 402**. The refresh spec
  (`tests/unit/plugins/httpRefresh.spec.ts`) drives the **real** interceptor chain against an MSW
  node server — `_dontRetry` and the replay going back through the same axios instance are exactly
  what a stubbed adapter cannot reproduce. `tests/unit/utils/formatters.spec.ts` exists because the
  first mutation run scored that file 0%: no test had ever called it. See
  [Unit Testing](docs/tools/unit-testing.md).

    Added last, closing the gaps the mutation runs named:
    `tests/unit/middlewares/localeChoice.spec.ts` (the guard that must return literal `true` rather
    than merely something truthy — a redirect object is truthy too, and returning one produces an
    infinite navigation loop) and `demoMiddleware.spec.ts`;
    `tests/unit/plugins/responseSchemaMap.spec.ts` (193 tests, table-driven over all 52 rows) and
    `httpRequest.spec.ts` (the bearer/`Accept-Language` interceptor, and the refresh-exclusion list
    asserted per entry — a 401 from `/account/login` means "wrong password", so refreshing there
    turns a clean message into a misleading session-expired state). `http.spec.ts` and
    `helperErrors.spec.ts` gained the fallback branches: the `>= 500` boundary from both sides, the
    `statusText || message || 'Unknown error'` precedence chain, and the empty-message guards that
    stop a blank string being shown to a user as if it were an explanation.

- **`computeOrderTotals`**, mirroring the backend's `sumLineItems`, so orders and the cart summary
  derive their totals the same way the real API does — including its rounding to cents, which the
  cart summary previously skipped. Lives in the new `tests/mocks/shared/mockOrderMath.ts` alongside
  `createMockOrder`, split out of `mockShared.ts` so the random mock profile below can use both
  without an import cycle.
- **`lint:asyncapi` script and the `lint-asyncapi` / `asyncapi-types-freshness` CI jobs**, matching
  the backend's. The frontend had neither.
- **A [Live E2E](docs/tools/live-e2e.md) profile** (`npm run test:e2e:live`) running the existing
  Cypress specs against the real, seeded backend instead of MSW. A `scripts/preflight-live.ts`
  check fails fast (backend reachable, checkouts paired, specs in sync) before Cypress even starts;
  `VITE_VALIDATE_RESPONSES` makes `orvalMutator` parse every response through its OpenAPI schema
  and throw on a mismatch, the live-side twin of `assertMockContract`; and
  `tests/e2e/specs/parity.cy.ts` asserts the live dataset agrees with the hand-mirrored MSW seed.
  Run by hand (mandatory before tagging either repo), not in CI — the two repos are independently
  versioned with no shared pipeline to check them out together.
- **A [random-data mock profile](docs/tools/e2e-random-profile.md)** (`VITE_MOCK_PROFILE=random`,
  `npm run test:e2e:random`), driving the app off faker-generated, contract-valid data instead of
  the fixed seed, so `tests/e2e/specs/resilience.cy.ts` can assert invariants ("every route
  renders", "no console noise", "empty lists don't crash") that must hold for _any_ dataset rather
  than the values the fixed seed happens to have. Runs nightly and on demand
  (`.github/workflows/e2e-random.yml`), not on every PR — its assertions are invariants, not exact
  values, so a failure needs a human to read the trace rather than a red X blocking a merge. The
  RNG is seeded and the seed is logged, so a failure reproduces exactly with
  `VITE_MOCK_SEED=<seed>`.

- **`orvalMutator`** — the single sanctioned entry point to the shared axios instance, doing one
  honest unwrap (`instance.request<T>(config).then((response) => response.data)`) with a type that
  matches what actually runs.
- **`VITE_APP_FALLBACK_LOCALE` in `.env-example`**, documenting a variable `src/utils/i18n.ts`
  already reads for `vue-i18n`'s `fallbackLocale`.
- **Host port-block documentation** — an explicit port map in the README, plus comments in
  `.env-example`, `docker-compose.yml` and `cypress.config.ts` recording which block this repo owns
  and why each service sits where it does.
- **Superset output from `scripts/gen-asyncapi-types.ts`** — alongside the payload map this app
  consumes, it now also emits the `<NAMESPACE>_CHANNELS` constant objects the backend imports, so
  one generator serves both repos.
- **`tests/unit/jsdom-quiet-css.env.ts`** — a custom Vitest environment: plain jsdom, with jsdom's
  `css-parsing` errors filtered out of the virtual console. Vuetify's stylesheets nest `@media`
  inside `@layer`, which jsdom's parser cannot read, so every unit run ended in 31 identical
  `Could not parse CSS stylesheet` lines. They were harmless — jsdom keeps every rule it could
  parse — but a real warning would have been invisible among them. `css: true` is kept, so
  computed-style assertions remain possible; every other jsdom error still comes through.
- **`podman:kill` / `docker:kill`** — `<engine> compose kill`, scoped to this project's stack.

### Changed

- **Test-configuration files now document their own patterns.** `vitest.config.ts` states why
  `thresholds.perFile` is load-bearing (thresholds pool by default, so a covered file carries an
  untested neighbour) and warns that Vitest does not type-check, so a green run is not evidence a
  spec compiles. `cypress.config.ts` explains the three profiles running over one set of specs,
  why the viewport is pinned at config level, and why the visual comparison has to live in Node.

- **`stryker.config.json` re-baselined, because `mutate` changed.** 81.11% total / 83.96% covered
  over 826 mutants became **59.82% / 79.45% over 1346**. Those are not two measurements of the
  same thing — 520 mutants that did not exist before are now counted, 332 of them with no test
  coverage at all — and note that the covered-code figure barely moved: the assertions did not
  weaken, the denominator grew to include code nobody had measured.

    **The gap is the deliverable.** 59.82 against 79.45 is the size of the untested surface, stated
    as a number for the first time: `stores/observability.ts` 1.42%, `stores/profile.ts` 6.25%
    (it _has_ a spec), `features/admin` 0%, `features/realtime` 24.56%.

    `break` moved 70 → 50, which is the one sanctioned exception to "never lower it": a change to
    `mutate` in the same commit, with both numbers and the reason recorded. It is no longer the
    main gate either — per-file regressions are caught by the ratchet, which is what makes a
    single weak file visible instead of averaged away.

- **`FormImageUpload` carries a `data-testid` on its progress bar.** Vuetify's `v-file-input`
  renders its own `.v-progress-linear` inside the field loader, so a spec written against the
  class passes whether this component's bar is rendered or not — it asserted nothing. This is the
  `data-testid` convention the testing plan asks for, and the first place it earned its keep.

- **Coverage thresholds apply per file** — `coverage.thresholds.perFile: true` in
  `vitest.config.ts`. Without it Vitest merges every file matching a glob into ONE coverage map and
  checks the threshold against the merged total, so a glob covering four files — three at 95%, one
  at 0% — passes a 70% floor comfortably. The floor is satisfied by exactly the file it exists to
  catch.

    Turning it on immediately named `middlewares/authentications.ts`: 50% branches, 55% functions,
    inside a `src/middlewares/**` group that had been passing on the strength of its two neighbours
    at 100%. It now carries its own floor at the measured value — an honest number on the record
    rather than a zero hidden in an average — and it is corroborated independently by Stryker,
    which scores the same file lowest in the repo at 59.09%.

- **`User` carries `deletedAt`, and `User.active` now means what it says.** Both follow the
  backend separating two facts it had been storing as one: it had no `active` column at all —
  `active` was synthesised as `!deletedAt` and `deletedAt` was stripped — so a single derived flag
  stood in for "is this account enabled" and "has it been soft-deleted". This app's admin UI was
  already built to the split model (`UsersList.vue` filters on a real `active`, `UserCreate.vue`
  sends an `active` switch), so no view code changed; what changed is that those controls now
  reach a real column instead of silently doing nothing. `GET /users?active=false` returns
  deactivated accounts rather than deleted ones, and the list can tell the two apart again because
  `deletedAt` is on the wire — exactly as `Product` has always had it.

- **`active` and soft-deletion are declared as independent facts in `openapi.yaml`.** A record can
  be active or not whether or not it has been soft-deleted; what they share is an effect, not a
  value — a non-admin sees a record only when it is active AND not deleted. Both create bodies now
  declare `default: true` for `active`. Leaving that undeclared is exactly how the two repos came
  to disagree: this app's mock created a product active, the real API created it inactive, and the
  same request produced a publicly visible product against one and a hidden one against the other
  with nothing failing. The mock's behaviour is unchanged — the backend and the contract moved to
  meet it — and `mockHandlerParity.spec.ts` now pins it. Update bodies carry no default on
  purpose: an omitted `active` means "leave it alone", never "republish".

- **`openapi.yaml` and `asyncapi.yaml` are byte-identical to the backend's copies again.** Both had
  drifted: this repo still declared `/observability/load-test` (a route the backend deleted) and the
  whole `cache.tags.invalidated` Redis channel (an implementation the backend deleted), and was
  missing the `locale` field the backend now carries on both job payloads because a request-scoped
  locale does not survive the hop onto a queue. The audit endpoint's description still described an
  in-memory ring buffer rather than the persisted, retention-bounded trail behind it. Everything is
  regenerated, the dead `GetObservabilityLoadTestResponse` row is gone from `responseSchemaMap.ts`,
  and `diff` on either file is now the whole drift check.

- **The admin dashboard's observability data is randomisable.** `adminMockHandlers.ts` used to
  return three frozen module-level constants regardless of profile, which made `AdminOverviewTab.vue`
  — the most numeric, most layout-fragile screen in the app — the one screen `test:e2e:random` could
  never stress: `resilience.cy.ts` visited `/en/admin` and asserted it rendered, against the same
  `uptimeSeconds: 3600` / `totalRequests: 1042` / `loadAvg: [0.5, 0.4, 0.3]` every run. The payloads
  now live in `mockDatabase.observability` like every other handler family's data, and the random
  profile drives them: seven-digit request counts, zero-request cold starts, and a `loadAvg` whose
  length is not pinned to 3 — the contract only ever promised "array of number".

- **Asynchronous code is written as promise chains, not `async`/`await` with `try`/`catch`.**
  This was already the house style — every `submitForm` ends
  `.then(…).catch((error) => notifyErrorMessages(addMessage, error))` and every store method ends
  `.then((response) => response.data)` — so the `async` usages were the outlier. Now applied
  everywhere: the whole of `src/` — the four account views, `main.ts`'s bootstrap,
  `middlewares/localeChoice.ts`, `utils/localeApi.ts`, `Admin`, `Order`, `OrderEdit` and
  `AppLanguageSwitcher` — and the whole test suite: all 27 unit spec files, the MSW handlers,
  `mockTransport.ts`, `mockProfiles.ts` and the Cypress `commands.ts` retry.

    Two conversions needed more than dropping the keyword. `localeChoice`'s redirect branch
    returned a bare object that `async` had been auto-wrapping into a promise, and now says
    `Promise.resolve` itself. Two views returned `router.push()`, whose
    `NavigationFailure | undefined` the old `await` silently discarded and a `Promise<void>`
    submit handler will not take; they now end on an explicit `.then` that drops it, with the
    reason written down — a failed navigation is the router's own `onError` to report.

    Several places read better for it rather than merely differently. A cleanup that must run
    either way is `.finally()`, which forwards the resolved value and re-throws the rejection
    untouched. The mock body reader's three stacked `try`/`catch` blocks became a `.catch()`
    cascade, where each link _is_ "that encoding was not it, try the next", and the three
    `void error;` statements that existed only to silence the linter are gone. The one genuinely
    awkward case is `resetMswDatabase`'s bounded retry, which becomes recursion — a retry is the
    shape a flat chain cannot express, since the number of links is not known up front; it uses the
    two-argument `.then(onFulfilled, onRejected)` so that a trailing `.catch` cannot swallow the
    "gave up" rejection and turn the bound into an infinite retry.

    **A returned chain is load-bearing in a spec.** Vitest fails a test whose returned promise
    rejects, but a converted test that loses its `return` passes vacuously and looks identical, so
    the conversion was verified two ways rather than by reading it: eslint's
    `vitest/valid-expect-in-promise` (already an error in this config) catches an unreturned chain
    containing expectations, and the full JSON test inventory was diffed before and after —
    499 tests in, 499 out, name for name. That diff earned its keep: one scripted pass had nested
    two `it()` calls inside another test's body in `mockProfiles.spec.ts`, silently deleting them
    while the suite still reported green.

    What deliberately keeps `await`: `vi.mock(…, async (importOriginal) => …)` factories, top-level
    `await import()` used to order module mocking, and `mockShared.ts`'s module-level top-level
    `await`, which is what keeps the seed profile from ever loading faker.

- **Schema factories are gone; the schemas are module constants with thunked messages.**
  `createUsersSchema(t)` consumed through a getter bought nothing —
  `useStructureFormValidation` resolves `toValue(schema)` inside `validate()` and nowhere else,
  so a getter was evaluated at exactly the moment a thunk is — and it was a live trap:
  `createUsersSchema(t)` instead of `() => createUsersSchema(t)` type-checks, runs, and silently
  freezes the language. A thunk inside `schemas.ts` has no call site to get wrong. Six views also
  built inline schemas with eagerly-called `t()`, which froze the language the same way; those
  are thunks too. Import `usersSchema` / `productsSchema` / `orderSchema` instead of the
  `create*` factories.

- **`contracts/` and `tests/mocks/generated.ts` regenerated** for the backend's `imageUrl` contract
  change — `format: uri` became a shared `ImageUrl` schema with `format: uri-reference`, so
  `imageUrl` is now `zod.string()` rather than `zod.url()`. That is what the field has always held:
  an absolute URL, or a server-relative upload path the API base is prefixed onto at render time.
  `openapi.yaml` stays byte-identical to the backend's.
- **`cypress.config.ts` sets `defaultCommandTimeout: 15_000`.** Cypress' 4 s default assumes a
  prebuilt app; these specs run against `vite dev`, which compiles a route the first time it is
  visited, so the first assertion of the first spec waits on a build rather than on the app. It
  fits in 4 s on an idle machine and does not on a busy one.
- **`vite.config.ts` sets `server.warmup.clientFiles`** over `main.ts`, the layouts and the route
  views, moving that first-visit compile into server startup — which `start-server-and-test`
  already waits through.
- **`@typescript-eslint/naming-convention` is off for root `*.config.ts`.** Config files key objects
  by path glob — `vitest.config.ts`'s per-directory coverage thresholds, orval's per-output entries
  — and those keys are addresses whose spelling the tool defines, not identifiers. Four per-line
  disables in `vite.config.ts` became redundant and are gone.

- **One mock order factory instead of two.** `mockShared.ts` had a module-private `createOrder` for
  the seed fixtures and an exported `createMockOrder` for orders placed at runtime, with identical
  bodies — so a seeded order and a checked-out one could drift apart silently. The seed builder now
  calls `createMockOrder`.
- **`calculateCartSummary` derives its figures from `computeOrderTotals`** rather than repeating the
  loop, which is what brings the mock cart total into line with the backend's rounding.
- **`router.onError` resolves the locale through one helper** instead of a nested ternary over two
  route objects, and reuses the module's existing `isRouterDebugEnabled` rather than re-testing
  `import.meta.env.DEV && VITE_APP_DEBUG_ROUTER` inline.

- **The generated Zod schemas are now strict.** `orval.config.ts` sets `override.zod.strict`, so
  `contracts/rest/schemas.zod.ts` emits `zod.strictObject` throughout (191 of them, zero plain
  `zod.object`) and an undeclared key is **rejected** instead of silently stripped. Every object
  schema in `openapi.yaml` is `additionalProperties: false`; the two genuine free-form maps
  generate as `zod.record` and are unaffected. Without this, a mock handler returning more than the
  contract allows passed `assertMockContract` unremarked.
- **`toMockJsonResponse` sends what it validated.** It previously called `assertMockContract` for
  its exception and then shipped the original payload, so the guard could not have stripped a
  leaked key, let alone rejected one.
- **`onResponseSuccess` (the auto-unwrap interceptor) is disabled** — commented out rather than
  deleted, so the reasoning stays visible at the call site.
- **All six direct `httpClient` call sites were migrated** across `features/products/store.ts`,
  `features/users/store.ts` and `features/orders/store.ts`. The orders invoice download now calls the
  already-generated `getOrderInvoice` instead of duplicating it; the product and user image uploads
  go through `orvalMutator<ProductEnvelope>` / `orvalMutator<UserEnvelope>` with the same unwrap the
  JSON branches already used.
- **`tests/mocks/shared/mockShared.ts` now mirrors `db/seeds/index.ts` exactly** — the two seed users
  with their real ObjectIds (`root@root.it` admin, `gino@pino.it`), all five seed products
  (`Sallyno Panino`, `Sallyno Carino` with its `deletedAt`, `Miciona inutile`, `Micino pufettino`,
  `Bundle micini` inactive), and the admin's cart and both seeded orders. The synthetic mock-only
  third user is gone; nothing depended on it.
- **`cy.loginAs('user')` logs in as `gino@pino.it` / `password`**, a credential that exists in both
  the mocks and the real database, instead of the mock-only `john@example.com` / `rootroot`.
- **`tests/e2e/specs/products.cy.ts`** asserts on the real seed data and ObjectIds, and on the
  role that goes with a row count: an anonymous visitor sees 3 products, an admin 5. It asserted a
  flat 5 for everyone while the mock handler ignored role — green against the mocks, wrong against
  the real API.
- **The mock database's seed arrays are factories again** (`createSeedUsers()` /
  `createSeedProducts()`), returning fresh objects on every call. Hoisting them to module-level
  constants broke `resetMockDatabase()`, because handlers mutate items in place (`.splice`,
  `.unshift`, index assignment) so a shared reference meant "reset" kept returning already-mutated
  objects.
- **`scripts/gen-asyncapi-types.ts` became the shared implementation** for both repos, byte-identical
  on each side, with the output path supplied via `--out`. Channel namespaces are now discovered from
  the contract rather than hardcoded to the four known prefixes.
- **`src/stores/observability.ts`**'s default tracker URL follows the Umami port move.

### Fixed

- **`cy.visit()` could resolve against the page it was navigating away from.** The override in
  `tests/e2e/support/commands.ts` waited for `window._appReady`, a flag the app sets once it has
  booted — but the outgoing `window` survives until the new document commits, so a second visit
  inside a test could see a flag set long ago, resolve immediately, and hand every following
  command the **previous** screen. Ordinary specs hid it, because `cy.get()` retries until the page
  swaps; anything reading the page once did not. The accessibility suite had been auditing the
  wrong route for most of its cases, and a visual baseline for `/en/this-route-does-not-exist` was
  a photograph of the home page. Each visit now mints a token, stamps it on the incoming window
  before any application script runs, and waits for that exact value — something the old window can
  never satisfy.

- **Five accessibility violations, all of them in the agnostic layer rather than the demo app**, so
  every project copied from this boilerplate carried them:
    - the full-page and corner loaders in `LayoutDefault.vue` rendered `role="progressbar"` with no
      accessible name — and the full-page one is the only thing on screen while the app boots;
    - `v-data-table`'s internal loading bar had the same problem, fixed through the `#loader` slot
      because Vuetify component `defaults` cannot supply `aria-label` (it is not a declared prop, so
      the value never reaches the element);
    - every input label in the app sat at 3.32:1 against a required 4.5:1;
    - the "Forgot password?" link used `text-primary` at roughly 2:1;
    - table column headers were dimmed to `opacity: 0.38` while loading, landing at 1.74:1 — which
      also made the suite **timing-dependent**, passing or failing on how fast a mock replied.

- **The admin dashboard's health, metrics and audit panels were rendering nothing.**
  `useAdminObservability.ts` read `response.data.data` for all three, compensating for a
  double-wrapped schema in `openapi.yaml` — but `orvalMutator` already unwraps the envelope, so
  `response.data` **is** the payload and the extra `.data` resolved to `undefined`.

    The spec was the cause: `ObservabilityHealthResponse`,
    `ObservabilityMetricsSummaryResponse` and `AuditLogsResponse` each declared an envelope while
    being used as the `data` inside one, so the generated types described a shape the backend has
    never sent. The spec is corrected in the paired backend and re-synced here; the four
    `.data.data` reads are now single, and `contracts/` is regenerated.

    Found by the backend's new spec-driven fuzz suite. It went unnoticed here for the same reason
    it went unnoticed there — `useAdminObservability.ts` is the least-tested file in this repo,
    at roughly 3% coverage and 0% mutation score. The least-tested file held the live bug.

- **`router.spec.ts` failed under `test:unit:coverage` and nowhere else.** The first test in the
  file paid for the whole router module graph — every view, and therefore Vuetify — and with
  coverage instrumentation added that one-off cost pushed it past the 5s default timeout. It passed
  alone, passed in `test:unit`, and failed in the coverage run, which is the shape of a flake
  nobody trusts. The graph is now warmed once in `beforeAll` with its own budget, so every real
  case keeps the tight default where a genuine hang should still be caught.

- **Six tests for the refresh-exclusion list asserted nothing at all.** `httpRequest.spec.ts`
  drove a 401 through `onResponseRejectWithRefresh` for each auth endpoint and asserted that no
  refresh followed, by counting calls to a `setAccessToken` mock — but nothing in `src/` has ever
  called `setAccessToken`; the interceptor writes `accessToken.value` through `storeToRefs`. The
  counter was therefore permanently zero and `resolves.toBe(false)` could not fail. A second
  fault sat on top of it: the spec mocked `@/utils/i18n.ts` without `apiText`, which
  `onResponseReject` needs to build the 401 message, so the call threw before reaching any
  refresh logic at all — invisible because the function was `async`, which turned the throw into
  a rejection that the probe's own `.catch` swallowed.

    Surfaced by dropping that vestigial `async` (see _Changed_), and confirmed by deleting the
    exclusion list outright and watching all six still pass. The cases moved to
    `httpRefresh.spec.ts`, which drives the real interceptor chain against MSW and asserts on the
    server's request log; the same deletion now fails all six. Coverage went up rather than down
    — the old spec checked one endpoint properly, the table now checks all five plus the
    absolute-URL spelling — while the test count drops by one, which is the six empty assertions
    leaving.

    Worth noting where this was hiding: the module's own header calls the refresh flow "the one
    piece of client logic where a bug is both invisible to types and invisible to the e2e suite:
    a broken refresh does not throw, it just logs the user out at some later moment."

- **Filtering the product list by id did nothing, and the workaround was the bug.**
  `watchSearchProducts` sent `filters.id` as a `productId` query parameter, with a comment and a
  unit test both asserting that `id` "would be silently ignored by the API". The opposite was
  true: the backend has always read `id` on `GET /products`, and `openapi.yaml` — in this repo and
  in the backend's — declared the query filter as `productId`. So the parameter was sent, the API
  ignored it, and the unfiltered catalogue came back looking like a working filter. The spec now
  declares `id`, matching what `SearchProductsRequest` always said for `POST /products/search`;
  the rename, its comment and the test that pinned it are gone. Re-run `npm run genapi` after
  pulling — `ListProductsParams.productId` is now `ListProductsParams.id`.

- **`fallbackLocale` was inert for a language with no local dictionary.** Loading a locale never
  loaded anything else, so landing directly on `/es/…` left `es` as the only registered
  dictionary — and every UI key rendered as its own raw identifier
  (`products-list-page.page-title`) instead of the English copy. Per-key fallback is not free:
  `_ensureFallbackLoaded` now runs on every activation path.

- **A stray comma or a space in `VITE_APP_SUPPORTED_LOCALES` broke locale routing, silently.**
  `en, it` yielded the locale `' it'`, which matches no route and no dictionary; `en,,it` yielded
  `''`, and an empty string matches the empty first segment of `/`, so `routerLinkI18n('/')`
  stopped prefixing the locale and the root route lost its language. The list is trimmed and
  empty-filtered — the same normalisation the API applies to `NODE_SUPPORTED_LOCALES`. The
  unreachable "no languages found" guard that stood next to it is gone: it needed both an
  unusable env list _and_ an empty `src/locales/`, and an app with no dictionary at all cannot
  render one string, so every other test fails long before a warning would help.

- **The bundled dictionary was registered by reference.** `_updateLocale` passed the imported
  `en.json` module object straight to `setLocaleMessage`, so vue-i18n held _that_ object and a
  later merge would have written into the bundled dictionary itself, process-wide, for every
  importer. It is cloned now.

- **Nine user-facing strings were hardcoded English.** Five in `RealtimePlayground.vue` /
  `AppNavigation.vue`, and four error messages in `plugins/http` and `utils/errors` — the ones
  shown when no response arrived at all, which is the worst moment to fall back to a language the
  user may not read.

- **The live e2e profile is 63/63**, from 58 passing / 5 failing. Three of the five were a single
  backend bug — cached responses reused across authentication scopes, so an authenticated user was
  served anonymous data by their own browser without the request reaching the API (see the
  backend's changelog). The remaining two were faults in the specs themselves, below. Worth
  recording for whoever meets the next caching bug: **`cy.intercept` bypasses the browser cache**,
  because it proxies the request to the network — so it cannot be used to observe one. Adding an
  observer made the failing test pass, which is what made these five read as a timing race for so
  long.

- **`auth.cy.ts`'s forced-401 test stubbed its own page instead of the API.**
  `cy.intercept('GET', '**/orders*')` matches this app's route at `http://localhost:8085/en/orders`
  every bit as readily as the API's `http://localhost:3000/orders` — so the request that received
  the forced 401 was `cy.reload()`'s _document_ navigation. The browser rendered the error JSON as
  the entire page and the SPA never booted, which meant the missing `[data-test=list-row]` was the
  absence of an application rather than the failed token refresh the test exists to detect: the two
  are indistinguishable from the assertion alone. Now pinned to the API origin via
  `cy.env(['apiUrl'])` — `Cypress.env()` throws here, `allowCypressEnv: false`.

- **`products.cy.ts` still hard-coded a product id in the View-navigation test** — the other half of
  the row-ordering fault recorded below. It clicked row 0 and asserted the mock's _first_ product
  id, which the API's `createdAt DESC, _id DESC` sort never promised. The id is now read off the row
  actually being clicked, synchronously from the jQuery element inside a single `.then()`:
  re-entering the chain with `.eq(0).find('td').first().invoke('text')` and clicking afterwards is
  what produced `CypressError: cy.eq() failed because it requires a DOM element or document`.

- **`products.cy.ts` asserted the mock's row ordering against a real database.** The list was
  addressed by index (`.eq(0)`, `.eq(2)`), which encodes the fixture's insertion order as though
  it were behaviour. The API sorts by `createdAt` and seeded rows can share a millisecond, so
  which product lands in which row is not a claim this spec should make. Products are now looked
  up by title, which is what the assertion was actually about — a title paired with its price —
  and survives any ordering.

- **`npm run build` failed on three type errors**, all of them in specs. `vi.fn(() => …)` infers a
  zero-arity signature, so `localeChoice.spec.ts` could not pass arguments to its own mocks; and
  `httpRequest.spec.ts` built an `AxiosError` without the payload generics the interceptor under
  test declares.
- **13 lint errors and 5 unformatted files.** One is worth recording, because the tool is actively
  misleading: `unicorn/no-useless-undefined`'s autofix strips `undefined` from calls whose
  parameter is _required_, which then fails `vue-tsc`. Those sites keep the argument, with a scoped
  disable, rather than the "fix".
- **The e2e suite's flakiness under a full run is mitigated** — see the timeout and warmup entries
  under _Changed_. Three consecutive full runs are green, plus the random-data profile. Both
  changes address the symptom: the root cause is that the suite tests a dev server that is still
  compiling, and the cure is a production build (`TODO.md`).

- **The dockerised dev server was unreachable from the browser.** `npm run dev` was
  `vite --port 8080` with no `--host`, and Vite binds `127.0.0.1` by default — so inside the
  container the published port forwarded to a socket nobody was listening on. `compose up`
  reported success and every request was refused. Compose now runs the dev server with
  `--host 0.0.0.0`; it is set there rather than in the `dev` script so host development is not
  exposed to the LAN.
- **`VITE_APP_PORT` did nothing.** Compose mapped `${VITE_APP_PORT:-8080}` on both sides of the
  publish while the `dev` script hardcoded `--port 8080`, so changing the variable pointed the
  mapping at a port nothing served. The port now comes from `VITE_APP_PORT` in `vite.config.ts`
  via `loadEnv`, so the published and listening ports cannot drift; `strictPort` is on, because a
  silent hop to the next free port is invisible from outside a container. A CLI `--port` still
  wins, which is what the e2e scripts rely on.
- **The dockerised frontend ignored the backend it was published alongside.**
  `VITE_API_MOCK_ENABLED` defaulted to `true` in compose, so a fresh clone with no `.env` yet —
  precisely the "start both repos" path — ran the container against MSW while pointing at a real
  API. It rendered fine, with no error or warning to suggest the backend was not being used.
  The default is now `false`; mock-backed standalone development is still one env var away.
- **A failed navigation sent the user to login with the wrong `continue` target.**
  `router.onError` read `router.currentRoute` for the redirect, but a navigation that fails in a
  guard never commits — so `currentRoute` was still the page being _left_, and logging in returned
  the user to where they already were rather than where they were going. The handler receives the
  target as its second argument and now uses it, which is what its own doc comment already claimed.
- **The `api-freshness` CI job checked a directory that does not exist.** Its pathspec was `api/`,
  which this repo has never had, so `git diff` matched nothing, exited 0, and the job passed
  without checking anything from the day it was written. It now covers `contracts/` and
  `tests/mocks/generated.ts`, normalises formatting before diffing (orval emits 2-space
  indentation, this repo's prettier uses 4), and flags untracked generated files. Verified to fail
  by editing `openapi.yaml` without regenerating.
- **`commitlint` could not block a merge** — it ran but was absent from the `ci` aggregate's
  `needs:`. Added, along with the two new AsyncAPI jobs.
- **The product mock handler ignored the backend's `active`/`deletedAt` filtering and admin
  scoping**, so it returned all 5 seeded products to everyone while the real API returns 3 to
  non-admins — and `products.cy.ts` asserted the mock's number. The handler now mirrors
  `src/services/products.ts`, and the spec asserts both role branches.
- **The order mock handler ignored per-user scoping**, letting any caller list every order by
  passing `?userId=`. It now mirrors the backend's `userScope()`.

- **The token-refresh interceptor never fired.** Because the success interceptor unwrapped every
  response, `instance.get()` resolved with the envelope rather than an `AxiosResponse`, so the
  refresh handler's `data.data.token` read one `.data` too many, the guard returned early, and the
  retry never happened — users were silently logged out when the access token expired instead of
  being transparently refreshed. TypeScript could not catch it, because `instance.get<T>` was typed
  as returning `AxiosResponse<T>` while the interceptor chain returned `T`.
- **The invoice download button was silently broken.** `Order.vue`'s `downloadInvoice` read
  `response?.data` expecting an `AxiosResponse`, but the interceptor had already unwrapped it, so
  `.data` was always `undefined`. No spec exercises it, so nobody had noticed.
- **Every image upload pushed the raw envelope into the Pinia store instead of the record.** The
  image-upload branches of `createProduct` / `updateProductImage` / `updateProduct` and their user
  equivalents were typed as resolving to `Product` / `User` but actually resolved to
  `{ success, data, … }` — the same shape the JSON branches already unwrapped correctly.
- **`apiMutator<never, T>`'s double-generic type cheat is gone.**

### Removed

- **`ecommerce.cart.checked_out` is gone from `asyncapi.yaml`**, following the backend's deletion of
  the domain event bus it belonged to. The channel described an in-process `EventTarget` dispatch
  that never crossed a process boundary and never had a subscriber, so nothing was ever on the wire
  for a browser to receive — and a browser could not have subscribed to it in any case.
  `ICartCheckedOutEvent`, `ECOMMERCE_CHANNELS` and `TEcommerceChannel` leave
  `src/types/realtime.generated.ts`; nothing in this app imported them. Types regenerated with
  `npm run genasyncapi` rather than hand-edited, so the next run does not reinstate them. The SSE
  observability channels this app actually consumes are untouched.

- **`updateProductImage` and `updateUserImage`.** Both were thin wrappers over `updateProduct` /
  `updateUser` that uploaded an image on its own, and both were called by nothing but their own
  unit tests — which is what put them on the unused-surface list to begin with. The edit forms now
  carry an image field and make exactly that call themselves, so the wrappers had a choice between
  a caller and the bin. The one caller that would have justified them, a standalone avatar control
  on `Profile.vue`, needs a product decision (does a user edit their own avatar through the same
  form an admin uses for someone else's?) and is not in this change. The property their tests
  actually pinned — that `onUploadProgress` reaches the transport — is now asserted through
  `updateProduct` / `updateUser`, where the views pass it.

- **`kill:port`** (`fuser -k 4173/tcp`) and the **`pretest:e2e`** hook that called it. The old
  command killed _any_ process on the port, including another project's container port forwarder.
  `start-server-and-test` now fails loudly if `8085` is busy, which is the behaviour you want.
- **`kill:gnu` (`pkill -9 node`) and `kill:win`**, for the same reason one step further out: they
  killed every Node process on the machine, including other projects and editors. The dev server is
  stoppable by other means; everything else they hit was collateral.
- **`podman:nuke` and `docker:nuke`**, replaced by the scoped `podman:kill` / `docker:kill` above.
  `docker:nuke` ran `pkill -9 -f 'dockerd|containerd-shim'` followed by
  `sudo systemctl restart docker` — every container on the host, for every project, plus a `sudo`
  daemon restart, in a repo meant to be cloned.
- **The 16 fixtures under `tests/e2e/fixtures/`** and `cypress.config.ts`'s `fixturesFolder`.
  `cy.fixture()` appears in no spec, and their contents still described the pre-alignment mock data
  (`prod-1`, `Product Alpha`) — including an `imageUrl: null` that violates the OpenAPI schema. They
  were the copy that looked canonical.
- **`VITE_APP_DEBUG_HOME`** from `.env`, `.env-example` and the README's variable table. Its only
  consumer was dropped when `Home.vue` was reworked, so setting it did nothing; the two flags beside
  it (`VITE_APP_DEBUG_ROUTER`, `VITE_APP_DEBUG_HTTP`) are still read and still work.

### Known issues

- **The `openapi.yaml` in this repo is hand-synced with the backend's**, and the sync is only
  partially enforced: `scripts/preflight-live.ts` md5-compares the two and refuses to run on a
  mismatch, but it is wired to `pretest:e2e:live`, so nothing checks the pair on an ordinary
  contract change or in CI. The two are byte-identical as of this entry.
- **The e2e suite is still built on a dev server that compiles as it is tested.** The flakiness
  this produced is mitigated rather than cured — `defaultCommandTimeout` and `server.warmup` — and
  the residual shape is worth knowing: it is load-dependent, so the suite is green on an idle
  machine and can fail on a busy one, pointing at whichever selector happened to be first rather
  than at the compile that actually caused it. Running against `vite build` + `vite preview`
  removes the class outright; the tradeoff and the scope are in `TODO.md`. Until then, do not
  co-schedule the mutation job with the e2e job: Stryker saturates every core it is given, and
  e2e is what fails.
- **`npm run test:e2e:live` fails 5 of 63 — root cause unknown.** Three of them share one shape:
  the header renders a signed-in admin with admin-only controls, while the data on the page is
  what an anonymous visitor would get. The backend was verified correct (it returns all 5 products
  to an admin token), mock/seed parity passes, and four separate hypotheses were tested and
  rejected. The blocking clue is that the failing test **passes when instrumented** — adding a
  `cy.intercept` to observe the requests makes the symptom disappear — so it needs an observation
  method that does not perturb timing. Everything learned, everything ruled out, and the two
  Cypress gotchas that cost runs are written up in `PROBLEM_02_LIVE_E2E_FAILURES.md`. The mock
  profile is unaffected at 57/57, so CI is not impacted.
- The dockerised app forwards none of the Faro or Umami variables into the container, so
  observability is silent under `compose up` even though `VITE_API_MOCK_ENABLED` now correctly
  defaults to using the real, paired backend.
