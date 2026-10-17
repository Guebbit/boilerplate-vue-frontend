---
source: src/app/router/navigation.ts
sha256: f777b5f20d89931339f87a3e7970e70b71e81eb4ed6ff1cb803f3f4efdd8f201
generated_at: 2026-10-17T00:06:55.712453+00:00
model: ollama:qwen3.8:27b
---

# src/app/router/navigation.ts

## Purpose

Provides route-name constants and location-builder helpers for the app shell's auth entry points ("Log in" / "Sign up"). It centralises the `?continue=` mechanism so that an unauthenticated visitor is sent back to their original destination after authenticating, while remaining safe when the account module is absent from the build.

## Key elements

- **`SIGN_IN_ROUTE_NAME`** / **`SIGN_UP_ROUTE_NAME`** — Plain-string route names (`'Login'`, `'Signup'`) declared by the account module. Not typed because the module may be excluded from a build; callers must guard with `router.hasRoute`.
- **`authContinueTo`** (module-private) — Builds a `{ name, params, query }` location for an auth route, attaching `?continue=<path>` when a valid `path` is supplied. Suppresses the continue param when `path` is `undefined` or contains `'error'`.
- **`returnPathOf(route)`** — Given the current route, returns the path to remember: `undefined` on Home, the route's `fullPath` on non-auth pages, or the route's own `?continue=` query value when already on an auth page.
- **`loginContinueTo(path, locale?)`** / **`signUpContinueTo(path, locale?)`** — Thin public wrappers over `authContinueTo` bound to each route name.
- **`signInLocation(router, path, locale?)`** — Returns a sign-in location, or falls back to a Home location when `router.hasRoute(SIGN_IN_ROUTE_NAME)` is false, so a build without the account module still navigates successfully.

## Relationships

No graph neighbours are recorded for this file. It is a leaf module: it imports nothing and is consumed by the app shell (app bar, post-login redirect hook `usePostLoginRedirect`).

## Notes

- **No validation of `continue` here.** The landing side (`usePostLoginRedirect`) is responsible for the same-origin / relative-path check. This file only *carries* the value.
- **Error-page exclusion** is a simple substring match on `'error'` in the path — not a regex or route-name check.
- **Locale handling:** passing `locale` sets it as a route param; omitting it lets the router keep whatever locale it has already resolved. The "degrade to Home" path in `signInLocation` also forwards the optional locale.
- **Auth-page symmetry:** on an auth page, `returnPathOf` returns the *existing* `?continue=` rather than the sibling auth route, preventing an authenticated user from landing on a guests-only page.
- Route names are deliberately untyped strings to avoid a hard dependency on the account module at compile time.
