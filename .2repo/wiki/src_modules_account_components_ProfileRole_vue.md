# src/modules/account/components/ProfileRole.vue

## Purpose

A self-contained role-switch widget that lets an administrator viewing **their own** profile toggle their role between standard user and administrator. It is deliberately rendered outside the main profile form because a role change hits a different endpoint under different authorisation than the general "Save changes" flow.

## Key elements

- **`roleIsAdmin`** (ref) – The boolean bound to the `<v-select>`. Seeded from `profile.admin` and re-seeded by a `watch` on `profile` (immediate) whenever the record changes underneath.
- **`roleOptions`** (computed) – The two translated select options (`generic.administrator`, `generic.standard-user`).
- **`roleIsDirty`** (computed) – `true` when the select value differs from `profile.admin`; gates the submit button.
- **`handleRoleChange`** – Applies the chosen role via `useProfileStore().updateOwnRole`. Promotes unconditionally; **demotions** prompt a confirmation dialog first (the one direction the user cannot self-undo). On refusal or API failure the select is restored to the record's value.
- **`<template v-if="isAdmin">`** – The entire widget is hidden for non-admins; the self-gating lives here rather than in the embedding page.

## Relationships

- **`@/modules/account/stores/profile.ts`** – Provides `useProfileStore()`; supplies the reactive `profile` ref and the `updateOwnRole` mutation.
- **`@/infrastructure/session.ts`** – Provides `useSessionStore()`; reads `isAdmin` to gate rendering.
- **`@/infrastructure/utils/errors.ts`** – `notifyErrorMessages` surfaces API errors as toasts.
- **`@/ui/dialog.ts`** – `useDialogStore().confirm` drives the self-demotion confirmation.
- **`@guebbit/vue-toolkit`** – `useNotificationsStore().addMessage` for success/error toasts.

## Notes

- The component uses **both** a plain `export default { name: 'ProfileRole' }` and a `<script setup>` block — the former exists solely to give the component a stable name in DevTools / `<KeepAlive>` lookups.
- The `watch` on `profile` has **no** dirty-guard: with a two-option select there are no in-progress keystrokes to clobber, so a simple re-seed is safe.
- `handleRoleChange` is a no-op (resolves immediately) when `roleIsDirty` is false, so the button's `:disabled="!roleIsDirty"` is a UX convenience, not the only guard.
- The widget is designed to be dropped into any admin profile view; the `v-if="isAdmin"` guard means the embedding page does not need to special-case role visibility.
