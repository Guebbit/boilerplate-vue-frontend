---
source: src/modules/account/views/EmailChangeUndo.vue
sha256: 086110c6ed26b96e0eb4fa4883f6941f0928c0b473aa0822395517be511d1998
signature: d11e03eefb77b87133928a94b1e7e1d68c0692ea3aa79606bddf954bb8014358
generated_at: 2026-11-10T03:45:49.877633+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/EmailChangeUndo.vue

## Purpose

Page component for the email-change undo flow. The undo link is delivered to the *old* address and carries its own token type as the credential. All form logic is delegated to `LinkTokenConfirmCard`; on success the user is routed to **Login** because the server has already terminated every active session.

## Key elements

- **`export default { name: 'EmailChangeUndoPage' }`** — Stable component name for devtools and `<KeepAlive>`; required in a separate block because `<script setup>` cannot declare it.
- **`copy`** — Object of i18n keys (`email-change-undo-page.*`) passed as the `copy` prop to the card.
- **`testIds`** — `data-test` attribute values (`email-change-undo-token`, `-submit`, `-error`) passed as the `test-ids` prop.
- **`undoEmailChange`** — Action pulled from `useAccountProfileStore`; passed as the `spend` callback so the card can invoke the API call without knowing store internals.
- **Template** — Renders a single `<LinkTokenConfirmCard>` with `success-route="Login"`.

## Relationships

- **`src/modules/account/components/LinkTokenConfirmCard.vue`** — The only child rendered. This page supplies it with `copy`, `test-ids`, `spend` (the store action), and `success-route`. All token-validation and submission UX lives in the card.
- **`src/modules/account/stores/profile.ts`** — Source of the `undoEmailChange` action. This page is the only view that injects it into the card's `spend` prop.
- **`src/modules/account/tests/link-token-confirm-card.spec.ts`** — Unit tests for the card component itself; exercises the same `spend`/`copy`/`test-ids` contract this page relies on.

## Notes

- The file uses **two `<script>` blocks** (a plain one for `name`, a `setup` one for logic). This is intentional and required—don't merge them.
- `success-route` is the string `"Login"`, not a path object; the card is expected to resolve it to a route.
- The token consumed here is a *different* server-side token type from the initial email-change confirmation token; don't reuse the same endpoint or parameter names.
