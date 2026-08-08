# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
