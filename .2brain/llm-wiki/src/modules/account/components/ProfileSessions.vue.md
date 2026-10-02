---
source: src/modules/account/components/ProfileSessions.vue
sha256: adce0d28a1e34684069e788d18fd052c3a277fb8524f43afb49718e6d69acd51
generated_at: 2026-10-02T12:12:13.830485+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/ProfileSessions.vue

## Purpose

Device-sessions panel on the profile page. Renders every live refresh token as a row, lets the visitor revoke a single session, and offers a "log out everywhere" action. Revoking the *current* session is treated by the API as a logout, so the component navigates home afterwards.

## Key elements

- **`handleRevoke(sessionId, current)`** — revokes one session via the sessions store. On success, toasts and (if it was the current session) pushes to the `Logout` route. On failure, reports into the shared blocking-error state.
- **`handleLogoutEverywhere()`** — opens a Vuetify confirmation dialog (`useDialogStore`), then calls `logoutEverywhere()` from the auth store. Navigates to `Home` on success; reports errors into the same blocking-error state.
- **`revokingId` (ref)** — per-row loading flag. Deliberately local rather than the store's page-wide `loading`, so unrelated fetches don't put every revoke button into its spinner/label-dimmed state.
- **`sessionsActionError` / `reportSessionsActionError` / `clearSessionsActionError`** — one `useBlockingError()` instance shared by both revoke and logout-everywhere, rendered as a single `InlineErrorAlert` above the list.
- **`fetchSessions` / `revokeSession`** — actions from `useAccountSessionsStore`; `fetchSessions` runs on mount (ambient load, not gated by the blocking error).
- **`logoutEverywhere`** — action from `useAuthStore` that ends all sessions across devices.
- **Scoped style override** — raises `--v-medium-emphasis-opacity` to `1` on `.session-last-used` and `.session-expiry` so Vuetify's 0.6 subtitle opacity stays above the 4.5:1 WCAG AA contrast threshold (verified by `account/tests/e2e/a11y.cy.ts`).

## Relationships

- **`useAccountSessionsStore`** (`@/modules/account/stores/sessions.ts`) — provides `sessions` (reactive list), `fetchSessions`, and `revokeSession`.
- **`useAuthStore`** (`@/modules/account/stores/auth.ts`) — provides `logoutEverywhere`.
- **`useBlockingError`** (`@/infrastructure/utils/use-blocking-error.ts`) — shared error-state composable for the two write actions.
- **`formatDateTime`** (`@/infrastructure/utils/formatters.ts`) — renders `lastUsedAt` and `expiration` timestamps in the list.
- **`routerLinkI18n`** (`@/i18n/router-link.ts`) — builds i18n-aware route targets for the post-revoke / post-logout navigations.
- **`useDialogStore`** (`@/ui/dialog.ts`) — confirmation dialog before "log out everywhere".
- **`InlineErrorAlert`** (`@/ui/molecules/InlineErrorAlert.vue`) — renders the shared blocking-error message.
- **`src/infrastructure/utils/logger.ts`** — reached indirectly through the auth/sessions stores and the notification store; no direct import in this file.

## Notes

- The blocking-error composable is intentionally **shared** between revoke-one and logout-everywhere because neither action has its own dedicated alert slot; the list itself keeps rendering regardless of which action failed. The pattern mirrors `ProductsList.vue` in the products module.
- `revokingId` is a **local** ref, not the store's `loading`, to avoid the Vuetify `:loading` side-effect (dimmed label below contrast threshold) on rows the user never touched.
- The accessibility CSS override targets the **design token** (`--v-medium-emphasis-opacity`) rather than hard-coding `opacity`, so Vuetify's emphasis system remains the single source of truth. The rule is scoped to this component's two subtitle classes.
- Success on "log out everywhere" navigates away immediately; there is no success toast because the visitor is no longer on the page.
