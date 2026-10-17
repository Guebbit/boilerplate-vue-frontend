---
source: src/infrastructure/session.ts
sha256: 662db1dd4b300964d90036e430cd1ec87ddb2d40e7372c9d46f5d4ed7094987b
generated_at: 2026-10-17T00:12:10.365559+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/session.ts

## Purpose

Pinia store that gates the entire app: it tracks whether a session is held (in-memory JWT in `jwt` mode, or an HttpOnly-cookie flag in `cookie` mode), holds a minimal viewer projection, and manages the CASL abilities every screen checks. It exists so route guards, the app shell, and cross-tab logout all read one source of truth for "who is signed in and what may they see."

## Key elements

- **`useSessionStore`** — the Pinia store. Exposes `accessToken`, `viewer`, `mode`, `cookieSession`, `hasSession`, `isAuth`, and a `clearSession`/epoch mechanism to invalidate in-flight refreshes.
- **`isAuth` (computed)** — `hasSession && viewer`. A restored-but-unidentified session is *not* authenticated.
- **`hasSession` (computed)** — `Boolean(accessToken) || cookieSession`.
- **`mode` (ref)** — `jwt` | `cookie`, loaded once from `GET /account/session-config`. `undefined` until then; consumers treat it as `jwt`.
- **`SessionViewer` (interface)** — minimal projection: `id`, `email`, `role?`, `imageUrl?`, `thumbnailUrl?`, `verified?`. Not the domain `User`.
- **`PermissionAction` (type re-export)** — the closed set of concrete actions screens may query. `manage` is deliberately absent.
- **`unpackAbilityRules`** — converts the server's packed rule array into `RawRuleOf<MongoAbility>[]` for `createMongoAbility`.
- **`isDefinitiveAuthFailure`** — true when a refresh-endpoint rejection is 401 or 403 (vs. network/5xx).
- **`writeCookie` / `clearCookie` / `setCookie`** — centralized cookie writers. `setCookie` calls the prototype descriptor to bypass instance shadowing; `writeCookie` bakes in `path=/`, `SameSite=Lax`, and a conditional `; Secure`.
- **`sessionChannel`** — `BroadcastChannel('session')` for cross-tab logout; `undefined` when the API is unavailable.
- **`emailVerifyResendRetryAfter` / `reauthSendRetryAfter`** — extract the `Retry-After` seconds from a 429 rejection for their respective endpoints.

## Relationships

No graph neighbors are recorded for this file. It imports API client functions, CASL, Vue/Pinia reactivity primitives, and internal http helpers (`envelope`, `etag`, `logger`), but those edges are not surfaced in the provided dependency graph.

## Notes

- **`isAuth` is conjunctive by design.** A session without a viewer (restored but not yet identified) must *not* read as authenticated; this is the single most important invariant in the file.
- **`role` is a rendering hint, not an authorization token.** It drives route-guard rendering; the server re-evaluates permissions on every request.
- **`verified` is optional.** Every real projection sets it, but the type allows omission so that unrelated test fixtures don't need `verified: true`. `!viewer.verified` treats missing as unverified (fail-safe direction).
- **`setCookie` deliberately bypasses the instance descriptor.** If a library or test double shadows `document.cookie` on the instance, the prototype setter still works.
- **`Secure` is scheme-driven, not build-mode-driven.** `location.protocol === 'https:'` is the check; a blanket `Secure` would silently drop the cookie on a plain-HTTP dev server.
- **`unpackAbilityRules` contains one named cast.** OpenAPI/JSON Schema cannot express CASL's discriminated tuple, so the generated `PackedRules` type is `unknown[][]`. The cast to `PackRule<RawRuleOf<MongoAbility>>[]` is the single trusted seam.
- **Cross-tab logout degrades silently.** If `BroadcastChannel` is unavailable (older browsers, some test runners), `sessionChannel` is `undefined` and no retry or polyfill is attempted.
- **The store uses a `ref` epoch (bumped by `clearSession`)** so a refresh that started before a clear does not act on its result once it lands.
