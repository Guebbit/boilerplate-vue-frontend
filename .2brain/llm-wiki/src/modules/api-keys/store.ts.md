---
source: src/modules/api-keys/store.ts
sha256: 3b9e02035c72e10ff5aed0d42e0fe855a35a67c6de013efb673ae5b6e60d5139
generated_at: 2026-10-02T12:41:45.479847+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/store.ts

## Purpose

Pinia store managing machine-to-machine API credentials. Exposes a search-only list (via the shared `useStructureCrudApi` helper) plus two hand-written actions (`mintCredential`, `revokeCredential`) that bypass the generic CRUD paths because their responses either contain a one-time plaintext secret or lack an updated record body.

## Key elements

- **`useApiKeysStore`** — the store (id `'api-keys'`). Returns the search state (`apiKeys`, `apiKeysList`, `filters`, `loading`, `pageCurrent`, `pageSize`, `pageTotal`, `pageItemList`), `watchApiKeysSearch`, and the two custom actions.
- **`useStructureCrudApi<ApiKey, string>`** — wired with only a `search` fn (calls `listApiKeys`); no `list`/`get`/`create`/`update` endpoints exist. Configured with `resourceKey: 'api-keys'` and the shared `queryClient`.
- **`mintCredential(data: MintApiKeyRequest)`** — mints a new credential. Calls `mintApiKey` inside `fetchAny` (no automatic caching), strips `secret` before calling `editApiKeyRecord` to cache only the non-secret fields, then returns the full response (secret included) to the caller for the one-time reveal modal.
- **`revokeCredential(id: string)`** — revokes a credential. Calls `revokeApiKey` via `fetchAny`, then manually patches the cached record with a local `revokedAt` timestamp using `editApiKeyRecord(..., id, false)`.

## Relationships

No graph neighbors recorded. Internally the store imports from `@guebbit/vue-toolkit`, `pinia`, `@/infrastructure/query-client.ts`, the `@api` layer (`listApiKeys`, `mintApiKey`, `revokeApiKey`), and `@types` (`ApiKey`, `MintApiKeyRequest`).

## Notes

- **Secret is never cached.** `mintCredential` destructures out `secret` before the record hits `editApiKeyRecord`. The full response (secret included) is returned to the caller, which is responsible for showing the one-time reveal modal and never persisting the secret.
- **`editApiKeyRecord(..., id, false)` in `revokeCredential` is load-bearing.** The third argument (`create: false`) prevents `editRecord` from inserting a ghost record when the id is not yet in the cache. Without it, a bare `{ revokedAt }` row would be added.
- **`fetchAny` over `createTarget`/`updateTarget`.** Both custom actions avoid the generic CRUD helpers because those cache the raw API response verbatim — inappropriate for a response that carries a secret or lacks an updated body.
- **`fetchAny` return-type nuance.** The scrub-and-cache logic lives *inside* the callback passed to `fetchAny` (where the response is known to exist) rather than in a `.then` on `fetchAny`'s result, because `fetchAny` widens its return to `| undefined` for the cached path.
- **No filters.** `ListApiKeysParams` accepts only `page`/`pageSize`, so the `filters` object is present but effectively unused for input.
