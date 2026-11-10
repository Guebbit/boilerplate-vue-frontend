---
source: src/infrastructure/session.ts
sha256: 5600b3936100c3ab5094a35d56d7e1fc69d7eee0ea65c78ffab9bca89c4e40b9
signature: 244f3e7ee832c1180d4096c2a0d1732abf4711a8d941c6d9dfb73749c191990d
generated_at: 2026-11-10T03:10:00.822856+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/session.ts

## Purpose

Pinia setup store that gates the entire application: it holds the session credential (in-memory JWT in `jwt` mode, a boolean flag over an HttpOnly cookie in `cookie` mode), a minimal viewer projection, and the two CASL ability scopes every screen is gated on. It also owns idle-timeout tracking, cross-tab logout broadcast, and the "remember me" cookie lifecycle. The step-up re-proof, verification-mail resend, and language preference live in sibling files and share no state with this store.

## Key elements

- **`useSessionStore`** — the setup store (`defineStore('session', …)`). Exposes all state, computeds, and actions for the session/viewer pair.
- **`SessionViewer`** (interface) — minimal projection `{ id, email, role?, imageUrl?, thumbnailUrl?, verified? }` the shell and route guards need. Deliberately not the domain `User`.
- **`SessionAbility`** (type) — `MongoAbility<[PermissionAction, PermissionSubject]>`, narrowing CASL to the backend's closed action/subject lists.
- **`isAuth`** (computed) — `hasSession && Boolean(viewer)`. A restored-but-unidentified session is *not* treated as authenticated.
- **`hasSession`** (computed) — `Boolean(accessToken) || cookieSession`.
- **`sessionEpoch`** (ref) — bumped on every `clearSession`; a refresh continuation that captured a stale epoch is dropped, preventing a late-resolving refresh from re-authenticating after logout.
- **`expiredSignal`** (ref) — bumped only on a definitive 401/403 from the refresh endpoint (never on explicit logout); `LayoutDefault.vue` watches it to toast + redirect.
- **`idle`** (ref) — `{ timeoutMs, lastActiveAt }` for the staff idle clock; `undefined` for shoppers.
- **`isDefinitiveAuthFailure`** — classifies an axios rejection as a dead-session signal (401/403) vs. a transient network/5xx error. Handles both the raw AxiosError shape and the API envelope shape.
- **`unpackAbilityRules`** — converts the packed `PackedRules` wire shape into CASL `RawRuleOf<SessionAbility>[]` via `unpackRules`, with a single named cast at the boundary.
- **`applyRememberChoice`** — sets or deletes the `rememberMe` JS cookie based on the login's "remember me" choice; `Secure` follows `location.protocol`.
- **`sessionChannel`** — `BroadcastChannel('session')` for cross-tab logout; `undefined` in environments without it (graceful degradation).
- **Re-exports** — `ActionOn`, `PermissionAction`, `PermissionSubject` from `@api/permission-vocabulary`.

## Relationships

No graph neighbors are registered for this file.

## Notes

- **`isAuth` is conjunctive, not disjunctive.** A session with no viewer (restored but not yet identified) must *not* be read as authenticated; guards rely on this.
- **Mode defaults to `jwt`.** Until `loadSessionMode` resolves, `mode` is `undefined` and every branch treats it as `jwt`.
- **`verified` is optional on `SessionViewer`.** Every real projection sets it, but the field is widened to optional so other modules' test doubles don't need to fabricate a value. `!viewer.verified` reads a missing value as unverified — the fail-safe direction.
- **`role` is a render-only hint.** Route guards read it to decide what to *show*; the server re-evaluates every request, so a client that faked `role: 'admin'` would still be refused.
- **`manage` action is intentionally absent** from the generated permission vocabulary — no key declares it and no wildcard expands into one, so any `can('manage', …)` always returns false.
- **Cross-tab logout is best-effort.** If `BroadcastChannel` is unavailable, sync degrades silently; there is no retry or polyfill path.
- **The `rememberMe` cookie is the only JS-written session cookie.** The refresh token itself is HttpOnly and never touches `document.cookie`.
