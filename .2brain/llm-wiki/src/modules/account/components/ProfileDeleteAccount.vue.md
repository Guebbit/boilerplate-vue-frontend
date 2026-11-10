---
source: src/modules/account/components/ProfileDeleteAccount.vue
sha256: 7ec96798e10264f900df99d88ad3292b2195d733101969de42755622d0a36247
signature: 7ec96798e10264f900df99d88ad3292b2195d733101969de42755622d0a36247
generated_at: 2026-11-10T03:20:45.451072+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/ProfileDeleteAccount.vue

## Purpose

Single-action account-deletion trigger for the profile page. It chains a confirmation dialog → store request → redirect-with-notice, and surfaces failures as an in-place blocking alert next to the button rather than a toast.

## Key elements

- **`handleDeleteAccount`** — entry point wrapped in `singleFlight` (prevents double-fires). Opens the shared dialog, then calls `requestAccountDelete()` on success or reports the error via `useBlockingError`.
- **`leaveWithNotice(schedule?)`** — after a successful deletion, navigates to the Home route and fires a toast (`profile-page.deletion-scheduled`) that includes the formatted `purgeAt` date.
- **`useBlockingError`** (`deleteError`, `reportDeleteError`, `clearDeleteError`) — holds the failure message locally so the visitor sees it beside the button; cleared on the next attempt.
- **`InlineErrorAlert`** — template-level component bound to `deleteError`; renders only when an error is present.
- **Named component block** (`<script>` with `name: 'ProfileDeleteAccount'`) — provides a stable name for devtools and `<KeepAlive>` since `<script setup>` cannot set one.

## Relationships

- **`src/modules/account/stores/profile.ts`** — calls `requestAccountDelete()` from `useAccountProfileStore`, which locks the account and schedules erasure server-side.
- **`src/modules/account/views/Profile.vue`** — parent view that renders this component in the bottom grid alongside `ProfileSessions` and `ProfileAddresses`.
- **`src/modules/account/tests/delete-account-panel.spec.ts`** — integration test covering the confirmation flow, success redirect, and error display.
- **`src/modules/account/tests/confirm-once.spec.ts`** — verifies the confirmation-dialog interaction (accept/dismiss) before the store call fires.

## Notes

- **Self-wrapped card.** Unlike its sibling panels, this component renders its own `<v-card>` to visually separate the most destructive action from the read-only panels above.
- **Blocking-error convention.** Failure is shown via `InlineErrorAlert` in-place, not a toast — consistent with `docs/theory/request-flow.md` for actions where the user has no other next step.
- **`singleFlight` guard.** Prevents a rapid double-click from issuing two deletion requests; the wrapper resolves the first call before accepting further clicks.
- **`purgeAt` is optional.** The API may or may not return a schedule; `leaveWithNotice` handles the undefined case gracefully via `schedule?.purgeAt`.
