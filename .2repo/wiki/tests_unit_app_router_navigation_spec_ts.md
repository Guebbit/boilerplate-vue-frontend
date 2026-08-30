# tests/unit/app/router/navigation.spec.ts

## Purpose

Unit tests (Vitest) for the two navigation helpers exported by `src/app/router/navigation`: `loginContinueTo` (decides where to send a user after a login bounce) and `signInLocation` (resolves a sign-in route or falls back to Home when the account module is absent). The file exists because `loginContinueTo`'s error-page branch was previously only exercised incidentally by other specs, and `signInLocation` had no coverage at all.

## Key elements

- **`describe('loginContinueTo')`** — five cases pinning: normal target → `continue` query; error-page target → no `continue`; no-locale → `params: undefined`; error-page + no-locale → neither; error word in a non-leading path segment still matches (`includes`, not `startsWith`).
- **`describe('signInLocation')`** — three cases: sign-in route registered → delegates to `loginContinueTo`; no sign-in route → falls back to `{ name: 'Home', params: { locale } }`; fallback with no locale → `params: undefined`.
- **`routerWith(names: string[])`** — inline helper that returns a minimal `{ hasRoute }` object for injecting route names into `signInLocation`.
- **Imports** — `loginContinueTo`, `SIGN_IN_ROUTE_NAME`, `signInLocation` from `@/app/router/navigation`; `describe`, `expect`, `it` from `vitest`.

## Relationships

No graph neighbors are recorded. The sole runtime dependency is the import of the three symbols from `@/app/router/navigation`.

## Notes

- The `params: undefined` vs `params: {}` distinction is intentional and tested: an empty object makes vue-router try to match a locale-less `Login` against a `/:locale` parent and fail.
- The "error word anywhere in the path" test is a regression pin: tightening the internal check to `startsWith` would silently re-introduce the bounce-back-to-error bug.
- `signInLocation` is called with a mock router, not a real one; the tests exercise the branching logic, not vue-router resolution.
