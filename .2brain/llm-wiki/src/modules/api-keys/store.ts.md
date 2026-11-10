---
source: src/modules/api-keys/store.ts
sha256: d504dbf543d736855a086c0973d878e19a04688d004c14556a6ff6895edc99b4
signature: 48aa853fcb8536efbb3296e65322dad6354afe60dbb8fab40481de0b072a9697
generated_at: 2026-11-10T03:50:10.518580+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/store.ts

## Purpose

Pinia store for machine-to-machine credentials (API keys). Wraps `useStructureCrudApi` for a search-only listing (no single-resource GET/PATCH, no filters) and provides two hand-written actions — `mintCredential` and `revokeCredential` — that intentionally bypass the generic create/update paths to prevent caching plaintext secrets or relying on response bodies the API does not return.

## Key elements

- **`useApiKeysStore`** — the store instance (`'api-keys'`). Setup-store syntax; all state/actions are closed over.
- **`maxExpiresAt`** (`ref<string>`) — populated as a side-effect of every list search; the UI uses it to cap the expiry picker. Absent until the first list response arrives.
- **`mintCredential(data)`** — calls `createApiKey` via `fetchAny` (no automatic caching), then hand-caches the non-secret fields through `editApiKeyRecord`. Returns the **full** response (including `secret`) so the caller can render a one-time reveal modal. Hard-codes `status: 'active'` and an `actions.revoke` permission flag because the mint response omits both.
- **`revokeCredential(id)`** — calls `revokeApiKey` (204, no body) via `fetchAny`, then patches the local row with `revokedAt` / `status: 'revoked'` / `actions.revoke: false` using `editApiKeyRecord(_, id, false)`.
- **Search plumbing** (`apiKeys`, `apiKeysList`, `filters`, `loading`, `pageCurrent`, `pageSize`, `pageTotal`, `pageItemList`, `watchApiKeysSearch`, `addApiKeyRecord`) — all destructured from `useStructureCrudApi<ApiKey, string>` and re-exported.

## Relationships

- **`ApiKeysList.vue`** — consumes `apiKeysList`, `watchApiKeysSearch`, pagination refs, `loading`, and calls `revokeCredential(id)`.
- **`ApiKeyCreate.vue`** — calls `mintCredential`, reads `maxExpiresAt` for the expiry ceiling, and renders the one-time `secret` from the return value.
- **`store.spec.ts`** — unit-tests the store's actions and state transitions.

## Notes

- **No `createTarget` / `updateTarget`.** Both mutating actions go through `fetchAny` specifically so the generic cache path never stores the raw response. For mint, this is what keeps the plaintext `secret` out of `itemDictionary`; for revoke, the 204 body means there is nothing to cache anyway.
- **`create: false` is load-bearing in `revokeCredential`.** `editRecord` defaults to `create: true`; passing `false` prevents a ghost record (containing only `revokedAt`) from being inserted if the key's id was not yet in the cache.
- **The search call is the sole source of `maxExpiresAt`.** It is not fetched independently — until the list loads, the value is `undefined` and the server's 422 is the real guard.
- **`actions.revoke`** on the minted record is derived from `useSessionStore().can('delete', 'ApiKey')`; the server response does not include an actions field.
- Follows the same "scrub-and-cache" pattern documented in `webhooks/store.ts` (`createSubscription`).
