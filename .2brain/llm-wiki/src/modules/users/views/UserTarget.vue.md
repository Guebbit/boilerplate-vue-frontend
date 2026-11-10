---
source: src/modules/users/views/UserTarget.vue
sha256: a3b158333ba45a6eb43b39718d9c7e8f14f336e0e1a5320ed2595525b72949d9
signature: a3b158333ba45a6eb43b39718d9c7e8f14f336e0e1a5320ed2595525b72949d9
generated_at: 2026-11-10T06:11:15.730852+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/views/UserTarget.vue

## Purpose
Read-only user detail page. Loads a single user by route `id`, renders identity fields, role, status, and purchase-hold state, and exposes two quick-action controls (manage access, pause/lift checkout) so staff can adjust permissions without opening the full edit form.

## Key elements
- **`handleManageAccess`** – Opens `UserAccessDialog`; on confirm, calls `applyAccessChange` from the users store and reports success/failure via toast or inline blocking error.
- **`handleSetHold(hold)`** – Receives the end-date + note from `UserPurchaseHoldDialog`, calls `setPurchaseHold`, closes the dialog.
- **`handleLiftHold`** – Wrapped in `singleFlight`. Lifts an active hold *or*, when no hold is in force, acts as "mark as reviewed" (clears the flag, restarts cancellation count). Toast message differs per case.
- **`holdSummary` / `reviewSummary`** – Computed display strings (or `undefined`) rendered under the hold section; read from `currentUser.purchaseHold` and `purchaseHoldFlaggedAt`.
- **`asideFields`** – Computed `DetailFieldRow[]` for the aside card (created-at, updated-at with icons).
- **`auditLogTo`** – Computed; uses `linkIfRouted` to produce a router link to the AuditLog view scoped to this user, or `undefined` if the `admin` module is absent from the build.
- **`watchUser(() => id, { onError: onMissingRecord })`** – (Re)fetches the user whenever the route id changes; a 404/403 navigates to the Error page via `useMissingRecord`.
- **`useUserAccessDialog`** destructure – Provides `isOpen`, `target`, `options`, `request`, `confirm`, `cancel` bound to the dialog in the template.
- **`useUserSummary`** – Derives `heroTitle`, `heroDescription`, `userRole`, `userStatus` for the hero and stat cards.

## Relationships
- **`src/modules/users/store.ts` (`useUsersStore`)** – Primary data source: `currentUser`, `watchUser`, `applyAccessChange`, `setPurchaseHold`, `liftPurchaseHold`.
- **`src/modules/users/components/UserAccessDialog.vue`** – Rendered in-template; driven by the `useUserAccessDialog` composable state; its confirmed result is passed to `applyAccessChange`.
- **`src/modules/users/components/UserPurchaseHoldDialog.vue`** – Rendered in-template; its emit payload is consumed by `handleSetHold`.
- **`src/modules/users/composables/use-user-access-dialog.ts`** – Encapsulates dialog open/target/options/request/confirm/cancel lifecycle.
- **`src/modules/users/composables/use-user-summary.ts`** – Computes hero text, role label, and status label from the current user and route id.
- **`src/modules/users/tests/user-target-view.spec.ts`** – Unit/component tests for this view.
- **`src/modules/users/tests/user-view.spec.ts`** – Broader users-view test suite that includes this page.

## Notes
- A separate `<script>` block exists solely to set `name: 'UserTargetPage'` for Vue devtools and `<KeepAlive>`; `<script setup>` cannot declare a name.
- Permission gating is **per-row** (`user.actions` from the server), not a global admin flag. A 403 means the button should not be rendered at all.
- The audit-log link is a soft dependency: `linkIfRouted` returns `undefined` in builds without the `admin` module, hiding the button without a hard import.
- Credentials (password, second factor) are deliberately absent from this view — they are owner-only operations.
- `handleLiftHold` is idempotent-safe via `singleFlight` (duplicate clicks are no-ops) but the business meaning shifts depending on whether a hold is currently in force.
