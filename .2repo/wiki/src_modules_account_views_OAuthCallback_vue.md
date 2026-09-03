# src/modules/account/views/OauthCallback.vue

## Purpose

Transient landing view that the OAuth redirect chain hits after the provider callback. By the time it mounts, `tryRestoreAuth` in the router guard has already restored the session; this component only decides what to display next — redirect to `Home` on success, or render a translated error card (with a link back to `/login`) when the backend appended `?error=<code>`.

## Key elements

- **`KNOWN_ERROR_CODES`** — closed tuple (`access_denied`, `email_unverified`, `provider_error`) of the error codes the backend can redirect with. Any code outside this set falls back to the `provider_error` translation.
- **`errorMessage` (computed)** — reads `route.query.error`, validates it against `KNOWN_ERROR_CODES`, and returns the i18n string `oauth.callback-page.error-<code>`. Returns `undefined` when no error is present (i.e., login succeeded).
- **`onMounted` redirect** — when `errorMessage` is `undefined`, immediately `router.push`es to the `?continue=` target (if provided) or to the `Home` route via `routerLinkI18n`. When an error is present, the view stays mounted and shows the error card.
- **Template** — wraps content in `LayoutDefault`. If `errorMessage` exists, renders a `v-card` with the message and a `RouterLink` to `Login`. Otherwise renders a centered `v-progress-circular` spinner (the user sees this only for the brief moment before the redirect fires).

## Relationships

No graph-neighbor files are registered for this component. It imports shared infrastructure (`LayoutDefault`, `routerLinkI18n`, `vue-router`, `vue-i18n`) but those are not tracked as dependency-graph edges here.

## Notes

- This view is intentionally stateless and short-lived. Do not add business logic or form state here — its sole job is "redirect or explain."
- Unknown/future error codes never surface as raw strings; they always resolve to the `provider_error` copy. Adding a new backend error code requires appending it to `KNOWN_ERROR_CODES` **and** shipping a matching i18n key.
- The `?continue=` query param is currently unused by the OAuth flow but is honoured defensively to stay in sync with `Login.vue`'s post-login redirect behavior.
- The success path fires in `onMounted`, so the spinner in the template is visible only for a single frame (or not at all in fast networks). This is intentional — there is no loading state to manage.
