---
source: src/modules/account/stores/sessions.ts
sha256: 4e11d29646831410d43c8d93795731299173f75895e36f4206af2451c063be29
signature: 614c1d34a567da278cf2a10ed05c78b576510dc03fd3dc3b2f1c9769b79e8e34
generated_at: 2026-11-10T03:28:04.134005+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/stores/sessions.ts

## Purpose

Pinia store (Composition API) that loads and revokes the visitor's device-session list via the `@guebbit/vue-toolkit` REST helper. It exists as a dedicated slice so `ProfileSessions.vue` can render "who else is signed in" and offer a per-device "end session" action without coupling to the broader auth store.

## Key elements

- **`useAccountSessionsStore`** — the exported Pinia store (`account-sessions`). Returns `sessions`, `loading`, `fetchSessions`, `revokeSession`.
- **`sessions: Ref<Session[]>`** — plain array ref (not a keyed record) holding one entry per refresh token. Chosen deliberately because a session has no detail page and is only ever read whole.
- **`fetchSessions()`** — calls `apiListSessions`, stores the result in `sessions`, and resolves with the array.
- **`revokeSession(sessionId, { current? })`** — calls `apiRevokeSession`, then reloads the list *unless* `current` is true (i.e. the caller is revoking its own session, where the server has already cleared cookies and a follow-up read would 401).
- **`loading`** — reactive flag from `useStructureRestApi`, shared across both actions.

## Relationships

- **`ProfileSessions.vue`** — the sole UI consumer; the store is scoped to this component per the module docstring.
- **`sessions.spec.ts`** — unit tests for `fetchSessions` and `revokeSession` (including the `current: true` skip-reload path).
- **`confirm-once.spec.ts`** — tests a one-time-confirmation flow that exercises this store's revocation action.
- **`ProfilePasswordChange.vue`** — appears as a graph neighbor; no direct reference in this file's code or docs.

## Notes

- `revokeSession` takes a **session id handle**, never a raw refresh-token value.
- The "end *all* sessions" operation lives in `stores/auth.ts` (`logoutEverywhere`), not here — this store intentionally omits it.
- The store passes `queryClient` into `useStructureRestApi`, so requests are routed through the app's shared TanStack Query client.
- Because `sessions` is a flat array, there is no per-item detail-fetch pattern; treat the array as an opaque, read-whole list.
