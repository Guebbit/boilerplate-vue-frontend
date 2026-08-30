# src/modules/account/components/ProfileSessions.vue

## Purpose

A Vuetify card component for the account profile page that lists all active refresh-token sessions, lets the user revoke any single session, and provides a "log out everywhere" action. It exists to give users a self-service surface for managing their device sessions and responding to credential leaks.

## Key elements

- **`handleRevoke(sessionId, current)`** — Revokes one session via `useAccountSessionsStore().revokeSession`. If the revoked session is the current one, navigates to the `Logout` route (the API treats that revoke as a logout). Toasts success or routes the error through `notifyErrorMessages`.
- **`handleLogoutEverywhere()`** — Shows a destructive confirmation dialog (`useDialogStore().confirm`), then calls `useAuthStore().logoutEverywhere()` and navigates to `Home`.
- **`revokingId` (ref)** — Per-row loading indicator for the revoke button. Intentionally local rather than using the store's page-wide `loading` flag, to avoid putting every revoke button into a spinner state.
- **`onMounted(fetchSessions)`** — Triggers the initial session list fetch on mount.
- **Template** — Renders a `v-list` of sessions (id, "current" chip, optional expiration via `formatDateTime`), a per-row revoke button, and a block "log out everywhere" button. All text is i18n'd via `vue-i18n`.
- **Scoped style `.session-expiry`** — Overrides `--v-medium-emphasis-opacity` to `1` to keep the expiration subtitle above the WCAG AA 4.5 : 1 contrast threshold required by the e2e a11y suite.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — Graph neighbor (likely transitive through the notification/error utilities this component imports, e.g. `notifyErrorMessages` or the notifications store). No direct `import` of `logger.ts` is present in this file.

## Notes

- Revoking the **current** session is a legitimate logout path; the component navigates away rather than leaving a signed-out shell. The `current` boolean is passed explicitly to `handleRevoke` so the navigation decision is at the call site.
- The per-row `revokingId` ref is a deliberate workaround: the store's shared `loading` flag goes high on *any* account request on the profile page, which previously caused all revoke buttons to show spinners simultaneously.
- The contrast fix targets the Vuetify **token** (`--v-medium-emphasis-opacity`) rather than overriding `opacity` directly, so Vuetify's emphasis semantics remain the single source of truth. The rule is scoped to avoid leaking the change to other subtitles.
- All user-facing strings go through `t()`; the `data-test` attributes on every interactive element are consumed by the e2e and a11y test suites (`account/tests/e2e/`).
