# src/app/guards/authentications.ts

## Purpose

Central route-access-control module. It defines the single `canAccess` predicate that both the router guard and the navigation bar share, so "can reach" and "can see" can never drift apart. It also provides the session-restore step (`tryRestoreAuth`) that rehydrates token + viewer before any access check runs.

## Key elements

- **`RouteAccess`** — union type `'guest' | 'auth' | 'admin'`; the three access levels a route may declare.
- **`RouteMeta` augmentation** — extends vue-router's `RouteMeta` with `access?: RouteAccess` and `title?: string`, giving compile-time typo protection on `meta.access`.
- **`canAccess(access, visitor)`** — pure predicate: given a route's requirement and the visitor's `{ isAuth, isAdmin }`, returns whether entry is allowed. This is the *only* place the rule is expressed.
- **`restoreTokenIfNeeded()`** *(internal)* — checks the `isAuth` cookie, calls `store.refreshToken()` if a token is missing but a cookie exists; always resolves.
- **`tryRestoreAuth()`** — exported guard helper; runs `restoreTokenIfNeeded` then `store.loadViewer()` (if a token is present) and resolves to `void`. Safe to call on public routes.
- **`enforceRouteAccess(to)`** — exported guard; reads `isAuth`/`isAdmin` from the session store, calls `canAccess`, and on denial adds a translated notification and returns a redirect location (Home, login-with-`continue`, or Home again for non-admins).

## Relationships

- **`src/infrastructure/stores/session.ts`** — imported as `useSessionStore`; the sole source of truth for `accessToken`, `isAuth`, `isAdmin`, `refreshToken()`, and `loadViewer()` used throughout this file.
- **`src/app/router/index.ts`** — mounts `tryRestoreAuth` and `enforceRouteAccess` as the global `beforeEach` pair; this file is the logic the router delegates to on every navigation.
- **`src/infrastructure/http/index.ts`** — indirect dependency: the session store's `refreshToken` call ultimately issues its request through this HTTP layer.
- **`package.json`** — declares the runtime dependencies this file relies on (`pinia`, `vue-router`, `@guebbit/vue-toolkit`, `@guebbit/js-toolkit`).
- **`docs/tools/security.md` / `docs/theory/layers.md`** — document the auth flow and the layering convention (app-layer guards → infrastructure stores → HTTP) that this file exemplifies.

## Notes

- `canAccess` receives a plain `{ isAuth, isAdmin }` object, **not** the store itself. This keeps the predicate pure and trivially testable, and lets `AppNavigation` call it without a pinia instance.
- `tryRestoreAuth` intentionally swallows all errors (`.catch(() => undefined)`). A failed refresh must never block navigation; the visitor simply proceeds as a guest.
- `enforceRouteAccess` reads `storeToRefs` values *after* `tryRestoreAuth` has already run in the same `beforeEach` chain — it never triggers a fetch itself.
- The `guest` redirect (authenticated user hitting a login/signup page) goes to **Home**, not to the login page, because the user is already where the login page would send them.
- The `title` meta field is not consumed here; it is read post-navigation to set `document.title` (WCAG 2.4.2) and feed the route announcer.
