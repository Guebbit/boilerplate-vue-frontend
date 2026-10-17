---
source: tests/unit/app/router/navigation.spec.ts
sha256: 5380fb3a4127adc6beb20e3720fd2ca7bdff8fce1ab6ec2c12286c88e81eb4ca
generated_at: 2026-10-17T02:32:21.007699+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/router/navigation.spec.ts

## Purpose

Unit tests for the four navigation helpers exported by `@/app/router/navigation`. The file exists to pin down branch behavior that no other spec exercised: the error-page exclusion in `continue` query building, the locale-optional param shape, the auth-page "don't remember your sibling" rule in `returnPathOf`, and the guard in `signInLocation` that falls back to Home when the sign-in route is absent from the build.

## Key elements

- **`describe('loginContinueTo')`** — 5 cases: normal path gets `?continue=`, error-page paths (including nested `/en/admin/error/500`) drop it, missing locale yields `params: undefined` (not `{}`), and the combination of both omissions.
- **`describe('signUpContinueTo')`** — 3 cases mirroring the login behavior plus the `undefined`-target short-circuit (returns `{ name: 'Signup', params: undefined }` with no query).
- **`describe('returnPathOf')`** — 6 cases: ordinary route returns its own `fullPath`; Home returns `undefined`; Login/Signup return their `continue` query value when present; bare auth pages and array-valued `continue` queries return `undefined`.
- **`describe('signInLocation')`** — 3 cases using a `routerWith(names)` helper (a minimal `{ hasRoute }` stub). Verifies delegation to `loginContinueTo` when the route exists, and a Home fallback (with or without locale param) when it does not.
- **`routerWith`** — local helper that builds a throwaway router object whose `hasRoute` checks membership in a supplied array.

## Notes

- The `params: undefined` vs `params: {}` distinction is load-bearing: vue-router cannot resolve a locale-less `Login` under a `/:locale` parent if an empty object is passed. Tests pin this explicitly.
- The error-page match uses `String.includes` (so `/en/admin/error/500` is covered). A test comments that tightening to `startsWith` would silently reintroduce the bounce-to-error bug.
- `signInLocation` is tested with a hand-rolled `hasRoute` stub rather than the real router, because its contract is purely "does this route name exist in the current build."
- `SIGN_IN_ROUTE_NAME` is imported from the source module (not hard-coded), keeping the tests coupled to the canonical route-name constant.
