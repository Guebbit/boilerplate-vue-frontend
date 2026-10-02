---
source: src/modules/account/stores/oauth.ts
sha256: 5cc56c8b03660675a5e5c258d2358da16d90a1e1a90d74ce7f4a252b97113c30
generated_at: 2026-10-02T12:17:37.663439+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/stores/oauth.ts

## Purpose

Pinia store (Composition API form) that holds the list of enabled OAuth providers for a deployment, plus two pure helpers (`providerLabel`, `oauthStartUrl`) used by `Login.vue` and `Signup.vue` to render one button per configured provider. The provider list is a deployment-level fact fetched once and cached, not per-visitor state.

## Key elements

- **`PROVIDER_LABELS`** — Internal override map for display names that naive capitalization gets wrong (e.g. `github` → `GitHub`).
- **`providerLabel(provider: string): string`** — Returns a display label for a provider: the override from `PROVIDER_LABELS` if present, otherwise the registry name with its first letter capitalized.
- **`oauthStartUrl(provider, options?): string`** — Builds the top-level navigation URL (e.g. `/account/oauth/google?continue=…&locale=…`) that a login button must target. Reads the base URL from the shared axios instance (`instance.defaults.baseURL`). Accepts optional `continueTo` (same-origin path) and `locale` params.
- **`useOAuthProvidersStore`** — Pinia store exposing `providers` (string array), `loading` (boolean), and `fetchProviders()`. Uses `useStructureRestApi` with a `queryClient` for the fetch plumbing.
- **`fetchProviders()`** — Calls `apiListOAuthProviders` exactly once; subsequent calls resolve immediately with the cached list. On failure it swallows the error, leaves `loaded` as `false`, and returns the (still empty) array so the next mount retries.

## Notes

- **URL built by hand, not via the generated API client.** The OAuth redirect requires a real top-level browser navigation (provider consent → cookie set → redirect back), which neither a `RouterLink` nor an `axios` call can perform. The query string is therefore constructed manually but still typed against `StartOAuthLoginParams` so a param rename is a compile error, not a silent wrong-URL bug.
- **Base URL from the axios instance, not `import.meta.env`.** This follows the e2e shard runner's `__APP_CONFIG` runtime override; a build-time env read would miss it.
- **Failure is a silent no-op, not an error toast.** A login page with zero OAuth buttons is an acceptable degraded state. Critically, `loaded` stays `false` on failure so the *next* component mount retries the fetch rather than permanently caching "no providers."
- **Empty list means "render no OAuth buttons at all."** `Login.vue`/`Signup.vue` are expected to check the array length and skip the section entirely when it is `[]`.
