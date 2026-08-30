# tests/unit/app/guards/authentications.spec.ts

## Purpose
Unit tests for the two exported functions in `@/app/guards/authentications` (`canAccess` and `enforceRouteAccess`). Validates the full access-control truth table and the redirect/notification behavior when a visitor is denied a route.

## Key elements
- **`canAccess` truth-table tests** — `it.each` over all 12 combinations of route access level (`public`, `guest`, `auth`, `admin`) × visitor type (guest, user, admin) to assert the boolean decision.
- **`enforceRouteAccess` behavior tests** — verify the returned redirect target, the notification key passed to `addMessage`, and the "continue" param preservation for guests redirected to login.
- **`route(access?)` helper** — wraps `asStub<RouteLocationNormalized>` with just the fields the guard reads: `fullPath`, `params.locale`, and `meta.access`.
- **`visitorStanding` reactive object** — shared mutable state (`isAuth`, `isAdmin` refs) injected via the `pinia` mock so individual tests can flip permission levels without re-mocking.
- **Mocks** — `useSessionStore`, `storeToRefs`, `useNotificationsStore.addMessage`, and `translate` (identity function) are all stubbed to isolate the guard logic.

## Relationships
- **`tests/support/stub.ts`** — provides `asStub`, used by the `route()` helper to build a minimally-shaped `RouteLocationNormalized` without a real router instance.

## Notes
- The `translate` mock is an identity function on purpose: assertions compare against the i18n dictionary **key** (e.g. `'navigation.error-not-logged'`) rather than a locale-dependent string, so the tests are locale-agnostic.
- The truth-table comment explicitly notes that the rows nobody expects (e.g. admin hitting a guest-only page) are the high-risk cases; all 12 rows are covered rather than a cherry-picked subset.
- `visitorStanding` is reset in `beforeEach`; individual tests mutate its refs to simulate different permission levels without re-invoking the module factory.
- The "keep blocked path as continue target" test uses `JSON.stringify` to confirm the original `fullPath` (`/en/target`) appears somewhere in the redirect object, rather than asserting a specific param key.
