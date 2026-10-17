---
source: src/modules/account/components/ProfileDeleteAccount.vue
sha256: 6f0caa02c60a391f296f813589ddb0d9dccb00a2e0143015cde9b5f1b4fd1384
generated_at: 2026-10-17T00:15:58.360825+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/ProfileDeleteAccount.vue

## Purpose

Renders a single "Delete account" button that, on click, opens a shared confirmation dialog and—on accept—calls `requestAccountDelete` from the profile store. The component is the most destructive control on the profile page and is intentionally given its own card rather than sharing a panel with less critical actions.

## Key elements

- **`handleDeleteAccount()`** — the sole action. Opens `useDialogStore().confirm(...)` with an `error`-colored prompt; on accept, clears any prior error, calls `requestAccountDelete()`, toasts success via `useNotificationsStore().addMessage`, or reports failure into the local `useBlockingError` slot.
- **`deleteError` / `reportDeleteError` / `clearDeleteError`** — destructured from `useBlockingError()`; provides a per-action error state rendered inline next to the button (no toast on failure).
- **`InlineErrorAlert`** — displays `deleteError` when present; hidden otherwise.
- **`<script>` (non-setup) block** — sets the component `name: 'ProfileDeleteAccount'` for devtools / `<KeepAlive>`; cannot be declared inside `<script setup>`.

## Relationships

- **`src/modules/account/stores/profile.ts`** — imports `useProfileStore` and calls `requestAccountDelete()`, which is the only data-mutation entry point in this file.
- **`src/modules/account/views/Profile.vue`** — parent view that places this component in the bottom card grid (alongside `ProfileSessions` and `ProfileAddresses`).

## Notes

- The confirmation dialog **closes before the request resolves**, so there is no UI surface to show an error in the dialog itself. The blocking-error pattern (`useBlockingError`) exists specifically to handle this gap: the failure is pinned next to the originating button.
- Success is communicated via a toast; failure is *not* toasted. This asymmetry is intentional (see `docs/theory/request-flow.md` referenced in the module doc).
- The card is self-contained (`v-card` lives in this component's template), matching the sibling components' convention in the profile grid.
