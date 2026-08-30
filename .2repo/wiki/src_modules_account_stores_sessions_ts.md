# src/modules/account/stores/sessions.ts

## Purpose

Pinia store (Composition API) that manages the visitor's live device-session list—who else is signed in—and provides the single-session "log out that device" action. It uses a plain `ref<Session[]>` rather than the toolkit's record-structure helper because a session has no detail page and the list is always read in whole.

## Key elements

- **`useAccountSessionsStore`** — the store (`'accountSessions'`), the only export.
- **`sessions: Ref<Session[]>`** — the current session list; one entry per refresh token, the active one flagged.
- **`loading`** — shared loading flag sourced from `useCoreStore`.
- **`fetchSessions()`** — calls `apiGetSessions`, unwraps the response envelope, and populates `sessions`.
- **`revokeSession(sessionId: string)`** — revokes one session by its handle (never a raw token) and immediately re-fetches the list so the UI reflects the removal.

## Relationships

- **`@guebbit/vue-toolkit`** (`useCoreStore`, `useStructureRestApi`) — provides the loading-state plumbing and the `fetchAny` wrapper that feeds `loading`.
- **`@api`** (`getSessions`, `revokeSession`) — the actual HTTP calls this store delegates to.
- **`@/infrastructure/http/envelope.ts`** (`getPayloadFromResponse`) — unwraps the API response envelope before the store reads `.sessions`.
- **`@types`** (`Session`) — the shape each list entry carries.
- **`ProfileSessions.vue`** (not a graph neighbor here, but the sole consumer) — the only component that renders this store's state.
- **`stores/auth.ts` → `logoutEverywhere`** — handles the "end *all* sessions" case; this store intentionally does not.

## Notes

- The store is scoped to `ProfileSessions.vue`. Do not import it elsewhere.
- "End all sessions" lives in `stores/auth.ts` (`logoutEverywhere`); calling it from this store would be a layering mistake.
- `revokeSession` always triggers a follow-up `fetchSessions`; callers should not manage the list manually after revocation.
- `sessionId` is an opaque handle returned by the API, not a bearer/refresh token value.
