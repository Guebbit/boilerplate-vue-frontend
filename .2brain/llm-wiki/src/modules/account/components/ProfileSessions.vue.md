---
source: src/modules/account/components/ProfileSessions.vue
sha256: e6753be19d1d69dfd1e46a61f92da8824c04380891d75c0d1ebcd1b37049051d
generated_at: 2026-10-17T00:16:37.409918+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/ProfileSessions.vue

## Purpose

A profile-page panel that lists the visitor's live device sessions and lets them revoke any single session or end all of them at once. It exists as a standalone SFC so the profile view stays a thin layout shell and the session UI (list, per-row revoke, logout-everywhere) is self-contained with its own loading and error handling.

## Key elements

- **`handleRevoke(sessionId, current)`** – Revokes one session via the sessions store. If `current` is true, navigates to the `Logout` route after success (the API treats that revoke as a logout). On failure, reports into the shared blocking-error slot.
- **`handleLogoutEverywhere()`** – Shows a confirm dialog, then calls `logoutEverywhere` from the auth store and navigates to `Home` on success.
- **`revokingId` (ref)** – Per-row loading state bound to each revoke button's `:loading`, chosen over the store's page-wide flag so unrelated fetches don't spin every button.
- **`useBlockingError()`** – Single shared instance for both write actions (revoke + logout-everywhere); its `message` feeds the `InlineErrorAlert` rendered above the list.
- **`onMounted(fetchSessions)`** – Loads the session list on mount (ambient, no blocking UI).
- **Scoped style block** – Raises `--v-medium-emphasis-opacity` to `1` on the three subtitle lines (started, last-used, expiry) so Vuetify's default 0.6 opacity doesn't drop contrast below WCAG AA 4.5:1.

## Relationships

- **`src/modules/account/stores/sessions.ts`** – Consumes `fetchSessions`, `revokeSession`, and the reactive `sessions` array; this component is the sole UI for those store actions.
- **`src/modules/account/stores/auth.ts`** – Consumes `logoutEverywhere` for the "end all sessions" button.
- **`src/modules/account/views/Profile.vue`** – Parent view that mounts this component as one of the profile tabs/panels.
- **`src/modules/account/tests/profile-sessions-last-used.spec.ts`** – Unit/integration test targeting the `session-last-used` subtitle and related rendering logic in this file.

## Notes

- The component `name` is declared in a separate non-setup `<script>` block because `<script setup>` cannot set a component name itself; this matters for `<KeepAlive>` and devtools.
- Neither revoke nor logout-everywhere has a dedicated per-button error slot, so both funnel into one `InlineErrorAlert` above the list. The list's initial load failure is handled separately (ambient), keeping the two concerns split.
- The contrast override targets the Vuetify CSS custom property rather than hard-coding `opacity`, so a theme-level emphasis change still applies if the token itself is raised elsewhere.
