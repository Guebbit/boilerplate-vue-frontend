---
source: src/modules/account/stores/sessions.ts
sha256: 2445f8f3733b13960f6f5a14502bb34d30e0a2aac0dccae8623d2e2e9188d758
generated_at: 2026-10-02T12:18:35.826661+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/stores/sessions.ts

## Purpose

Pinia store (Composition API) that manages the visitor's device-session list — which refresh tokens are currently active and allows revoking a single session. It uses a plain `ref<Session[]>` rather than the toolkit's record structure because a session has no detail page and the list is always read whole.

## Key elements

- **`useAccountSessionsStore`** — the exported Pinia store (`defineStore('accountSessions', …)`), the only public export.
- **`sessions: ref<Session[]>`** — the live session list; one entry per refresh token, the current one flagged.
- **`loading`** — boolean flag from `useStructureRestApi`, indicates in-flight fetch.
- **`fetchSessions()`** — calls `apiGetSessions`, unwraps the envelope via `getPayloadFromResponse`, assigns `sessions.value`.
- **`revokeSession(sessionId: string)`** — calls `apiRevokeSession(sessionId)` (a handle, never a token value), then immediately re-fetches the list.
- **`fetchAny`** — the toolkit's REST wrapper; every action routes through it for consistent loading/error handling.

## Relationships

- **`useStructureRestApi`** (`@guebbit/vue-toolkit`) — supplies `loading` and `fetchAny`; the store's only interaction with the toolkit layer.
- **`apiGetSessions` / `apiRevokeSession`** (`@api`) — the HTTP calls the store delegates to.
- **`getPayloadFromResponse`** (`@/infrastructure/http/envelope.ts`) — unwraps the standard response envelope before reading the `.sessions` array.
- **`queryClient`** (`@/infrastructure/query-client.ts`) — passed into `useStructureRestApi` so the toolkit can coordinate cache invalidation.
- **`Session`** (`@types`) — the shape of each list entry.
- **`stores/auth.ts`** — owns `logoutEverywhere` (revoke-all); this store deliberately does *not* call it.

## Notes

- `sessionId` passed to `revokeSession` is an opaque handle returned by the API, **not** a raw token. Never log or persist it as if it were a credential.
- `revokeSession` always re-fetches after revocation; the store has no local mutation path, so the list is always server-authoritative.
- The store is scoped to `ProfileSessions.vue`; no other component is expected to consume it.
- Because the list is a plain ref (not the toolkit's keyed-record structure), there is no per-item loading state — only the single `loading` flag.
