---
source: src/app/router/navigation.ts
sha256: f777b5f20d89931339f87a3e7970e70b71e81eb4ed6ff1cb803f3f4efdd8f201
signature: c6f502893ee85fcb87fb134313ac8bdee0b48e4de461f4f98bb4950716450688
generated_at: 2026-11-10T02:56:01.891494+00:00
model: ollama:qwen3.8:27b
---

# src/app/router/navigation.ts

## Purpose

Defines the route-name constants and helper functions the app shell uses to send unauthenticated visitors to the sign-in or sign-up page while preserving the page they were on. The route names are plain strings (not typed) because the account module that owns them is optional at build time; every consumer must guard with `router.hasRoute` before navigating.

## Key elements

- **`SIGN_IN_ROUTE_NAME` / `SIGN_UP_ROUTE_NAME`** — String literals (`'Login'`, `'Signup'`) naming the routes declared by the optional account module. Nothing type-checks them.
- **`authContinueTo(name, path, locale?)`** *(private)* — Builds a route location. Attaches `?continue=<path>` unless `path` is `undefined` or contains `'error'`. Optionally pins a `locale` param.
- **`returnPathOf(route)`** — Decides what path to pass as the `continue` value: `undefined` on Home, the full path on any other non-auth page, or the existing `?continue` value when already on an auth page (to avoid bouncing between siblings).
- **`loginContinueTo(path, locale?)`** / **`signUpContinueTo(path, locale?)`** — Thin wrappers around `authContinueTo` for the two auth routes.
- **`signInLocation(router, path, locale?)`** — `loginContinueTo` with a fallback: returns a Home location when `router.hasRoute(SIGN_IN_ROUTE_NAME)` is false, so builds without the account module don't abort navigation.

## Relationships

None recorded in the dependency graph.

## Notes

- Route names are **untyped strings** by design. Always call `router.hasRoute(...)` before navigating; a missing route aborts the transition silently.
- `authContinueTo` strips the `continue` param when the path contains `'error'` — error pages are never a valid redirect target.
- On Home, `returnPathOf` returns `undefined` intentionally: carrying a `?continue=/` would override the saved-locale landing that `usePostLoginRedirect` applies.
- The same-origin / safety check for the `continue` value lives on the **landing** side (`usePostLoginRedirect`), not in this file. Callers here do not validate the path.
- `signInLocation` is the only export that takes a `router` instance; the others are pure.
