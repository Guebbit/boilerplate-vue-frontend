---
source: src/modules/account/views/VerifyEmailConfirm.vue
sha256: 24b548498560ba00a5f59eb69c099af9897a722fa06a79eccbc057f372d0ccd4
generated_at: 2026-10-17T00:31:37.639824+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/VerifyEmailConfirm.vue

## Purpose

Public, unauthenticated confirm page that spends a one-time email-verification token delivered by email. The token is the credential (the visitor may not be signed in), and the page requires an explicit button press—rather than auto-firing on mount—so that a mail-client prefetch of the link cannot consume the token before the human arrives.

## Key elements

- **Component name block** (`<script>` without setup) — sets `name: 'VerifyEmailConfirmPage'` for devtools / `<KeepAlive>`; required because `<script setup>` cannot declare a name.
- **`submitForm()`** — clears any prior blocking error, calls `confirmEmailVerification(token)` via the profile store, pushes a success toast and navigates to Home on success, or routes the error into the inline `confirmError` alert on failure.
- **`useStructureFormValidation`** — wraps the single `token` field with a Zod schema (non-empty string), revalidates on locale change, and focuses the first invalid Vuetify field on submit.
- **`useLinkTokenCleanup(route, router)`** — strips the token from the URL (query/fragment) after mount so it stops propagating into analytics (Umami, Faro) and browser history.
- **`useBlockingError`** — provides `confirmError` / `confirmErrorType` for the inline `InlineErrorAlert` shown directly below the submit button when the token is spent or unknown.
- **Template** — a single Vuetify card containing a text field (`form.token`), a submit button with loading/disabled state, and the inline error alert.

## Relationships

- **`src/modules/account/stores/profile.ts`** — imports `useProfileStore` and calls its `confirmEmailVerification(token)` action to validate and consume the token server-side.

## Notes

- The page is intentionally **public**: no auth guard, no session check. The token in the link is the sole credential.
- The `.then(() => undefined)` after `router.push` is deliberate—navigation-failure reporting belongs to the router's own `onError`, not to this form's error channel.
- A failed confirmation (spent/unknown token) is surfaced as an **inline** alert next the button, not a toast, because no specific form field is at fault.
- The component must be reachable at the route name implied by `VerifyEmailConfirmPage`; it is expected to be wrapped in `<KeepAlive>` or referenced by name in devtools.
