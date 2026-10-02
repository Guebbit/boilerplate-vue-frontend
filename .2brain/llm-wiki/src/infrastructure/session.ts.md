---
source: src/infrastructure/session.ts
sha256: 652a551c011d9b4b665dc354ffb44cc6a18627b4becd81c14363d77f26dcc0d2
generated_at: 2026-10-02T14:41:34.398094+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/session.ts

## Purpose

Pinia setup-store that owns the app's authentication state: an in-memory access token, a minimal viewer projection (`id`, `email`, `role`, avatar URLs, `verified`), and two CASL ability scopes (`tenant`, `platform`). It exists so that `isAuth` requires **both** token and viewer, preventing a restored-but-unidentified session from being treated as authenticated, and so that route guards and the shell have a single source of truth for "who is signed in" without importing the full `User` domain object.

## Key elements

- **`useSessionStore`** — the store (Pinia setup pattern). Exposes:
  - `accessToken` (`ref<string>`) — in-memory; the refresh token stays in an httpOnly cookie.
  - `viewer` (`ref<SessionViewer>`) — minimal user projection for shell/guards.
  - `isAuth` (`computed`) — `Boolean(accessToken && viewer)`; never either alone.
  - `sessionEpoch` (`ref<number>`) — bumped on `clearSession`; stale refresh continuations are dropped.
  - `expiredSignal` (`ref<number>`) — bumped only on a definitive 401/403 from the refresh endpoint; watched by `LayoutDefault.vue` for toast + redirect.
  - Two CASL `MongoAbility` instances (`tenant`, `platform`) built from `GET /account/abilities`; empty by default (least-privilege).
  - Actions: `login`, `logout`, `logoutAll`, `loadViewer`, `refreshToken`, `clearSession`, reauth helpers, `requestEmailVerification`.
- **`SessionViewer`** (interface) — `{ id, email, role, imageUrl?, thumbnailUrl?, verified? }`. Deliberately narrower than the domain `User`.
- **`PermissionAction`** (type re-export) — concrete actions a screen may check; generated from the backend's `shared/authorization-keys.yaml`.
- **`isDefinitiveAuthFailure(error)`** — true only for 401/403 from the refresh endpoint; network errors and 5xx do **not** count.
- **`unpackAbilityRules(packed)`** — converts the API's packed wire format into CASL `RawRuleOf<MongoAbility>[]` via a single named cast through `PackRule`.
- **`emailVerifyResendRetryAfter` / `reauthSendRetryAfter`** — extract the `Retry-After` seconds from a 429 rejection for their respective endpoints.
- **`writeCookie` / `clearCookie` / `setCookie`** — write JS-readable cookies (`isAuth`, `rememberMe`) through the prototype descriptor; always set `path=/`, `SameSite=Lax`, and conditionally `; Secure`.
- **`sessionChannel`** — `BroadcastChannel('session')` for cross-tab logout; `undefined` where unsupported.

## Relationships

No formal graph neighbors are tracked for this file. It imports from `@api` (auth/account/reauth endpoints), `@/infrastructure/http/envelope.ts` (response-envelope helpers), `@/infrastructure/http/etag.ts` (`clearEtags`), `@casl/ability`, `@guebbit/js-toolkit` (`getCookie`), and `@types`. It is consumed by route guards, the app shell (`LayoutDefault.vue`), and the account menu.

## Notes

- `isAuth` is a computed over **two** refs; a token without a viewer (or vice-versa) is **not** authenticated. This is the core invariant of the file.
- CASL abilities are **rendering hints only** — the server re-evaluates every request. An empty ability (pre-fetch or post-failure) greys out UI rather than opening it.
- `sessionEpoch` is the guard against a race: a `refreshToken` call that resolves *after* `clearSession` sees a mismatched epoch and discards its result.
- `expiredSignal` fires only for definitive 401/403 from refresh, **not** for explicit `logout`/`logoutAll`, so a deliberate sign-out does not trigger the "session expired" toast.
- Cookie writes go through `Object.getOwnPropertyDescriptor(Document.prototype, 'cookie').set` to avoid being shadowed by test doubles or libraries that reassign `document.cookie`.
- `secureAttribute()` checks `location.protocol` at runtime (not a build flag) so the local HTTP dev server doesn't get silently dropped `Secure` cookies.
- The `PackedRules → PackRule` cast in `unpackAbilityRules` is the single place the file trusts the wire contract over the compiler; it is intentional and named.
