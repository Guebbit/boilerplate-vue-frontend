# src/modules/account/stores/oauth.ts

## Purpose

Pinia store (Composition API) that caches the deployment's enabled OAuth provider list, plus two pure helper functions (`providerLabel`, `oauthStartUrl`) that `Login.vue`/`Signup.vue` use to render one button per provider. The list is a deployment-level fact, so it is fetched once and reused across mounts rather than re-requested each time.

## Key elements

- **`PROVIDER_LABELS`** (module-private) — override map for display names where bare capitalization is wrong (e.g. `github` → `GitHub`).
- **`providerLabel(provider: string): string`** — pure helper; returns the override label if present, otherwise the registry key with a capitalized first letter.
- **`oauthStartUrl(provider: string): string`** — pure helper; builds the backend start-login URL (`{baseURL}/account/oauth/{provider}`). Reads `baseURL` off the shared axios `instance` rather than `import.meta.env` so it respects the e2e runner's `__E2E_API_URL` runtime override. Intended for a real top-level navigation (window redirect), not an in-app router link or API call.
- **`useOAuthProvidersStore`** — Pinia store (`'accountOAuthProviders'`) exposing:
  - `providers: Ref<string[]>` — enabled provider names; empty until loaded.
  - `loading: Ref<boolean>` — shared loading flag from `useCoreStore`.
  - `fetchProviders()` — fetches the list once; subsequent calls resolve immediately with the cached value. Errors are swallowed (no toast) so the page degrades to "no OAuth buttons" and `loaded` stays `false`, allowing the next mount to retry.

## Relationships

- Consumes `useCoreStore` and `useStructureRestApi` from `@guebbit/vue-toolkit` for the shared loading flag and the `fetchAny` wrapper.
- Calls `listOAuthProviders` from `@api` to retrieve the enabled provider list.
- Unwraps the HTTP envelope via `getPayloadFromResponse` (`@/infrastructure/http/envelope.ts`).
- Reads the base URL from the shared axios `instance` (`@/infrastructure/http/client.ts`).
- **Consumed by** `Login.vue` and `Signup.vue` to render per-provider buttons (and hide all buttons when the list is empty).

## Notes

- `fetchProviders` is intentionally idempotent *and* failure-tolerant: a transient API error does **not** set `loaded = true`, so the next component mount will retry. Do not change this without reconsidering the degraded-UX trade-off.
- `oauthStartUrl` must be used with a full-page navigation (`window.location`, `<a href>`, etc.). A `RouterLink` or `fetch` call will break the OAuth redirect/cookie dance.
- The `PROVIDER_LABELS` map is intentionally minimal — only providers whose naive capitalization is wrong are listed. Adding a new provider to this map is optional; the fallback in `providerLabel` handles the common case.
