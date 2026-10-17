---
source: src/modules/feedback/views/Contact.vue
sha256: 950bc5d4f07534732992fbd4748bf70a1a3b0d9cc1e8a565fa9de8565e467ab8
generated_at: 2026-10-17T00:56:50.097927+00:00
model: ollama:qwen3.8:27b
---

# src/modules/feedback/views/Contact.vue

## Purpose

Public contact form for unauthenticated visitors. Validates input client-side with a Zod schema, attaches an antibot token, and submits through the feedback store. On success it resets itself in place; on failure it blocks the submit button with an inline error alert.

## Key elements

- **Named component block (`ContactPage`)** — provides a stable `name` for devtools / `<KeepAlive>` since `<script setup>` cannot declare one.
- **`ContactForm` interface** — shape of the form state: `name`, `email`, `subject`, `message`, and the honeypot field `website`.
- **`useStructureFormValidation<ContactForm>`** — wires up form state, Zod validation (email format, subject ≥ 1 char, message ≥ 10 chars), error display, and locale-triggered revalidation. `website` is intentionally left unvalidated.
- **`useBlockingError`** — local blocked-state for the submit button; exposes `submitError` (displayed via `InlineErrorAlert`) and `reportSubmitError` / `clearSubmitError`.
- **`submitForm`** — orchestrates the submit: clears prior error → calls `useFeedbackStore().submitContact` with `withAntibotToken(humanCheck.token)` → on success shows a toast and resets; on failure maps server errors or falls back to the blocking error.
- **`HumanCheck` (template ref `humanCheck`)** — antibot challenge widget; its `token` is attached unconditionally to every submission because the backend always requires it.
- **Honeypot input (`website`)** — visually removed from the page (`aria-hidden`, `tabindex="-1"`, off-screen) so real users never interact with it; a non-empty value on the server side flags the message as spam.
- **`useNotificationsStore().addMessage`** — dispatches success / "fix errors" toasts.

## Relationships

- **`src/modules/feedback/store.ts`** — imports `useFeedbackStore`; the form's only external data flow is `submitContact(payload, antibotToken)` which POSTs to the feedback inbox. No other store actions are used here.

## Notes

- The honeypot field is deliberately **not** validated or shown to the user; it is carried through verbatim so the backend can use its value as a spam signal. Do not add a Zod constraint or an error message for `website`.
- `HumanCheck`'s token is attached on **every** submit, not just after a first refusal, because the backend endpoint is always gated.
- An eslint-disable comment suppresses `no-unsafe-argument` / `no-unsafe-member-access` on the `humanCheck.value?.token` access; this is a known limitation of TypeScript-ESLint with Vue SFC template refs.
- Revalidation is keyed on `locale` so switching language re-runs Zod error messages in the new language without a manual trigger.
- The `name` field is optional in the schema and in the submitted payload (`form.value.name || undefined`); only `email`, `subject`, and `message` are required.
