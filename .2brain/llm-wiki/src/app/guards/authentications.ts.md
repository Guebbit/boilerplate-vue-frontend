---
source: src/app/guards/authentications.ts
sha256: 1d668048eaa3ac9b61c9036be931039cdebb828ef5925dfac5a03789beec26fe
generated_at: 2026-10-17T00:06:12.098144+00:00
model: ollama:qwen3.8:27b
---

# src/app/guards/authentications.ts

## Purpose

Central route-access-control module. It defines the access-level and permission types every route declares in `meta`, provides the single `canAccess` predicate shared by both the router guard and the navigation component, and handles silent session restoration after a page reload — all so that "what is reachable" and "what is shown" can never diverge.

## Key elements

- **`RouteAccess`** (`'guest' | 'auth' | 'open'`) — the standing a route requires. `guest` excludes authenticated visitors; `auth` requires one; `open` admits both and delegates to `meta.can` for the signed-in case only.
- **`RoutePermission`** (`readonly [action, subject]`) — the CASL-style pair a route needs. A pair (not a key string) because the client evaluates rules against a subject type; the subject is a plain string to avoid duplicating the closed list from `shared/authorization-keys.yaml`.
- **`RouteMeta` augmentation** — declares `access`, `can`, `title`, `customHero`, `centered` on vue-router's `RouteMeta` so values are type-checked (a misspelled *value* is a compile error; a misspelled *key* is caught by each module's `routes.spec.ts`).
- **`canAccess(meta, visitor)`** — the single access predicate. ANDs the standing check with the permission check; `meta.can` implies an authenticated caller. Called by both `enforceRouteAccess` and `AppNavigation`.
- **`tryRestoreAuth()`** — exported. Silently rehydrates the session (reads mode config, restores from cookies, loads the viewer if unknown) and always resolves to `void`. Intended as the first half of a global `beforeEach`.
- **`enforceRouteAccess(to, router)`** — exported. The second half of `beforeEach`. Uses `canAccess` to decide allow/redirect; notifies the visitor via the notifications store and redirects to Home or to sign-in (preserving the intended `fullPath` as a `continue` target) with locale-aware routing.

## Relationships

No graph neighbors are recorded. The file's visible imports pull in `useSessionStore` / `PermissionAction` from `@/infrastructure/session`, `signInLocation` from `@/app/router/navigation`, `useNotificationsStore` from `@guebbit/vue-toolkit`, `getCookie` from `@guebbit/js-toolkit`, and `translate` from `@/i18n`. Downstream, `AppNavigation` and the router's global `beforeEach` both call `canAccess`; `enforceRouteAccess` depends on `signInLocation` for the conditional login redirect.

## Notes

- `canAccess` is intentionally the *only* place the access rule is expressed. Duplicating the logic in the nav or the guard is the exact bug this module was created to prevent.
- `meta.can` implies authentication: an anonymous visitor is refused before `visitor.can` is ever consulted, *except* on `access: 'open'` routes where the anonymous passes through and the permission is checked only for signed-in visitors.
- The `isAuth` cookie is the gate for attempting a restore; its absence short-circuits to `Promise.resolve()` to avoid a network call on every guest page load.
- `storeToRefs` is used for `isAuth` (a ref) but **not** for `can` (a store action); `can` is read off the store instance directly so it stays bound to the live abilities array.
- `enforceRouteAccess` checks `router.hasRoute` (via `signInLocation`) before redirecting to sign-in, because a build without the `account` module ships no `Login` route and pushing an unresolvable name would throw inside vue-router.
- A typo in a `meta.can` subject string makes the screen **unreachable** (no rule matches → fail-closed). Each module's `tests/routes.spec.ts` pins the expected pair to catch this at test time.
