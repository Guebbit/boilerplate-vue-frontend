---
source: src/modules/feedback/views/Contact.vue
sha256: 748f2eb51f992cdf5b71918858bfb4f3805ea62855ab5cff9b231c291a6a037e
generated_at: 2026-10-02T15:07:51.440242+00:00
model: ollama:qwen3.8:27b
---

# src/modules/feedback/views/Contact.vue

## Purpose

Public contact form available without authentication. It collects name, email, subject, and message from a visitor, validates them client-side against a Zod schema, and submits the payload through the feedback store. Anti-bot protection is layered via a hidden honeypot field and a `HumanCheck` challenge token attached to every request.

## Key elements

- **`ContactForm` interface** — shape of the form state; includes the `website` honeypot field (never shown to the user).
- **`useStructureFormValidation<ContactForm>(…)`** — creates reactive `form`, `formErrors`, `handleSubmit`, `resetForm`, and `applyServerErrors` from a Zod schema; revalidates on locale change and targets Vuetify's invalid-field selector for scroll/focus.
- **`submitForm()`** — top-level submit handler: clears any prior blocking error → calls `submitContact` with the antibot token → on success, toasts and resets the form in place; on failure, maps server errors or escalates to the blocking-error slot.
- **`useBlockingError()`** — dedicated inline error state (`submitError`, `report`, `clear`) surfaced through `InlineErrorAlert` beneath the submit button.
- **`humanCheck` (template ref to `HumanCheck`)** — provides the `.token` consumed by `withAntibotToken` on every submission.
- **Honeypot `<input name="website">`** — positioned off-screen, removed from the accessibility tree (`aria-hidden`, `tabindex="-1"`), and marked `autocomplete="off"`; a non-empty value is treated as spam by the backend.
- **Zod schema** — `email` must be valid, `subject` and `message` have minimum lengths, `name`/`website` are optional; all error messages are i18n-keyed.

## Relationships

No direct import or reference to `src/infrastructure/utils/logger.ts` or `src/modules/account/views/TwoFactorChallenge.vue` is present in this file. They appear as graph neighbours likely through shared transitive dependencies (e.g., the Vue toolkit or feedback store) rather than a direct call.

## Notes

- The `website` honeypot is deliberately **not validated** by the Zod schema (marked `optional` with no constraint) — the backend alone decides whether a filled value indicates spam. The form only passes the value through unmodified.
- `name` and `website` are sent as `undefined` (not `""`) when blank (`form.value.x || undefined`), while `email`, `subject`, and `message` fall back to empty strings.
- `revalidateOn: locale` ensures that switching language re-runs validation so inline error messages update without the user re-triggering submit.
- The `HumanCheck` token is attached **unconditionally** on every submit (not only after a first refusal) because the backend endpoint is always gated by `humanChallengeGate`.
- An eslint-disable comment suppresses `@typescript-eslint/no-unsafe-argument` / `no-unsafe-member-access` on the `humanCheck.value?.token` access — TS-ESLint cannot fully resolve the SFC instance type exposed via `defineExpose`.
