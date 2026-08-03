# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

A correctness pass over the HTTP layer, the mock data and port allocation, driven by running this
app against its paired backend (`boilerplate-node-api-mongodb-mongoose`) rather than only against its
own mocks.

### ⚠ Breaking

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

### Added

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

### Changed

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
- **`tests/e2e/specs/products.cy.ts`** asserts on the real seed data and ObjectIds. The expected row
  count went from 3 to 5 — see _Known issues_.
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

- **`kill:port`** (`fuser -k 4173/tcp`) and the **`pretest:e2e`** hook that called it. The old
  command killed _any_ process on the port, including another project's container port forwarder.
  `start-server-and-test` now fails loudly if `8085` is busy, which is the behaviour you want.

### Known issues

- The `openapi.yaml` in this repo is hand-synced with the backend's and is currently behind by the
  `/observability/load-test` path and its two schemas.
- The MSW product-list handler does not replicate the backend's admin-scoped `active` / `deletedAt`
  filtering, so it returns all five fixtures regardless of caller — which is why `products.cy.ts`
  now expects 5 rows where a live backend would return fewer.
- No test covers the 401 → refresh → retry path, which is precisely why the bug above went unnoticed.
- The six multipart calls above go through `orvalMutator` but still build their requests by hand
  rather than calling the generated client, so a contract change does not produce a type error
  there. Orval's `override.formData` would cover all but `updateProductImage`, which needs
  `onUploadProgress`.
- `tests/mocks/generated.ts` is regenerated by every `npm run genapi` and imported by nothing.
- `tests/e2e/fixtures/**` is read by no spec and still describes the pre-alignment mock data.
- The dockerised app defaults `VITE_API_MOCK_ENABLED` to `true` and forwards none of the Faro or
  Umami variables, so `compose up` on both repos produces two stacks that ignore each other.
