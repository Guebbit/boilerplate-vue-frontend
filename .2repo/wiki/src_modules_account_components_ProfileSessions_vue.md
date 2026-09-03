# src/modules/account/components/ProfileSessions.vue

## Purpose

Vue component rendering the "Active sessions" card on the profile page. It lists every live refresh token as a row, lets the user revoke an individual session, and exposes a "Logout everywhere" button. Revoking the *current* session is treated by the API as a full logout, so the component navigates to the Logout route afterwards.

## Key elements

- **`handleRevoke(sessionId, current)`** — Revokes one session via `useAccountSessionsStore().revokeSession`. Shows a success toast; if `current` is true, pushes the i18n-named `Logout` route. Errors are surfaced through `notifyErrorMessages`.
- **`handleLogoutEverywhere()`** — Opens a `useDialogStore()` confirmation (error-colored), then calls `useAuthStore().logoutEverywhere()` and navigates to the `Home` route.
- **`revokingId` (ref\<string\>)** — Per-row "revoking" flag bound to each revoke button's `:loading`. Deliberately local rather than the store's page-wide loading flag, so unrelated fetches don't spinner every button.
- **Template** — `v-card > v-list` with one `v-list-item` per session (id, optional expiry, "Current" chip, revoke button) plus a block "Logout everywhere" `v-btn`.
- **Scoped style `.session-expiry`** — Overrides `--v-medium-emphasis-opacity` to 1 so the expiry subtitle meets WCAG AA contrast on the card surface.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — Transitive dependency reached through the stores/utilities imported here (auth store, sessions store, error helpers). No direct import in this file.

## Notes

- The store-level loading flag is intentionally *not* used for button state; see the comment on `revokingId` for the rationale (avoiding phantom spinners on untouched rows).
- The `.session-expiry` opacity override is scoped and token-based (not a hard-coded `opacity`) so Vuetify retains semantic control over emphasis elsewhere. It exists because `account/tests/e2e/a11y.cy.ts` flags the default 0.6 opacity as a contrast failure.
- `onMounted(fetchSessions)` is the only data-fetch trigger; the component has no manual refresh button.
