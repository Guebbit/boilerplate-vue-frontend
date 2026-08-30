# src/infrastructure/stores/session.ts

## Purpose

Pinia store that holds the app-gating session pair — an in-memory access token and a minimal viewer projection — and exposes the derived booleans (`isAuth`, `isAdmin`) that route guards and the shell depend on. It exists so that authentication state lives in one place, is deliberately minimal (a `{ id, email, admin, imageUrl? }` shape rather than the domain `User`), and is never readable as "authenticated" until both the token *and* the identity are present.

## Key elements

- **`SessionViewer`** — exported interface; the least the shell and guards need to know about the signed-in visitor (`id`, `email`, `admin`, optional `imageUrl`).
- **`setCookie`** (module-private) — writes a cookie via `Document.prototype`'s own setter descriptor so the write survives any instance-level shadowing of `document.cookie`.
- **`useSessionStore`** — the Pinia store (setup syntax). Exposes:
  - **State:** `accessToken` (in-memory `ref<string>`), `viewer` (`ref<SessionViewer>`).
  - **Derived:** `isAuth`, `isAdmin` — both require token **and** viewer; a token without a viewer is *not* authenticated.
  - **`setAccessToken` / `setViewer`** — set state; `setAccessToken` also writes the JS-readable `isAuth` hint cookie.
  - **`refreshToken`** — calls `apiRefreshToken`, stores the new token from the response envelope.
  - **`loadViewer`** — calls `apiGetAccount`, maps the payload structurally into `SessionViewer` (avoids importing the domain `User`).
  - **`persistLocalePreference(locale)`** — best-effort `PUT /account` for signed-in visitors; no-op for guests; swallows errors (never rejects).
  - **`clearSession`** — resets local state and expires the `isAuth` cookie. Does **not** clear domain caches.
  - **`logout`** — revokes this token server-side, then `clearSession`.
  - **`logoutAll`** — revokes all sessions server-side, then `clearSession`.

## Relationships

- **`src/app/guards/authentications.ts`** — Consumes `isAuth` and `isAdmin` to admit or redirect route access.
- **`src/infrastructure/http/interceptors.ts`** — On 401 responses, calls `refreshToken` to obtain a new access token and retries; the store is the single owner of the resulting token.
- **`src/infrastructure/http/index.ts`** — Provides the `@api` functions (`getAccount`, `refreshToken`, `logout`, `logoutAll`, `updateAccount`) that the store calls; also re-exports the envelope helpers (`getTokenFromResponse`, `getPayloadFromResponse`) used to unwrap responses.
- **`docs/tools/security.md`** — Documents the token/cookie split (httpOnly refresh cookie vs. in-memory access token vs. JS-readable `isAuth` hint) that this store implements.
- **`docs/index.md`** — Top-level wiki index; lists this file under the infrastructure/stores section.

## Notes

- `isAuth`/`isAdmin` are computed from **both** `accessToken` and `viewer`. A restored token with no viewer (e.g., after a page reload before `loadViewer` resolves) must not be treated as authenticated.
- The `isAuth` cookie is a **hint**, not a credential — it only lets `tryRestoreAuth` skip a refresh round-trip for guests. The actual credential round-trip is the httpOnly refresh cookie.
- `clearSession` intentionally does **not** clear account-module caches; that module resets its own state on logout.
- `persistLocalePreference` is fire-and-forget by design: callers do not await it, and a failed write silently leaves the stale preference in place.
- `SessionViewer` is typed structurally (not as the generated `User` type) to keep the domain entity out of the `infrastructure` layer.
