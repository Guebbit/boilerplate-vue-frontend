---
source: src/modules/account/stores/oauth-providers.ts
sha256: be6331f3637d5179e76861664ec96fcc7ea7b32a8ed48cd52a17049de1edb1c6
signature: a33ebfe9e238715a2fef0122f6a41248ddb04e5462439184bd3f1030abacb16a
generated_at: 2026-11-10T03:27:18.865338+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/stores/oauth-providers.ts

## Purpose

Pinia store (Composition API) that holds the deployment's enabled OAuth provider list and exposes two pure helpers (`providerLabel`, `oauthStartUrl`) so login/signup components can render one button per provider. The list is a deployment fact, not per-visitor state, so it is fetched once and cached in the store rather than refetched on every mount.

## Key elements

- **`OAUTH_CALLBACK_ERRORS`** (exported const) – The closed set of `?error=` codes the backend's OAuth callback can redirect with, sourced from the API contract's `x-redirect-query` enum. Exposed here so views don't import contract tables directly.
- **`providerLabel(provider)`** (exported fn) – Returns a display name: looks up an override in `PROVIDER_LABELS` (e.g. `github` → `GitHub`), otherwise capitalises the first letter.
- **`oauthStartUrl(provider, { continueTo?, locale? })`** (exported fn) – Builds the top-level navigation URL (`{baseURL}/account/oauth/{provider}?…`) that the browser must navigate to for the OAuth redirect dance. Filters out undefined params. Keyed by `StartOAuthLoginParams` via `satisfies` so a param rename is a build error.
- **`useAccountOAuthProvidersStore`** (exported Pinia store) – Exposes `providers: ref<string[]>`, `loading`, and `fetchProviders()`. `fetchProviders` reads `loadConfig()`, sets `providers` and `loaded`, and is a no-op if `loaded` is already `true`.

## Relationships

- **`OAuthButtons.vue`** – Consumes `providerLabel` and `oauthStartUrl` to render one anchor/button per provider in the `providers` list.
- **`ProfileConnectedAccounts.vue`** – Reads the store's `providers` list (and likely `providerLabel`) to display which accounts are connected.
- **`OAuthCallback.vue`** – Imports `OAUTH_CALLBACK_ERRORS` to map incoming `?error=` query values to user-facing messages.
- **`oauth.spec.ts`** – Unit-tests the store's fetch-once behaviour, `providerLabel` fallbacks, and `oauthStartUrl` query-string construction.

## Notes

- `fetchProviders` **swallows failures** (`.catch(() => providers.value)`) and deliberately does **not** set `loaded = true` on error, so the next mount retries instead of caching a transient failure as "no providers, forever". No toast is shown; a login page with zero OAuth buttons is an acceptable degraded state.
- `oauthStartUrl` reads `instance.defaults.baseURL` (the shared axios instance) rather than `import.meta.env`, so it follows the e2e shard runner's `__APP_CONFIG` runtime override. A build-time env read would miss that.
- `PROVIDER_LABELS` is an **override** map, not an exhaustive registry. Any provider key absent from it still renders via the capitalise-fallback.
- The URL built by `oauthStartUrl` is a **real top-level navigation target**, not an API endpoint. The OAuth redirect flow requires the browser to leave the origin and return with cookies; a `RouterLink` or `fetch` call cannot accomplish that. This is why the query is assembled by hand rather than calling the generated `startOAuthLogin` function (whose docblock says it is "not called programmatically").
