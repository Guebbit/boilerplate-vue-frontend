# src/infrastructure/session.ts

## Purpose

Pinia store that holds the in-memory access token plus a minimal viewer projection, and exposes the `isAuth`/`isAdmin` flags that gate the app shell and route guards. It owns the cookie bookkeeping for the JS-readable `isAuth` and `rememberMe` markers, and wraps the API calls for token refresh, account lookup, locale persistence, and logout.

## Key elements

- **`SessionViewer`** — interface for the least the shell/guards need: `{ id, email, admin, imageUrl?, thumbnailUrl? }`. Deliberately not the domain `User` type.
- **`setCookie(value)`** — internal helper that writes a cookie via `Object.getOwnPropertyDescriptor(Document.prototype, 'cookie').set`, so it still works if a test double or library has shadowed `document.cookie` on the instance.
- **`useSessionStore`** (Pinia store, setup syntax):
  - `accessToken` / `viewer` — reactive refs (token is in-memory only; the refresh token lives in an httpOnly cookie).
  - `isAuth` / `isAdmin` — computed; both require **token AND viewer** (or viewer.admin) to be truthy, preventing a restored-but-unidentified session from reading as authenticated.
  - `setAccessToken(token?, remember?)` — stores the token, (re)sets the `rememberMe` marker when `remember` is given, and stamps the `isAuth` cookie with a lifetime that mirrors the `rememberMe` marker (or session-only otherwise).
  - `setViewer(nextViewer?)` — stores or clears the viewer projection.
  - `refreshToken()` — calls `apiRefreshToken`, extracts the new token via `getTokenFromResponse`, and calls `setAccessToken` (without a `remember` arg, so it inherits the existing marker).
  - `loadViewer()` — calls `apiGetAccount`, extracts the payload structurally (not as the generated `User` type), and stores the projection.
  - `persistLocalePreference(locale)` — if authenticated, `PUT`s `{ locale }` via `apiUpdateAccount`; swallows errors; resolves immediately for guests.
  - `clearSession()` — wipes token, viewer, and both JS-readable cookies. Does **not** touch domain-level caches.
  - `logout()` / `logoutAll()` — call the respective API endpoint, then `clearSession`.

## Relationships

No graph neighbors are recorded for this file. It imports from `@guebbit/js-toolkit` (cookie read), `@api` (auth/account endpoints), and `@/infrastructure/http/envelope.ts` (response-envelope extraction). On the consumer side it is imported by `useAuthStore` (login flow) and the app's route guards, but those edges are not represented in the dependency graph.

## Notes

- **`isAuth` derivation rule:** token alone or viewer alone is *not* sufficient. A restored session whose viewer hasn't loaded yet must not pass a guard.
- **`setCookie` vs `document.cookie`:** always go through the prototype descriptor. Direct `document.cookie = …` assignments are bypassed by instance-level shadowing (tests, polyfills).
- **`rememberMe` vs `isAuth` lifetime:** the `isAuth` cookie's `max-age` is tied to the `rememberMe` marker so the hint doesn't expire before the httpOnly refresh cookie it points at. A session-only `isAuth` would silently kill "remember me" at browser restart.
- **`persistLocalePreference` is fire-and-forget:** callers don't await it; a failed write is silently swallowed (no toast). The stale preference self-corrects on the next switch.
- **`clearSession` is not a full reset:** domain caches (e.g. the account module's) must clear themselves on logout. This store only removes what it owns.
- **Structural typing in `loadViewer`:** the payload is cast to an inline structural type rather than importing the generated `User`, keeping the `infrastructure` layer free of domain entities.
