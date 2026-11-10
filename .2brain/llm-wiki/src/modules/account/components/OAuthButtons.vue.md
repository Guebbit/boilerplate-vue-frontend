---
source: src/modules/account/components/OAuthButtons.vue
sha256: c0d7e25f2f661ef47174f4c9cb3f0dfe9f7a22721db8b3db0e514306b8587c26
signature: cd64d0744e292f11ec3997262c8e475c8d0fb7a86e14d8f13c5fbfa9570ab38b
generated_at: 2026-11-10T03:19:27.041343+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/OAuthButtons.vue

## Purpose

Shared "Continue with \<provider\>" block rendered inside both the Login and Signup views. It displays a divider, one button per enabled OAuth provider, and a terms/privacy notice. It renders nothing when no provider is enabled. Because a first sign-in via a provider *creates* the account, the notice is where the terms are surfaced before that implicit acceptance (the backend stamps acceptance at account-creation time).

## Key elements

- **`continueTo` (computed)** — Reads `route.query.continue`, validates it with `isSameOriginPath`, and passes it into `oauthStartUrl` so the OAuth round-trip lands back on the original destination.
- **`oauthProviders` (from store)** — Reactive list of enabled providers, fetched once via `fetchProviders()` (fire-and-forget; the store deduplicates subsequent calls).
- **Template** — Conditionally renders a `<v-divider>` label, one `<v-btn>` per provider (using `href` for a genuine top-level navigation), and an `<i18n-t>` terms notice with embedded `<RouterLink>`s to the Terms and Privacy static pages.
- **`data-test` attributes** — `oauth-{provider}` on each button and `oauth-terms-notice` on the notice paragraph, used by the spec.

## Relationships

- **`oauth-providers.ts`** — Source of the `useAccountOAuthProvidersStore` Pinia store, the `oauthStartUrl()` URL builder, and the `providerLabel()` display-name helper. This component is the primary UI consumer of that store.
- **`use-post-login-redirect.ts`** — Provides `isSameOriginPath()`, used to gate the `?continue=` query param before forwarding it to the OAuth start URL.
- **`Login.vue` / `Signup.vue`** — Parent views that import and render this component to present the OAuth option alongside the credentials form.
- **`oauth-buttons.spec.ts`** — Unit-test file covering the rendering, empty-state, and `data-test` selectors of this component.

## Notes

- Buttons use `v-btn`'s `:href` prop (a real `<a>` element) rather than `to` or a click handler. A top-level navigation is required for the OAuth redirect dance; SPA navigation via `RouterLink` or `router.push` would break it.
- `fetchProviders()` is called with a floating promise (`void …`) and an eslint-disable comment. The store's own logic makes a second mount a no-op, so the promise is intentionally not awaited here.
- The `?continue=` param is only forwarded when `isSameOriginPath` passes; otherwise it is dropped to prevent open-redirect vectors.
- The component is purely presentational aside from the store fetch — no local state, no props, no emitted events.
