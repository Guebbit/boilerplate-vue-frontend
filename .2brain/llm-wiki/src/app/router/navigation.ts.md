---
source: src/app/router/navigation.ts
sha256: 68cd1cba60f208a7be3c706dd02038236e3c90ceb21f6e1dbdb399eaf65b3983
generated_at: 2026-10-02T11:48:47.118817+00:00
model: ollama:qwen3.8:27b
---

# src/app/router/navigation.ts

## Purpose

Defines sign-in/sign-up route name constants and location-builder helpers used by the app shell to redirect unauthenticated visitors to login while preserving their intended destination. The route names are plain strings (not typed route names) because the account module that declares them may be excluded from a given build.

## Key elements

- **`SIGN_IN_ROUTE_NAME`** (`'Login'`) — String name of the route the account module declares for sign-in. Not type-checked; callers must verify existence via `router.hasRoute`.
- **`SIGN_UP_ROUTE_NAME`** (`'Signup'`) — Same contract as above, for the sign-up route.
- **`loginContinueTo(path, locale?)`** — Returns a location object targeting `SIGN_IN_ROUTE_NAME` with `?continue=<path>` so the user can be sent back after authenticating. Omits the `continue` query param when `path` contains `'error'` (avoids redirecting back to an error page). Optionally forces a `locale` param.
- **`signInLocation(router, path, locale?)`** — Safe wrapper around `loginContinueTo`: checks `router.hasRoute(SIGN_IN_ROUTE_NAME)` first; if the route is absent (account module excluded from the build), returns a `Home` location instead to avoid an unexplained aborted navigation.

## Notes

- **No typed route names.** Because the account module is optional, these constants are untyped strings. Any caller that navigates using them must guard with `router.hasRoute` (as `signInLocation` does). Forgetting this check causes a silent navigation abort when the module is missing.
- **`SIGN_UP_ROUTE_NAME` is declared but not used by any helper in this file.** It exists solely as a shared constant for other modules to reference.
- The `path.includes('error')` check in `loginContinueTo` is a heuristic substring match, not a route-name comparison.
