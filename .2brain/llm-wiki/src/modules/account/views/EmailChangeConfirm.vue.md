---
source: src/modules/account/views/EmailChangeConfirm.vue
sha256: 1f11910d756b71fba2de2e4d8650357db40c3d38014553a2f9fa1a6a7c9d851d
signature: f99e5e56c68b37400ff2ffffa7e39a65551b15d796eb445076ce8e325a07ee88
generated_at: 2026-11-10T03:45:40.272578+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/EmailChangeConfirm.vue

## Purpose

Public confirmation page for a user-initiated email change. The user enters the one-time token that was mailed to the **new** address to complete the change. It is a thin page: all form logic lives in `LinkTokenConfirmCard`, and the API call comes from the profile store.

## Key elements

- **`name: 'EmailChangeConfirmPage'`** (named `<script>` block) — gives the SFC a stable component name for devtools and `<KeepAlive>`; `<script setup>` cannot declare one, so it lives in a separate default-export block.
- **`copy`** — object of i18n keys (`email-change-confirm-page.*`) for intro, label, submit, validation error, and success message. Passed into the card as a prop.
- **`testIds`** — `data-test` attribute values (`email-change-token`, `email-change-submit`, `email-change-confirm-error`) for E2E selectors. Passed into the card.
- **`confirmEmailChange`** — destructured from `useAccountProfileStore()`; passed as the card's `spend` prop (the async action that validates the token server-side).
- **Template** — wraps `LinkTokenConfirmCard` with `success-route="Home"`, so a confirmed change navigates to the Home page where the new address is visible in a live session.

## Relationships

- **`src/modules/account/components/LinkTokenConfirmCard.vue`** — the single form component this page renders. Receives `copy`, `test-ids`, `spend` (the confirm action), and `success-route`. All input/validation/success UI lives there; this page supplies only data and routing.
- **`src/modules/account/stores/profile.ts`** — source of `confirmEmailChange`. This page calls no other store actions; the store handles the token-validation API call and any state updates.

## Notes

- The token consumed here is a **different server-side token type** from the verify-email confirm token, even though both pages use the same `LinkTokenConfirmCard` form. The server never cross-validates them; the distinction is entirely in the action passed as `spend`.
- The separate named-`<script>` block is intentional and required — it is not redundant with `<script setup>`.
- `success-route` is the literal string `"Home"`, not a route object; navigation is delegated to the card component.
