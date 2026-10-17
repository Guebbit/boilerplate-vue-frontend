---
source: src/modules/account/stores/sessions.ts
sha256: 6d3e37369a4e1b7ad8a92a717e56f97200c2987cc4f649f588bbdbf3ec5e9cd1
generated_at: 2026-10-17T00:19:28.792572+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/stores/sessions.ts

## Purpose

Pinia store (Composition API) that loads and revokes the visitor's device-session list. It wraps the session REST endpoints so the UI can ask "who else is signed in?" and "log out that one device" without touching the API layer directly.

## Key elements

- **`useAccountSessionsStore`** — the store export; registers under the Pinia id `'accountSessions'`.
- **`sessions`** — `ref<Session[]>`; the live list (one entry per refresh token, current session flagged). A plain ref, not the toolkit's record structure, because a session has no detail page and the list is only ever read whole.
- **`loading`** — reactive flag exposed by `useStructureRestApi`; true while `fetchSessions` or `revokeSession` is in flight.
- **`fetchSessions()`** — calls `listSessions`, extracts the `sessions` array from the response envelope via `getPayloadFromResponse`, assigns it to `sessions`, and returns it.
- **`revokeSession(sessionId, { current })`** — calls `revokeSession` on the API. After a successful revocation it reloads the list *unless* `current` is `true` (i.e. the caller is revoking their own session, in which case the server has already cleared cookies and a follow-up read would 401).

## Relationships

- **`ProfileSessions.vue`** — the sole consumer; it renders the session list and the per-row "end" button. The store is scoped to this component by design.
- **`sessions.spec.ts`** — unit-test suite covering the store's fetch and revoke behaviors.
- **`ProfilePasswordChange.vue`** — adjacent component in the same feature area; graph-related but no direct import of this store is visible in the file under test.

## Notes

- Ending *all* sessions at once is **not** this store's job — that lives in `stores/auth.ts` as `logoutEverywhere`. This store only revokes one session at a time.
- `revokeSession`'s `sessionId` argument is an opaque handle returned by `fetchSessions`; it is never a raw token value.
- The `current` flag on `revokeSession` is the only path that skips the post-revocation reload. Callers must pass it explicitly when the user is logging out their own active tab.
- The toolkit's record-based structure (individual item refs, etc.) is intentionally **not** used here; the `useStructureRestApi` call only contributes `loading` and the `fetchAny` wrapper for consistent error/loading handling.
