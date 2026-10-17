---
source: src/modules/account/views/EmailChangeUndo.vue
sha256: 8bf4bb8e40a020fae2e7f8e1975f8b2e6c8664e672304ed385f48e4321dccf62
generated_at: 2026-10-17T00:29:32.999446+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/EmailChangeUndo.vue

## Purpose

The public undo page for an email-address change. The user clicks a link delivered to their **old** address; the link carries a one-time token that this page submits to revert the change. It mirrors the shape of the confirm page but uses a different token type (`EMAIL_CHANGE_UNDO_TOKEN_TYPE`). A submit button (rather than auto-firing on mount) ensures a mail scanner that prefetches the link cannot spend the token before the human arrives.

## Key elements

- **`EmailChangeUndoForm`** – interface holding the single `token` field prefilled from the URL via `readLinkToken(route)`.
- **`useStructureFormValidation<EmailChangeUndoForm>`** – toolkit composable providing `form`, `formErrors`, `showFormErrors`, `isSubmitting`, and `handleSubmit`. Validates the token is non-empty; revalidates on locale change.
- **`useLinkTokenCleanup(route, router)`** – strips the token from the URL after mount so it does not persist in browser history or analytics payloads (Umami, Faro).
- **`useBlockingError()`** – dedicated error surface for token-level failures (spent/unknown) that don't map to a form field; rendered next to the submit button via `InlineErrorAlert`.
- **`submitForm()`** – calls `undoEmailChange(token)` from the profile store; on success shows a toast and navigates to `Login`; on failure routes the error into the blocking-error state.
- **`InlineErrorAlert`** – template component that displays the blocking error inline (not as a toast).

## Relationships

- **`src/modules/account/stores/profile.ts`** – provides `useProfileStore`, from which this page destructures `undoEmailChange(token)`. That action is the sole server call that spends the undo token.

## Notes

- Success always navigates to **Login**, not back to a previous page, because the server terminates all active sessions as part of the undo.
- The token type is distinct from the confirm-page token (`account/services/token-types.ts`); they are not interchangeable.
- A separate `export default { name: 'EmailChangeUndoPage' }` block is required because `<script setup>` cannot declare a component name; this enables `<KeepAlive>` and stable devtools identification.
- `submitForm` swallows the `router.push` return value with `.then(() => undefined)` so a failed navigation is reported by the router's own `onError`, not by this form's error handler.
