---
source: src/modules/account/components/TermsAcceptanceCheckbox.vue
sha256: 503597210a08839d726dcaaa33a632cdefd31ece1e04ed869c1825ad7494ecf6
signature: 62eab4b6a578dc43b406d3818757fda04c23fc42fab0b654eb4f413e82a0f12d
generated_at: 2026-11-10T03:22:47.189621+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/TermsAcceptanceCheckbox.vue

## Purpose

A presentational, two-way-bound checkbox for "I accept the Terms and have read the privacy notice." It exists so that both the signup flow and the password-reset flow can share the exact same UI (label, links, i18n) without duplicating markup.

## Key elements

- **`accepted`** — `defineModel<boolean>({ default: false })`. The v-model binding the parent reads/writes to track acceptance. The component itself never modifies this value beyond the two-way binding.
- **`v-checkbox` (Vuetify)** — The rendered widget. All non-declared attributes (`data-test`, `:error`, `:error-messages`, etc.) fall through to it via Vuetify's attribute passthrough.
- **`i18n-t` with `#terms` / `#privacy` slots** — Interpolates two `RouterLink`s into the translated sentence `signup-page.text-terms`. Each link uses `routerLinkI18n` to resolve to the localized `StaticTerms` / `StaticPrivacy` routes.
- **`@click.stop`** on both `RouterLink`s — Prevents a link navigation from also toggling the checkbox, since Vuetify makes the entire label clickable.

## Relationships

- **`src/modules/account/views/Signup.vue`** — Parent that binds `v-model` to this component and reads `accepted` to gate form submission.
- **`src/modules/account/views/PasswordResetConfirm.vue`** — Parent that conditionally renders this component when the account holds no existing Terms acceptance record (the setup page of a staff-created account).

## Notes

- The checkbox is **never pre-ticked**. The holder's own explicit tick is the only source of a "Terms accepted" record; there is no server-side or local-storage default.
- Because the component is purely presentational (no business logic, no API calls), all validation and record-creation live in the two parent views.
- The label text lives under the i18n key `signup-page.text-terms` despite being reused on the password-reset page as well; the key name is a legacy artifact of it originally existing only in the signup flow.
