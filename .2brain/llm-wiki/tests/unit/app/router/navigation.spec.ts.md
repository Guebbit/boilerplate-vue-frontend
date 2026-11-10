---
source: tests/unit/app/router/navigation.spec.ts
sha256: 5380fb3a4127adc6beb20e3720fd2ca7bdff8fce1ab6ec2c12286c88e81eb4ca
signature: f01b4909460ed26876c799829a2aa18ffe3dc923a9ccf6a3c8755e94074d740e
generated_at: 2026-11-10T07:49:50.646663+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/router/navigation.spec.ts

## Purpose

Unit tests for the four navigation helpers exported by `@/app/router/navigation`: `loginContinueTo`, `signUpContinueTo`, `returnPathOf`, and `signInLocation`. The suite exists to pin the error-page branch (a visitor should not be bounced back to the error they just recovered from) and the `params: undefined` contract that keeps vue-router from mis-resolving locale-less route names.

## Key elements

- **`describe('loginContinueTo')`** — Verifies that a normal target is stored as `query.continue`, that an error-path target (`includes('error')` anywhere in the path) drops the `continue` key, and that a missing locale yields `params: undefined` rather than `{}`.
- **`describe('signUpContinueTo')`** — Mirrors the login tests for the `Signup` route name; also covers the `undefined` target case for both login and signup.
- **`describe('returnPathOf')`** — Asserts the path the app bar's auth links should remember: the page itself on ordinary routes, `undefined` on Home or a bare auth page, the `continue` value on an auth page that arrived with one, and `undefined` when `continue` is an array (repeated param).
- **`describe('signInLocation')`** — Guards against a build where the sign-in route is absent. Uses a minimal `routerWith` stub that exposes only `hasRoute`. Confirms the fallback points to `Home` with the locale (or `undefined` params when no locale is supplied).
- **`SIGN_IN_ROUTE_NAME`** (imported) — The route-name string the `signInLocation` guard checks; owned by the account module, not type-checked.
- **`routerWith(names)`** (local helper) — Builds a one-method router stub (`hasRoute`) for `signInLocation` tests.

## Relationships

- **`src/modules/shop-tasks/tests/notices.spec.ts`** — Appears as a graph neighbor but no direct import, shared fixture, or runtime coupling is visible in this file. The relationship is likely a shared dependency on the `@/app/router/navigation` module or a test-utility convention; no interaction is exercisable from the source shown here.

## Notes

- The error-page check is `path.includes('error')`, **not** `startsWith`. A dedicated test (`/en/admin/error/500`) pins this so a future tightening to `startsWith` would be caught.
- `params: undefined` is deliberate, not an oversight: an empty `{}` object causes vue-router to attempt a locale-less `Login` resolution, which the `/:locale` parent cannot match.
- `signUpContinueTo` and `loginContinueTo` share the same error-page branch logic but produce different `name` values (`'Signup'` vs `'Login'`); both are tested independently to prevent accidental coupling.
- The `signInLocation` stub only implements `hasRoute`; any future code that calls additional router methods in the fallback path will break these tests, which is the intended guard.
