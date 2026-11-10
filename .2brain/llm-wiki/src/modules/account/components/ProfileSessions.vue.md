---
source: src/modules/account/components/ProfileSessions.vue
sha256: 3dc7c47fa3955d3a80510605410d79bee3a5d1c10c6b4bb99f30a6a5a7f1f45a
signature: 3dc7c47fa3955d3a80510605410d79bee3a5d1c10c6b4bb99f30a6a5a7f1f45a
generated_at: 2026-11-10T03:21:38.507155+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/ProfileSessions.vue

## Purpose
Device-sessions panel that lists all live sign-ins, allows revoking a single session or logging out everywhere, and navigates away when the current session is terminated. It exists as a self-contained card component rendered inside the account Profile view.

## Key elements
- **`handleRevoke(sessionId, current)`** — Revokes one session via `revokeSession`. Toasts success; if it was the current session, pushes the router to the `Logout` route. On failure, reports into the shared `useBlockingError` instance.
- **`handleLogoutEverywhere()`** — Wraps a `useDialogStore().confirm(...)` prompt (colour `error`) around `logoutEverywhere()` from the auth store. Navigates to `Home` on success; reports to the shared blocking error on failure. Wrapped in `singleFlight` to prevent double-fires.
- **`revokingId` (ref)** — Per-row loading flag bound to each revoke button's `:loading`. Deliberately local rather than the store's page-wide loading flag, so unrelated fetches don't spin every button.
- **`useBlockingError()` (shared instance)** — One alert (`InlineErrorAlert`) sits above the list and is the failure target for *both* revoke and logout-everywhere, since neither action has a dedicated error surface of its own.
- **`actionSize`** — From `useTouchFriendlySize()`; gives the revoke button a 44 px touch target below the `sm` breakpoint.
- **`onMounted(fetchSessions)`** — Loads the session list once on mount; this load is ambient (no blocking error, no shared spinner).
- **`<script>` name block** — Declares `name: 'ProfileSessions'` so `<KeepAlive>` and devtools can identify the component (required because `<script setup>` cannot set `name`).

## Relationships
- **`src/modules/account/stores/sessions.ts`** — Source of `fetchSessions`, `revokeSession`, and the reactive `sessions` array (via `storeToRefs`).
- **`src/modules/account/stores/auth.ts`** — Source of `logoutEverywhere()`.
- **`src/modules/account/views/Profile.vue`** — Parent view that renders this component as a card within the profile page.
- **`src/modules/account/tests/confirm-once.spec.ts`** — Tests the single-fire confirmation behaviour of the logout-everywhere dialog (the `singleFlight` wrapper).
- **`src/modules/account/tests/profile-sessions-last-used.spec.ts`** — Tests the `lastUsedAt` subtitle rendering per session row.

## Notes
- Revoking the **current** session is treated by the API as a logout; the component compensates by routing to the `Logout` route rather than leaving the user on a signed-out profile shell.
- `logoutEverywhere` success does **not** toast (the page is gone after navigation); only failure surfaces an alert.
- The `v-list` uses `:lines="false"` to lift Vuetify's default one-line clamp on subtitles, since the dates are the primary content of each row.
- The blocking-error alert is intentionally shared between the two write actions; the read action (`fetchSessions`) is excluded from it. This mirrors the same pattern in `ProductsList.vue` (see `docs/theory/request-flow.md`).
