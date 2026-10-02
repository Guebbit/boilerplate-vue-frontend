---
source: src/app/guards/authentications.ts
sha256: 0d5c631445a897032b790647fe0553c8013e0939e5cc8ef74e65b4693fb3e724
generated_at: 2026-10-02T11:46:53.032961+00:00
model: ollama:qwen3.8:27b
---

# src/app/guards/authentications.ts

## Purpose

Defines the single source of truth for route access control. It exports `canAccess`, the one predicate that both the router guard and the navigation component call, ensuring "what is reachable" and "what is shown" can never drift apart. It also handles silent session restoration before the access check runs.

## Key elements

- **`RouteAccess`** (`'guest' | 'auth'`) — the two access levels a route can require. Absent means public.
- **`RoutePermission`** (`readonly [PermissionAction, string]`) — the CASL-style `[action, subject]` pair a route may require via `meta.can`.
- **`RouteMeta` augmentation** — declares `access`, `can`, `title`, `customHero`, and `centered` on vue-router's `RouteMeta` so route records carry their requirements and layout hints.
- **`canAccess(meta, visitor)`** — pure predicate: ANDs `access` (standing) and `can` (permission). A `meta.can` rule implicitly requires auth. Returns `true`/`false` with no side effects.
- **`tryRestoreAuth()`** — guard-callable function that restores the token (if `isAuth` cookie exists) and then loads the viewer, all silently. Resolves `void`; never rejects.
- **`enforceRouteAccess(to, router)`** — the actual `beforeEach` guard. Calls `canAccess`; on failure redirects (Home, sign-in, or sign-in-with-continue) and pushes a localized notification explaining the redirect.
- **`restoreTokenIfNeeded`** (module-private) — refreshes the access token via the session store, guarded by cookie presence to skip the call for guests.

## Relationships

No graph neighbors are listed for this file. It imports from `@/infrastructure/session`, `@guebbit/vue-toolkit`, `@guebbit/js-toolkit`, `@/app/router/navigation`, and `@/i18n`, but those edges are not reflected in the dependency graph provided.

## Notes

- `canAccess` is deliberately a pure function (no store calls, no I/O) so it can be unit-tested in isolation and reused in non-guard contexts (e.g., `AppNavigation`).
- `enforceRouteAccess` reads `session.can` directly off the store rather than via `storeToRefs`, because `storeToRefs` drops actions and the method must stay bound to the live CASL abilities.
- `tryRestoreAuth` is safe to call on every navigation: once `store.viewer` is set, the `loadViewer` branch is skipped, making it a first-navigation cost only.
- A misspelled `meta.access` **key** (e.g. `acces`) will type-check silently (vue-router's `RouteMeta` is open) and render the route public. The only safety net is each module's `tests/routes.spec.ts` pinning the expected value.
- `signInLocation` is used (not called directly here) to check `router.hasRoute('Login')` before redirecting, because some product builds ship no `account` module.
- The file is designed to be mounted as a **global** `beforeEach` (not per-route `beforeEnter`), running after `tryRestoreAuth` in the same guard chain.
