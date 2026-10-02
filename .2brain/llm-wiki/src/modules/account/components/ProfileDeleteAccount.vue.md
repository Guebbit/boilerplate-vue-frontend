---
source: src/modules/account/components/ProfileDeleteAccount.vue
sha256: 044d49146f68a02f949575eb98481273fe44bbc56781b14f5a202f7c23bae4ec
generated_at: 2026-10-02T12:10:54.587014+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/ProfileDeleteAccount.vue

## Purpose

A single-button card that initiates account deletion. It exists to isolate the most destructive action on the profile page into its own card (matching the sibling pattern of `ProfileSessions` and `ProfileAddresses`) and to gate the destructive API call behind a shared confirmation dialog.

## Key elements

- **`handleDeleteAccount()`** — Opens the app's confirmation dialog (`useDialogStore().confirm`), and on acceptance calls `requestAccountDelete()` from `useProfileStore`. Success is reported via `addMessage` (notifications store); failure is captured by `reportDeleteError`.
- **`useBlockingError()` destructure** (`deleteError`, `reportDeleteError`, `clearDeleteError`) — Provides a local, in-place error state that is rendered directly under the button via `InlineErrorAlert`, rather than as a global toast.
- **`useDialogStore().confirm`** — Chained `.then()` flow: the dialog closes *before* the request resolves, so the blocking-error pattern is the only channel for surfacing a failure.
- **Template** — A `v-card` with a single `v-btn` (color `error`, variant `tonal`, `block`) and an optional `InlineErrorAlert`. Both carry `data-test` attributes (`profile-delete-account`, `profile-delete-account-error`).

## Relationships

No interaction with the listed graph neighbor (`src/infrastructure/utils/logger.ts`) is visible in this file's imports or logic.

Actual runtime dependencies:
- **`@/modules/account/stores/profile.ts`** — source of `requestAccountDelete()`.
- **`@/infrastructure/utils/use-blocking-error.ts`** — composable providing the local error state.
- **`@/ui/dialog.ts`** — global confirmation dialog store.
- **`@/ui/molecules/InlineErrorAlert.vue`** — renders the blocking error message.
- **`@guebbit/vue-toolkit`** (`useNotificationsStore`) — success toast.

## Notes

- The confirmation dialog resolves *before* the HTTP request completes, so a failure cannot be surfaced through the dialog. The in-place `useBlockingError` pattern is intentional (see `docs/theory/request-flow.md` referenced in the module doc-comment).
- `clearDeleteError()` is called on the *next* attempt (after a new dialog is accepted) rather than on mount, ensuring a prior error stays visible until the user retries.
- The component is self-contained in its own `v-card`; it does not expect a parent to provide card layout.
