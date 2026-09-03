# src/modules/feedback/views/Contact.vue

## Purpose
Public, no-auth-required contact form for visitors to submit feedback directly to the admin inbox. It validates user input against a Zod schema, delegates submission to the feedback store, and resets itself on success.

## Key elements

- **`ContactForm` interface** — shapes the form state (`name`, `email`, `subject`, `message`, `website`). The `website` field is a honeypot; a filled value flags the submission as spam server-side.
- **`useStructureFormValidation<ContactForm>(…)`** — wires up the form state (`form`), per-field errors (`formErrors`), submit lifecycle (`handleSubmit`, `isSubmitting`, `resetForm`), and locale-aware revalidation. Uses `VUETIFY_INVALID_FIELD_SELECTOR` for native browser validation focus and toasts a generic "fix errors" message on invalid submit.
- **`submitForm`** — the `<form>` submit handler. Calls `submitContact` from `useFeedbackStore`, maps empty strings to `undefined` for optional fields, shows a success toast + resets on resolve, or dispatches error toasts via `notifyErrorMessages` on reject.
- **Honeypot `<input>`** (`form.website`) — positioned off-screen (`-left-[9999px]`, zero dimensions), removed from a11y tree (`aria-hidden`) and tab order (`tabindex="-1"`), with `autocomplete="off"`. Never validated client-side; the BE interprets a non-empty value as spam.

## Relationships

- **`useFeedbackStore`** (`@/modules/feedback/store.ts`) — provides `submitContact`, the actual network/persistence action.
- **`notifyErrorMessages`, `VUETIFY_INVALID_FIELD_SELECTOR`** (`@/infrastructure/utils/errors.ts`) — error-toast dispatching and the CSS selector for marking invalid Vuetify fields.
- **`src/infrastructure/utils/logger.ts`** — listed as a graph neighbor; not directly imported here. Likely reached indirectly through `errors.ts` or `vue-toolkit` internals.
- **`LayoutDefault`** (`@/app/layouts/LayoutDefault.vue`) — wraps the page in the standard site chrome.
- **`useNotificationsStore`** (`@/vue-toolkit`) — toast/dismiss notifications for success and validation errors.

## Notes

- The honeypot is deliberately **not** validated by the Zod schema (it's `z.string().optional()`). Its purpose is purely to be carried through to the BE untouched; adding a `.min(1)` or similar would break the "empty = legitimate" invariant.
- `revalidateOn: locale` means the Zod schema re-evaluates error messages when the i18n locale changes — the `error` callbacks capture `t` from `useI18n()` at setup time, so a locale switch without this option would leave stale translations in error strings.
- `form.value.name` and `form.value.website` are coalesced with `||` (empty string → `undefined`), while `email`, `subject`, `message` use `??` (empty string stays). This distinction matters for the BE's required-vs-optional contract.
- The form element carries `novalidate` to suppress native browser validation popups; `useStructureFormValidation` handles the UX via Vuetify error messages instead.
