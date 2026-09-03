# tests/unit/app/guards/authentications.spec.ts

## Purpose

Unit tests for the route-authentication guard functions `canAccess` and `enforceRouteAccess` in `@/app/guards/authentications`. Verifies the full access-level truth table and the redirect/notification behavior when a visitor is denied a route.

## Key elements

- **`describe('canAccess')`** — Exhaustive `it.each` over all 12 combinations of `RouteAccess` (undefined, `'guest'`, `'auth'`, `'admin'`) × visitor standing (guest, user, admin), asserting the boolean result of the pure function.
- **`describe('enforceRouteAccess')`** — Scenario tests for the guard's side effects:
  - Permitted navigation returns `undefined` with no notification.
  - Guest hitting an auth/admin route → redirected to `Login` (with locale param) and a `'navigation.error-not-logged'` notification; the original `fullPath` is preserved in the redirect so login can continue back.
  - Authenticated non-admin hitting an admin route → redirected to `Home` with `'navigation.error-forbidden'` (no continue target, to avoid a login loop).
  - Authenticated visitor hitting a guest-only route → redirected to `Home` with `'navigation.error-already-logged'`.
  - Admin on an admin route → passes through silently.
- **`route(access?)` helper** — Builds a minimal `RouteLocationNormalized` stub (via `asStub`) carrying `fullPath`, `params.locale`, and optional `meta.access`.
- **Mock setup** — `vi.mock` replaces the session store, `pinia/storeToRefs` (returns a mutable `visitorStanding` ref pair), the notifications store (captures calls via `addMessageMock`), and `translate` (identity function so assertions match i18n keys, not locale-specific strings).

## Relationships

- **`tests/support/stub.ts`** — Provides `asStub<T>`, a typed helper used to cast partial objects into full interface shapes (here, `RouteLocationNormalized`).

## Notes

- The i18n mock is deliberately identity (`key => key`) so test assertions reference stable dictionary keys rather than translations that shift with locale.
- `visitorStanding` is a module-level `ref` pair whose values are mutated in individual tests and reset in `beforeEach`; this is the mechanism by which `storeToRefs` (mocked) feeds the guard under test.
- The `canAccess` table is intentionally exhaustive (comment in-file notes that "rows nobody thinks to test" are where bugs hide); adding a new `RouteAccess` level or visitor flag requires extending the `it.each` array.
