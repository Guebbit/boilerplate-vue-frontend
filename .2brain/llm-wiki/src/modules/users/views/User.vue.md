---
source: src/modules/users/views/User.vue
sha256: d697414ae0cb289b72219a6dfe31050eba8986f6fc881140ca794a9768b715e8
generated_at: 2026-10-17T01:49:25.354384+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/views/User.vue

## Purpose

Read-only user detail page that loads a single user by route `id`, renders their profile fields (username, email, role, status, timestamps), and offers a lightweight "Manage access" dialog for changing role/active status without navigating to the full edit form. All mutable controls are gated by the server-provided `actions` object on the user record.

## Key elements

- **Component name `UserTargetPage`** — declared in a separate `<script>` block to satisfy `<KeepAlive>` / devtools naming.
- **`heroTitle` / `heroDescription` / `userRole` / `userStatus`** — computed properties that drive the hero section and stat cards, falling back to the route `id` or i18n defaults while loading.
- **`auditLogTo` (computed)** — resolves the audit-log route via `linkIfRouted`; returns `undefined` when the `admin` module is absent, hiding the History button.
- **`watchUser(() => id, { onError: onMissingRecord })`** — re-fetches the user whenever the route param changes; 404/403 are handled by `useMissingRecord` (redirects to an error page).
- **`handleManageAccess()`** — orchestrates the full access-change flow: opens `UserAccessDialog`, awaits the confirmed result, then calls `updateUser` from the Pinia store and toasts success/failure via `useNotificationsStore`.
- **`useBlockingError`** — local inline error state for the access-change button (shown via `InlineErrorAlert`).
- **`useUserAccessDialog`** — provides `isOpen`, `target`, `options`, `request`, `confirm`, `cancel` for the dialog lifecycle.

## Relationships

- **`src/modules/users/store.ts`** — `useUsersStore` supplies `watchUser`, `updateUser`, and `currentUser`; this view is the primary consumer for single-user reads and the access PATCH.
- **`src/modules/users/composables/use-user-access-dialog.ts`** — encapsulates dialog open/close state, picker options, and the promise-based `request()` that `handleManageAccess` awaits.
- **`src/modules/users/components/UserAccessDialog.vue`** — rendered in the template (truncated portion); receives `target`/`options` from the composable and emits the confirmed patch payload.
- **`src/modules/users/tests/user-target-view.spec.ts`** — unit tests for this component's rendering and interaction logic.
- **`src/modules/users/tests/user-view.spec.ts`** — additional view-level tests covering this page.

## Notes

- **Two-script-block pattern:** the component `name` must live in a plain `<script>` because `<script setup>` cannot set it; this is required for `<KeepAlive>` caching and devtools.
- **Permission model is two-tiered:** the History button is hidden unless *both* the route exists in the build (`linkIfRouted` returns non-undefined) *and* the session grants `read:AuditLog`. The edit/access buttons rely solely on the row-level `actions` object — the backend is the authority on what this caller may do to this account.
- **No password or 2FA controls** appear here by design: credentials are owner-only, so a staff-facing detail view deliberately omits them.
- **`role` is rendered as raw data** (not a fixed admin/standard pair) because deployments can define arbitrary roles; only the rules engine interprets permissions.
- **`MODULE_EDGES` coupling:** the audit-log route is *not* a declared edge of the `users` module, so the link is guarded at runtime rather than imported statically.
