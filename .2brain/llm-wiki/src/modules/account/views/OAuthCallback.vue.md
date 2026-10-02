---
source: src/modules/account/views/OAuthCallback.vue
sha256: 337d14840a01241d0265b5f083eb62159dd226c0fd480be3856405c4463886e0
generated_at: 2026-10-02T12:36:46.258897+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/OAuthCallback.vue

## Purpose

Landing view for the OAuth redirect chain. By the time this component mounts, the router's global guard (`tryRestoreAuth`) has already restored the session (or not). This view's sole job is to decide the next destination: navigate to `Home`/`?continue=`, push to `TwoFactorChallenge` when 2FA is required, or render a translated error card with a link back to `/login`.

## Key elements

- **`KNOWN_ERROR_CODES`** — Closed tuple of the four error codes the backend may redirect with (`access_denied`, `email_unverified`, `account_unverified`, `provider_error`). Any other value falls back to the `provider_error` copy.
- **`errorMessage` (computed)** — Reads `route.query.error`, maps it through `KNOWN_ERROR_CODES`, and returns the i18n string. `undefined` when no error is present.
- **`oauthChallenge` (computed)** — Parses `?mfaRequired=1&expiresAt=…&methods=…&defaultMethod=…` from the query string into a structured object. Returns `undefined` on any malformed input so the view degrades to a plain success redirect.
- **`onMounted`** — The single decision point:
  1. Error → do nothing (card stays visible).
  2. 2FA challenge → calls `useTwoFactorStore().beginOAuthChallenge(…)` then `router.push('TwoFactorChallenge')`.
  3. Plain success → calls `redirectAfterLogin()` from `usePostLoginRedirect`.
- **`redirectAfterLogin`** (from `usePostLoginRedirect`) — Handles `?continue=` and saved-locale preference identically to the password-login step.
- **Template** — Either a `v-card` with the translated error + a `RouterLink` to `Login`, or an indeterminate `v-progress-circular` spinner (shown only briefly while `onMounted` resolves).

## Notes

- **No login happens here.** The session is restored upstream by the router guard; this view only *routes*.
- **The 2FA challenge token is never in the URL.** It lives in an httpOnly cookie set by the backend; `beginOAuthChallenge` in the store handles it. The query string carries only metadata (`expiresAt`, `methods`, `defaultMethod`).
- **`JSON.parse` on `route.query.methods` can throw.** It is wrapped in `try/catch` because `methods` arrives as a URL-encoded JSON string with no safe non-throwing alternative.
- **Unknown `error` codes are intentional fallbacks**, not bugs — a future backend code not yet known to this build will display the generic `provider_error` message rather than a raw token.
- The component is intentionally stateless beyond the two computeds; there is no reactive data of its own.
