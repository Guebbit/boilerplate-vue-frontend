---
source: src/modules/account/stores/oauth-links.ts
sha256: e3694236aef31b32c811ba698163c2cc495a5ab9864c145d158116571e9da3c6
generated_at: 2026-10-17T00:18:57.961795+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/stores/oauth-links.ts

## Purpose

Pinia store (Composition API) holding the signed-in visitor's connected OAuth sign-in providers. It exists to separate the *visitor's own* linked providers from the deployment-level provider registry in `oauth.ts`, giving `ProfileConnectedAccounts.vue` a single place to read the list and trigger a disconnect.

## Key elements

- **`useOAuthLinksStore`** – Pinia store (`'accountOAuthLinks'`) exported as a composition-API setup store.
- **`links`** (`ref<OAuthLink[]>`) – The connected providers with their connection timestamps. Always read as a whole array; no per-item detail page exists.
- **`loading`** – Boolean from the `useStructureRestApi` slice; indicates an in-flight request.
- **`fetchLinks()`** – Calls `apiListOAuthLinks()`, unwraps the `OAuthLinks` envelope via `getPayloadFromResponse`, and stores the `links` array on the ref.
- **`unlinkProvider(provider: string)`** – Calls `apiUnlinkOAuthProvider(provider)`, then immediately calls `fetchLinks()` to re-render the list minus the removed provider. The server-initiated step-up prompt for a fresh session is handled externally (shared prompt), not here.
- **`fetchAny`** – Wrapper from `useStructureRestApi<OAuthLink, string>` that every action routes through; ties requests to the `queryClient` and the `loading` flag.

## Relationships

- **`src/modules/account/components/ProfileConnectedAccounts.vue`** – Sole consumer of this store (as noted in the JSDoc). Reads `links`, `loading`, and calls `fetchLinks` / `unlinkProvider`.
- **`src/modules/account/tests/oauth-links-store.spec.ts`** – Unit tests exercising the store's actions and state transitions.
- **`@api`** – Provides `listOAuthLinks` and `unlinkOAuthProvider` HTTP functions used by the two actions.
- **`@/infrastructure/http/envelope.ts`** – `getPayloadFromResponse` unwraps the API envelope before the store stores data.
- **`@/infrastructure/query-client.ts`** – The shared `queryClient` instance passed into `useStructureRestApi` for cache invalidation / deduplication.

## Notes

- The store deliberately uses a plain array ref rather than a record/map because a linked provider has no detail view; the list is always consumed in full.
- `unlinkProvider` does **not** optimistically remove the entry from `links`; it relies on the subsequent `fetchLinks()` call to produce the correct post-removal state.
- The step-up / re-authentication prompt triggered server-side during unlink is handled by a shared UI mechanism outside this store; no retry or auth logic lives here.
- `resourceKey` is `'accountOAuthLinks'`—matching the store ID string.
