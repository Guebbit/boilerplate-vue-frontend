# src/app/router/navigation.ts

## Purpose

Defines the sign-in and sign-up route name constants and provides helpers for building a "continue here after login" redirect location. It exists as a thin, dependency-free bridge so that the app shell can reference authentication routes without importing the (potentially absent) account module.

## Key elements

- **`SIGN_IN_ROUTE_NAME`** (`'Login'`) — Plain-string route name for the sign-in page. Not a typed route; the account module that declares it may be excluded from a build.
- **`SIGN_UP_ROUTE_NAME`** (`'Signup'`) — Plain-string route name for the sign-up page. Same optional-module caveat.
- **`loginContinueTo(path, locale?)`** — Returns a router location object named `SIGN_IN_ROUTE_NAME` with a `?continue=<path>` query param so the user is sent back after auth. Omits the `continue` param when the path contains `'error'`.
- **`signInLocation(router, path, locale?)`** — Guarded wrapper around `loginContinueTo`. Calls `router.hasRoute(SIGN_IN_ROUTE_NAME)` first; if the route is unregistered (account module absent) it falls back to a `{ name: 'Home' }` location instead of pushing to a nonexistent route.

## Notes

- Route names are intentionally **untyped strings**, not generated route literals. The account module may be removed from `src/modules.ts`, so nothing at compile time guarantees the names resolve. Every caller must check `router.hasRoute(...)` before navigating.
- `signInLocation` accepts a minimal structural type (`{ hasRoute: (name: string) => boolean }`) rather than a concrete router class, keeping the module free of any router dependency.
- The `'error'` substring check in `loginContinueTo` is a heuristic, not an exact route match. Any path that merely contains the word "error" will skip the `continue` param.
- `SIGN_UP_ROUTE_NAME` is exported but has **no** corresponding helper in this file (unlike `loginContinueTo` for sign-in). Callers are expected to manage sign-up navigation inline with their own `hasRoute` guard.
