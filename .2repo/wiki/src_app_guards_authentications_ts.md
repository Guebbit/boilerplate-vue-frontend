# src/app/guards/authentications.ts

## Purpose

Centralises all route-level access control logic so that the router guard and the navigation UI share a single source of truth for "who may see/use this route." It also handles silent session rehydration (token refresh + viewer load) before any access decision is made, ensuring a stale page load never misclassifies an authenticated user as a guest.

## Key elements

- **`RouteAccess`** (`'guest' | 'auth' | 'admin'`) — the three access tiers a route can require. Absent value means public.
- **`RouteMeta` augmentation** — extends Vue Router's `RouteMeta` with `access?: RouteAccess` and `title?: string`, giving compile-time checking of `meta.access` and a dictionary key for `document.title` (WCAG 2.4.2).
- **`canAccess(access, visitor)`** — the single boolean predicate. Called by both `enforceRouteAccess` (allow/deny) and `AppNavigation` (show/hide link) so they can never disagree.
- **`restoreTokenIfNeeded`** (private) — if the `isAuth` cookie exists but `accessToken` is empty, calls `store.refreshToken()` once. Swallows failures.
- **`tryRestoreAuth()`** — public guard helper: restores the token (if needed), then calls `store.loadViewer()` so `isAuth`/`isAdmin` are populated. Always resolves to `void`; never redirects.
- **`enforceRouteAccess(to)`** — the actual navigation guard. Reads `meta.access`, calls `canAccess`, and on denial redirects with a localized notification (already-logged-in, not-logged-in, or forbidden) that preserves the user's locale.

## Relationships

No graph neighbors are currently tracked for this file. At runtime it imports from `@/infrastructure/session` (Pinia store), `@guebbit/vue-toolkit` (notifications), `@guebbit/js-toolkit` (cookie helper), `@/app/router/navigation` (`loginContinueTo`), and `@/infrastructure/i18n` (`translate`).

## Notes

- `tryRestoreAuth` and `enforceRouteAccess` are designed to run in the **same** `beforeEach` guard, in that order. `enforceRouteAccess` reads reactive state that `tryRestoreAuth` populates — calling them out of order will misclassify visitors.
- The `isAuth` **cookie** (not the in-memory token) is the signal that a session ever existed on this browser. If the cookie is absent, no refresh attempt is made, saving a network round-trip for anonymous traffic.
- `enforceRouteAccess` returns `undefined` to allow navigation (matching `NavigationGuardReturn`) rather than `true`; the `.then(() => undefined)` in `tryRestoreAuth` exists for the same reason.
- Guest-route redirects (e.g. an authenticated user hitting `/login`) do **not** preserve a `continue` target, because the user is already where they need to be. Only the anonymous-on-protected case uses `loginContinueTo`.
