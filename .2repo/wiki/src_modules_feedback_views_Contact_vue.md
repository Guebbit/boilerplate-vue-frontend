# src/modules/feedback/views/Contact.vue

## Purpose

Renders the public, unauthenticated contact form that lets any visitor submit a message to the feedback inbox. It validates input client-side with a Zod schema and delegates the actual submission to the feedback store, resetting the form on success.

## Key elements

- **`ContactForm` interface** — defines the four fields (`name`, `email`, `subject`, `message`) passed to `useAppForm`.
- **Zod schema (inline in `setup`)** — enforces: optional `name`, valid `email`, `subject` ≥ 1 char, `message` ≥ 10 chars. Error messages are i18n keys.
- **`useAppForm<ContactForm>(…)`** — provides `form`, `formErrors`, `showFormErrors`, `isSubmitting`, `handleSubmit`, `resetForm`. The `formElement` ref is passed so native browser validation UI can be triggered.
- **`submitForm()`** — calls `handleSubmit` → `submitContact` (from `useFeedbackStore`). On success: dispatches a toast via `useNotificationsStore` and calls `resetForm()`. On failure: routes the error through `notifyErrorMessages`.
- **`LayoutDefault`** — wraps the page with the site-wide header/footer and sets the page `id="contact-page"` and i18n title.
- **Template** — a single `v-card` containing four `v-text-field`/`v-textarea` inputs and a submit `v-btn` bound to `isSubmitting`.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — listed as a graph neighbor but not directly imported or referenced in this file. Any interaction is likely indirect (e.g., via `notifyErrorMessages` or the feedback store) and not visible in this component's source.

## Notes

- `name` is the only truly optional field; the other three are effectively required by their Zod constraints.
- The form uses `novalidate` on the `<form>` element and relies entirely on the Zod schema + `useAppForm` for validation rather than native HTML5 constraints.
- `notifyErrorMessages` (from `@/infrastructure/utils/errors.ts`) is the sole error-display path; there is no inline per-field error on submit failure—only a toast.
- All user-facing strings go through `t('contact-page.*')` i18n keys; no hardcoded copy in the template.
