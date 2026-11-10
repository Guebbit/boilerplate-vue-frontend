---
source: src/modules/account/stores/oauth-links.ts
sha256: 20578f0d27a116678969f59594e6ff1bab7d7015bc6f34738db9ab8514713d38
signature: 90f980c4b4c0db5325a7231bf146880413fe80f68d8ad81e6410de85054b952d
generated_at: 2026-11-10T03:27:05.891686+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/stores/oauth-links.ts

## Purpose

Pinia store (Composition API form) that manages the signed-in visitor's list of connected OAuth sign-in providers — fetching, linking, and unlinking them. It is deliberately a plain array `ref` rather than a keyed record because links have no detail page and are only ever read whole. It is distinct from `oauth.ts`, which holds the deployment's public provider catalog.

## Key elements

- **`startProviderLink(provider, options)`** — Standalone export (not part of the store). Calls `apiStartOAuthLink` to obtain a provider consent URL for initiating a new connection. Accepts optional `continueTo` (same-origin landing path) and `locale`. Throws if the server omits an `authorizeUrl`. The caller is expected to navigate the browser to the returned URL.
- **`useAccountOAuthLinksStore`** — The Pinia store (id `account-oauth-links`). Exposes:
  - `links: Ref<OAuthLink[]>` — the currently connected providers (never carries a provider's own `id`).
  - `loading` — reactive flag from `useStructureRestApi`.
  - `fetchLinks()` — loads the connected-provider list via `apiListOAuthLinks`, routed through the toolkit's `fetchAny` wrapper.
  - `unlinkProvider(provider)` — disconnects one provider via `apiUnlinkOAuthProvider`; the server response already contains the remaining links, so the list is updated in-place with no second read.
- **`applyLinks(data)`** — Internal helper that extracts `data.links` into the store's `links` ref. Used by both fetch and unlink responses.

## Relationships

- **`ProfileConnectedAccounts.vue`** — The sole consumer of this store (per the doc comment "Scoped to"). Reads `links`, calls `fetchLinks` on mount / after the OAuth callback, and triggers `startProviderLink` / `unlinkProvider` from its UI actions.
- **`oauth-links-store.spec.ts`** — Unit tests exercising the store's `fetchLinks`, `unlinkProvider`, and the standalone `startProviderLink` against mocked API responses.

## Notes

- `startProviderLink` is exported at module level, **not** inside the store. It mutates nothing locally; linkage only materialises after the browser round-trips through the provider callback and the panel re-fetches.
- Both `startProviderLink` and `unlinkProvider` rely on the shared step-up prompt to satisfy any fresh-session requirement the server imposes; this file contains no auth/session logic.
- The store uses `useStructureRestApi` from `@guebbit/vue-toolkit` for its REST slice (loading state + `fetchAny` wrapper). All API calls are funneled through that wrapper rather than called directly.
- The `OAuthLink` type (imported from `@types`) is the unit shape; the store never indexes by provider key.
