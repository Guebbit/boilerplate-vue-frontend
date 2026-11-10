---
source: src/modules/tasks/views/Contact.vue
sha256: da3719577561fd60ee46aa40e169c99607585f689e61907ccce8c4bc13ba08aa
signature: da3719577561fd60ee46aa40e169c99607585f689e61907ccce8c4bc13ba08aa
generated_at: 2026-11-10T06:01:39.239720+00:00
model: ollama:qwen3.8:27b
---

# src/modules/tasks/views/Contact.vue

## Purpose
Public, unauthenticated contact form for visitors. Accepts name, email, subject, optional category/order-number (pre-filled from `?category=` / `?order=` query params), and a message; validates via Zod and submits through the tasks store. Includes a honeypot field, a human-challenge widget, and a fallback support-email link.

## Key elements

- **`ContactPage`** – component name declared in a separate `<script lang="ts">` block (required for `<KeepAlive>` / devtools; `<script setup>` cannot set it).
- **`ContactForm`** – interface defining the form shape, including the honeypot `website` field.
- **`categoryFromLink()` / `orderFromLink()`** – read `route.query.category` and `route.query.order` to pre-fill the form; both validate/truncate against known values.
- **`categoryOptions`** (computed) – dropdown items with i18n labels, led by a "no category" (`undefined`) entry.
- **`useStructureFormValidation<ContactForm>`** – provides `form`, `formErrors`, `handleSubmit`, `resetForm`, `applyServerErrors`, and `isSubmitting`; revalidates on `locale` change.
- **`useBlockingError()`** – dedicated submit-blocked state (`submitError`, `reportSubmitError`, `clearSubmitError`) shown via `InlineErrorAlert`.
- **`submitForm()`** – orchestrates validation → `submitContact(payload, antibotToken)` → success toast (echoes typed email) → `resetForm()`; on failure applies server errors or reports a blocking error.
- **`loadConfig()`** – called unconditionally so `publicConfig.supportEmail` is available for the fallback link.
- **`withAntibotToken(humanCheck.value?.token)`** – attaches the challenge token to every submission.

## Relationships

- **`src/modules/tasks/schemas.ts`** – imports `contactSchema` (Zod validation) and `orderNumberMax` (max length for the order-number field).
- **`src/modules/tasks/store.ts`** – imports `useTasksStore` and calls `submitContact(payload, antibotToken)` to dispatch the REST request.
- **`contracts/rest/index.ts`** – provides the `TaskCategory` type (via `@types` re-export) used for the category enum and form typing.
- **`src/infrastructure/utils/logger.ts`** – used indirectly: `loadConfig()` logs (rather than throws) on fetch failure, which is why the call is fire-and-forget.
- **`src/modules/tasks/tests/contact-view.spec.ts`** – unit/component test suite for this view.
- **`src/modules/account/views/TwoFactorChallenge.vue`** – shares the `HumanCheck` organism and the antibot-token pattern, but this file does not import it directly.

## Notes

- **Honeypot positioning** – the `website` input is placed at `absolute left-[-9999px] size-0 overflow-hidden` with `aria-hidden` and `tabindex="-1"`. This is deliberate: `display:none` / `sr-only` would either let a screen-reader user reach it (failing a11y) or hide it from bots. The eslint-disable on the Tailwind restriction class is intentional.
- **Component name in a second `<script>` block** – do not merge it into `<script setup>`; the two blocks serve different purposes.
- **`loadConfig()` never rejects** – it logs and leaves the address unset; hence the `no-floating-promises` disable.
- **`revalidateOn: locale`** – form validation messages re-render when the user switches language; this is a convention from `useStructureFormValidation`, not something this file enforces.
- **Success does not navigate** – the form resets in place; the visitor stays on the page and can send another message.
- **Multiple `@typescript-eslint/no-unsafe-*` disables** – a known TS-ESLint limitation with `InstanceType<typeof SFC>` on template refs; the exposed members (`formElement`, `token`) are verified in the child components' `defineExpose`.
