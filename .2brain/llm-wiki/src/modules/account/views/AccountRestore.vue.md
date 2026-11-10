---
source: src/modules/account/views/AccountRestore.vue
sha256: b77db70bf82a39e122edbc496d6afdab75e2528c3e03fe66789d340848813724
signature: 86eeffb0588135b29dd35da7cb899e0cc27d3d866a07e7c53132e054d73b7950
generated_at: 2026-11-10T03:45:11.184963+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/AccountRestore.vue

## Purpose
Landing page for the "your account is scheduled for deletion" email link. The one-time token in the URL is the sole credential, so the route requires no auth guard and is accessible to a signed-out visitor. Submitting the form cancels the pending deletion and redirects to the login page.

## Key elements
- **`name: 'AccountRestorePage'`** (default export) — Gives the SFC a stable name for devtools and `<KeepAlive>`, since `<script setup>` cannot declare one.
- **`restoreAccount`** — Destructured from `useAccountProfileStore()`; the action that cancels the scheduled deletion when the token form is submitted.
- **`copy`** — Object of i18n keys (`account-restore-page.*`) for intro, token label, submit button, validation error, and success message. Passed as a `:copy` prop to the card.
- **`testIds`** — Object of `data-test` attribute values (`account-restore-token`, `-submit`, `-error`) for e2e selectors. Passed as `:test-ids` to the card.
- **Template** — Single wrapper `<div id="account-restore-page">` containing one `<LinkTokenConfirmCard>` with `:spend="restoreAccount"` and `success-route="Login"`.

## Relationships
- **`src/modules/account/components/LinkTokenConfirmCard.vue`** — Imported and rendered as the sole child in the template. Receives `copy`, `test-ids`, `spend` (the store action), and `success-route`. This page is the "restore" (non-destructive) consumer of that shared card.
- **`src/modules/account/stores/profile.ts`** — `useAccountProfileStore()` is called to obtain `restoreAccount`, which is forwarded to the card as the `:spend` callback.
- **`src/modules/account/tests/link-token-confirm-card.spec.ts`** — Tests `LinkTokenConfirmCard` in isolation; relevant here because this page's behavior (token validation, error/success messaging) is largely delegated to that component.

## Notes
- The component is deliberately minimal: all form logic, validation, and success handling live in `LinkTokenConfirmCard`. This file only supplies the store action, i18n keys, and the `Login` success route.
- `success-route="Login"` means the user is **not** signed in after a successful restore; they must authenticate separately.
- The `id="account-restore-page"` on the root `<div>` is the page-level anchor used for routing/testing at the view level, distinct from the component-level `testIds`.
