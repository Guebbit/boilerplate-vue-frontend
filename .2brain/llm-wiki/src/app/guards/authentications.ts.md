---
source: src/app/guards/authentications.ts
sha256: 1a6b2a9342029edf2e5c8bad6c5162e73b2e153eba5b1a4d42d7d4f4bc0ed1ca
signature: 6be61d9ea95718e8eb295858a16af20c8b2554b880d2f50e6a75e8d2dbfb03ba
generated_at: 2026-11-10T02:54:31.525272+00:00
model: ollama:qwen3.8:27b
---

# src/app/guards/authentications.ts

## Purpose

Single source of truth for route access control. Provides the `canAccess` predicate (consumed by both the router guard and the navigation component so reachable pages and visible links can never disagree), a silent session-restore hook for post-reload hydration, and the global `beforeEach` guard that enforces `meta.access` + `meta.can` on every navigation.

## Key elements

- **`RouteAccess`** (`'guest' | 'auth' | 'open'`) — the three standing levels a route may require. Anything more specific is expressed via `meta.can`, not a fourth level.
- **`RoutePermission`** — a typed `[ActionOn<TSubject>, TSubject]` tuple (CASL pair) so permission checks are compile-time-checked against the generated vocabulary.
- **`RouteMeta` augmentation** — declares `access`, `can`, `title`, `customHero`, `centered` on vue-router's `RouteMeta`. The value of `access` is type-checked; a misspelled *key* (e.g. `acces`) is not and is caught only by `tests/routes.spec.ts`.
- **`canAccess(meta, visitor)`** — the single predicate. ANDs the standing (`access`) with the permission (`can`). `open` lets anonymous visitors through and only queries `can` for signed-in visitors.
- **`restoreSessionIfNeeded()`** (internal) — no-op if already authenticated or no `isAuth` cookie; otherwise loads the deployment mode then restores from cookies. Always resolves.
- **`tryRestoreAuth()`** — exported guard hook. Restores the session, then loads the viewer (abilities) if a session exists but the viewer is unknown. Always resolves to `void`; failures are swallowed.
- **`enforceRouteAccess(to, router)`** — the global guard. Calls `canAccess`; on denial, notifies the visitor via the notifications store and redirects (Home for guests-only/forbidden, `signInLocation` for anonymous). Checks `router.hasRoute` before pushing a login route to avoid crashing on builds without an `account` module.

## Relationships

- **`@/infrastructure/session`** (`useSessionStore`, `ActionOn`, `PermissionSubject`, `PermissionAction`) — reads `isAuth`, `hasSession`, `viewer`, and the `can` ability predicate; drives restore logic.
- **`@/app/router/navigation`** (`signInLocation`) — resolves the login redirect target while preserving the intended destination as a `continue` param.
- **`@guebbit/vue-toolkit`** (`useNotificationsStore`) — posts user-facing messages on redirect.
- **`@/i18n`** (`translate`) — localizes redirect messages and page titles.
- **`vue-router`** — augments `RouteMeta`; consumes `RouteLocationNormalized` in the guard.
- **`AppNavigation`** (caller, not imported here) — invokes `canAccess` directly to filter the nav tree, keeping it in lockstep with the guard.

## Notes

- `session.can` is a plain function, not a ref. It is read off the store instance (not via `storeToRefs`) so it stays bound to the live abilities array.
- `tryRestoreAuth` is designed to run *before* `enforceRouteAccess` in the same `beforeEach`; the viewer is loaded only on first navigation (subsequent refreshes happen on login, token refresh, or 403 via `http/refresh.ts`).
- The access model is deliberately flat: there is no role hierarchy. A translator is not "a lesser admin"; permission is always the `[action, subject]` pair evaluated against server-published CASL rules.
- `meta.can` implies a session: an anonymous visitor is refused before abilities are consulted, *except* under `access: 'open'` where guests pass and only signed-in visitors are checked.
- The guard is mounted globally (one `beforeEach`), not as per-route `beforeEnter`, so the route record is the single place a screen's requirement is declared.
