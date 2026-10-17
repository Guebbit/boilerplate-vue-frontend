---
source: src/modules/account/components/OAuthButtons.vue
sha256: 401e573b94f54695ce79419bc36c0384cfa93c9aadd133910ebd7abd34768e29
generated_at: 2026-10-17T00:15:00.575419+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/OAuthButtons.vue

## Purpose

Shared "Continue with \<provider\>" block rendered by both the Login and Signup views. It displays a divider, one outlined button per enabled OAuth provider, and a terms/privacy notice explaining that the first sign-in with a provider creates the account (the backend stamps the acceptance at that point). The entire block is hidden when no provider is enabled.

## Key elements

- **`oauthProviders`** — reactive list of enabled providers, pulled from `useOAuthProvidersStore` via `storeToRefs`. A `fetchProviders()` call is issued on mount; the store dedupes so a re-mount is a no-op.
- **`continueTo`** (computed) — reads `route.query.continue`, validates it with `isSameOriginPath`, and forwards it to `oauthStartUrl` so the OAuth round-trip returns to the original destination.
- **`oauthStartUrl(provider, { continueTo, locale })`** — builds the provider's authorization URL (imported from the OAuth store).
- **`providerLabel(provider)`** — human-readable name for the button text (imported from the OAuth store).
- **`routerLinkI18n`** — locale-aware route resolution used for the Terms and Privacy `RouterLink`s inside the `i18n-t` notice.
- **Template guard** — `v-if="oauthProviders.length > 0"` renders nothing when no provider is configured.

## Relationships

- **`src/modules/account/stores/oauth.ts`** — source of the provider list, URL builder, and label helper. The component calls `fetchProviders()` on mount and reads the reactive `providers` ref.
- **`src/modules/account/composables/use-post-login-redirect.ts`** — supplies `isSameOriginPath`, used to sanitize the `?continue=` query parameter before forwarding it to the OAuth start URL.
- **`src/modules/account/views/Login.vue`** — consumer; renders this component as the OAuth section of the login form.
- **`src/modules/account/views/Signup.vue`** — consumer; renders the same component so the signup flow offers identical provider buttons and the same terms notice.
- **`src/modules/account/tests/oauth-buttons.spec.ts`** — unit/integration spec exercising this component's rendering and button hrefs.

## Notes

- **Buttons are real `<a href>` elements, not `RouterLink`s or click handlers.** The `v-btn` `href` prop is used deliberately: the OAuth redirect requires a top-level navigation that a SPA route change or synthetic click cannot produce. Do not refactor these to `RouterLink` or `@click`.
- **The terms/privacy notice lives here (not on the static page) because the backend records acceptance at account-creation time**, i.e. on the first OAuth sign-in. Moving it elsewhere would decouple it from the moment it is legally relevant.
- **`fetchProviders()` is called unconditionally on mount**, but the store guards against duplicate in-flight requests, so multiple mounts (e.g. tab switching) are safe.
