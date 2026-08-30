# tests/unit/app/router/router.spec.ts

## Purpose

Unit tests for the router's own behaviour — locale redirect, 404 catch-alls, global auth-restore ordering, error→redirect mapping, and that every shell-owned route record declares its `meta` requirements (title, access). Auth-enforcement logic is explicitly mocked out; this file verifies that enforcement is *attached* and correctly ordered, not that it decides correctly (that lives in `authentications.spec.ts`).

## Key elements

- **`loadRouter()`** — resets the module registry, dynamically imports `@/app/router`, pushes `/`, awaits `isReady()`, and returns the fresh router instance. Used by every test case.
- **`failNavigationWith(error)`** — helper that navigates to a non-Home route, makes the next `enforceRouteAccess` call throw the given error, then waits for the router to settle on a different route (the `onError` redirect target).
- **`beforeAll` warm-up import** — pre-imports `@/app/router` (and transitively Vuetify) outside any test's time budget so the one-off transpile cost isn't charged to a single test under `--coverage`.
- **`vi.mock('@/app/guards/authentications.ts', …)`** — stubs `tryRestoreAuth` and `enforceRouteAccess` with shared `vi.fn()` handles so tests can assert call counts and ordering.
- **`describe('document title and announcer')`** — asserts `document.title`, `VITE_APP_NAME` interpolation, and `routeAnnouncement` value follow the active route.
- **`describe('locale handling')`** — bare `/` redirects to a locale-prefixed Home.
- **`describe('unknown routes')`** — pins the interaction between the single-segment `/:locale` param and the two catch-alls (locale-scoped vs. top-level), including the non-obvious case where a single unknown segment is absorbed as a locale.
- **`describe('static prose pages')`** — verifies the computed route names (`StaticAbout`, `StaticFaq`, …) and the `props.default: { page }` payload.
- **`describe('global auth restore')`** — `tryRestoreAuth` fires on initial nav and on every subsequent nav.
- **`describe('access enforcement')`** — `enforceRouteAccess` runs on every navigation (public routes included) and only *after* `tryRestoreAuth` resolves.
- **Error→redirect tests** (bottom of file, truncated) — use `failNavigationWith` to confirm `onError` issues a follow-up navigation to the expected target.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- **Coverage timeout workaround:** the `beforeAll` import (60 s timeout) exists specifically because the first transpile of the router's module graph (which pulls in every view + Vuetify) exceeded the default 5 s per-test budget only under `--coverage`. Removing it will re-introduce a flaky failure in CI coverage runs.
- **Fresh router per test:** `vi.resetModules()` clears the module cache but *not* Vite's transform cache, so subsequent `loadRouter()` calls are cheap. Do not assume the router module is truly "cold" after the first import.
- **Top-level `/:catchAll(.*)` is documented as unreachable:** the single-segment `/:locale` param absorbs any first segment, so the top-level catch-all only fires if `/:locale` were changed to multi-segment. The test asserting this is intentionally kept as a guard against that refactor.
- **Per-route access declarations are *not* here:** they were moved to `src/modules/<name>/tests/routes.spec.ts` to avoid a platform spec breaking when a domain is deleted. This file only asserts that enforcement is attached and ordered.
- **`failNavigationWith` starts on `/en/playground`, not Home:** one of the redirect targets (the 401 fallback when no sign-in route is registered) *is* Home; starting there made "redirected" indistinguishable from "stayed."
- **Environment stubs** (`vi.stubEnv`, `vi.unstubAllEnvs`) are used for `VITE_APP_NAME` and cleaned up in `afterEach`.
