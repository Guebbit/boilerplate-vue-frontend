---
source: src/modules/account/views/OAuthCallback.vue
sha256: 3bab813f3d64e5259e56bac889f6fe4994be49521ef8b852cc1cbb8c970f9b98
generated_at: 2026-10-17T00:30:01.272699+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/OAuthCallback.vue

## Purpose

Landing view for the OAuth redirect chain. By the time this component mounts, the session (if any) has already been restored by the router's global guard. This file's sole job is to inspect the query string and decide the next navigation: route to `TwoFactorChallenge` when 2FA is required, call `redirectAfterLogin()` for a plain success, or render a translated error card for a failed redirect.

## Key elements

- **`OAuthCallbackPage`** — Named component block (separate `<script>` tag) providing a stable name for `<KeepAlive>` / devtools; `<script setup>` cannot declare one itself.
- **`KNOWN_ERROR_CODES`** — Closed tuple of the four error codes the backend may redirect with (`access_denied`, `email_unverified`, `account_unverified`, `provider_error`). Unknown codes fall back to `provider_error`.
- **`errorMessage`** (computed) — Reads `route.query.error`; returns a translated string via `t('oauth.callback-page.error-<code>')` or `undefined` on success.
- **`oauthChallenge`** (computed) — Reads `mfaRequired`, `expiresAt`, `methods`, and optionally `defaultMethod` from the query string; `JSON.parse`s `methods` into `TwoFactorMethodSummary[]`. Returns `undefined` on any malformed input (treated as no challenge).
- **`onMounted`** — Performs the one-time navigation decision: (1) bail if `errorMessage` is set, (2) call `useTwoFactorStore().beginOAuthChallenge(...)` and push to `TwoFactorChallenge`, (3) otherwise call `redirectAfterLogin()`.
- **Template** — Renders either a `v-card` with the error message + a `RouterLink` back to `/login`, or a `v-progress-circular` spinner (the user is about to be navigated away).

## Relationships

- **`use-post-login-redirect.ts`** — Provides `redirectAfterLogin()`, the same post-login `?continue=` / saved-locale redirect used by the password login step. Called in `onMounted` for the plain-success path.
- **`two-factor.ts`** — Provides `useTwoFactorStore()`. On the 2FA path, the parsed `oauthChallenge` object is passed to `store.beginOAuthChallenge()` before navigating to `TwoFactorChallenge`. The challenge token itself is *not* in the URL; it travels in an httpOnly cookie read only by the backend (see `beginOAuthChallenge`).

## Notes

- The 2FA challenge token is deliberately absent from the query string; only metadata (`expiresAt`, `methods`, `defaultMethod`) is passed. The token is an httpOnly cookie consumed by `POST /account/login/2fa[/send]`.
- `JSON.parse` on `route.query.methods` is the one un-wrapped `try/catch` in this file. A malformed or hand-edited URL simply produces `undefined`, which the `onMounted` guard treats as "no challenge" and falls through to `redirectAfterLogin()`.
- If the backend adds a new error code that this build predates, the user sees the generic `provider_error` translation rather than a raw string.
- The component renders nothing useful on success or 2FA (just a spinner); the real UI lives on the destination page.
