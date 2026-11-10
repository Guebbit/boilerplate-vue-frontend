---
source: src/modules/account/views/OAuthCallback.vue
sha256: 8ba6c9f5efd9e3d4aae743c50d9c64ffce517920d18036b93f41fe5181be54ac
signature: ec306e6a9ed75e50e99204affb9848ae003f21bc680b8af5e088dfb31e238f06
generated_at: 2026-11-10T03:46:41.813000+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/OAuthCallback.vue

## Purpose

Landing view for the OAuth redirect chain. By the time it mounts, the router's global guard (`tryRestoreAuth`) has already restored or minted a session. This view's sole job is to read the query-string flags the backend set and dispatch the user to the correct next step: a plain success redirect, the 2FA challenge, the account-restore challenge, a "provider connected" toast, or a translated error card.

## Key elements

- **`errorMessage` (computed)** – Maps `?error=<code>` against the closed set `OAUTH_CALLBACK_ERRORS`; unknown codes fall back to `provider_error`. Returns `undefined` on success.
- **`oauthChallenge` (computed)** – Parses `?mfaRequired=1`, `?expiresAt`, `?methods` (JSON), and optional `?defaultMethod` into a typed object. Returns `undefined` if any field is missing or `methods` fails to parse.
- **`oauthDeletion` (computed)** – Reads `?deletionPending=1`, `?purgeAt`, `?expiresAt` for the deletion-grace restore flow. Returns `undefined` if dates are absent.
- **`onMounted`** – Sequential decision: error → linked-provider toast → deletion restore → 2FA challenge → plain success. Each non-success branch calls the relevant store method, then `router.push`es to the target route.
- **`KNOWN_ERROR_CODES`** – Alias for `OAUTH_CALLBACK_ERRORS` from the oauth-providers store; guards against unknown/future error codes leaking raw strings into the UI.
- **Named component block** – A plain `<script>` export declares `name: 'OAuthCallbackPage'` for devtools and `<KeepAlive>` compatibility (not possible inside `<script setup>`).

## Relationships

- **`src/modules/account/composables/use-post-login-redirect.ts`** – Provides `redirectAfterLogin()`, the final navigation helper used on plain success and after a linked-provider toast. Handles `?continue=` and saved-locale preferences.
- **`src/modules/account/stores/oauth-providers.ts`** – Supplies the `OAUTH_CALLBACK_ERRORS` constant (error-code contract) and `providerLabel()` for the "provider connected" toast text.
- **`src/modules/account/stores/two-factor.ts`** – `useAccountTwoFactorStore().beginOAuthChallenge()` stores the parsed challenge metadata before navigating to `TwoFactorChallenge`. The actual challenge token travels in an httpOnly cookie, not the query string.
- **`src/modules/account/stores/deletion-restore.ts`** – `useAccountDeletionRestoreStore().beginOAuth()` stores the purge/expiry dates before navigating to `AccountRestoreChallenge`.
- **`src/modules/account/tests/oauth-callback-view.spec.ts`** – Unit tests exercising the view's query-param branches and navigation calls.

## Notes

- The 2FA challenge **token** is deliberately absent from the query string; it lives in an httpOnly cookie read by the backend. `oauthChallenge` only carries metadata (expiry, method list, default).
- `parseJsonSafe` is used for the `methods` query value: a hand-edited or truncated URL yields `undefined`, treated identically to "no challenge" (no partial recovery).
- Error codes not present in `OAUTH_CALLBACK_ERRORS` never render as raw strings; they always fall back to the generic `provider_error` i18n key.
- All `router.push` / `redirectAfterLogin` calls are fire-and-forget (`void`); navigation failures surface through the app-level `router.onError` handler, not here.
- The template is minimal: a spinner while `onMounted` decides, or a single error card with a back-to-login link. No user interaction beyond that link.
